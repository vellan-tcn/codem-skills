import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { and, asc, gte, inArray, like, lt, sql } from 'drizzle-orm';
import { monthlyCop, sensorData } from '@server/database/schema';
import {
  mergedDaily,
  mfgMergedDaily,
} from '@server/modules/raw-data/merged-daily.table';
import type {
  CopOverviewResponse,
  CopSummary,
  MonthlyCopItem,
} from '@shared/api.interface';

const COOL_VAR_EXACT = '冷冻累计冷量';
const ELEC_VAR_EXACT = '总累计用电量';
const COOL_VAR_PATTERN = '%累计冷量%';
const ELEC_VAR_PATTERN = '%累计用电%';
const SHANGHAI_TZ = 'Asia/Shanghai';

/** 单个累计量变量在某月内的首末值 */
interface MonthAccumulator {
  first: number;
  last: number;
}

@Injectable()
export class CopOverviewService {
  private readonly logger = new Logger(CopOverviewService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async getOverview(
    year: number,
    workshop: string = 'pei',
    excludeKinds: string = '',
  ): Promise<CopOverviewResponse> {
    if (workshop === 'mfg') {
      const monthlyMfg: MonthlyCopItem[] = await this.getMonthlyFromMfg(year, excludeKinds);
      const yearsMfg: number[] = await this.getMfgYears();
      if (monthlyMfg.length > 0) {
        return {
          monthly: monthlyMfg,
          summary: this.buildSummary(monthlyMfg),
          availableYears: yearsMfg,
          source: 'mfg_merged_daily',
        };
      }
      return {
        monthly: [],
        summary: { yearCoolKwh: 0, yearElecKwh: 0, yearAvgCop: 0 },
        availableYears: yearsMfg,
        source: 'none',
      };
    }
    const availableYears: number[] = await this.getAvailableYears();

    // 配料：始终从 merged_daily 日合并表聚合（与查询页同口径）；无数据年份回退旧表
    const monthlyMerged: MonthlyCopItem[] =
      await this.getMonthlyFromMergedDaily(year, excludeKinds);
    if (monthlyMerged.length > 0) {
      return {
        monthly: monthlyMerged,
        summary: this.buildSummary(monthlyMerged),
        availableYears,
        source: 'merged_daily',
      };
    }

    const monthlyFromTable: MonthlyCopItem[] = await this.getMonthlyFromTable(
      year,
    );
    if (monthlyFromTable.length > 0) {
      return {
        monthly: monthlyFromTable,
        summary: this.buildSummary(monthlyFromTable),
        availableYears,
        source: 'monthly_cop',
      };
    }

    const monthlyFromSensor: MonthlyCopItem[] = await this
      .getMonthlyFromSensorData(year);
    if (monthlyFromSensor.length > 0) {
      this.logger.log(
        `year ${year} 使用 sensor_data 增量计算月度 COP，共 ${monthlyFromSensor.length} 个月`,
      );
      return {
        monthly: monthlyFromSensor,
        summary: this.buildSummary(monthlyFromSensor),
        availableYears,
        source: 'sensor_data',
      };
    }

    return {
      monthly: [],
      summary: { yearCoolKwh: 0, yearElecKwh: 0, yearAvgCop: 0 },
      availableYears,
      source: 'none',
    };
  }

  private async getMfgYears(): Promise<number[]> {
    const rows: { year: string | null }[] = await this.db
      .select({ year: sql<string | null>`to_char(${mfgMergedDaily.date}, 'YYYY')` })
      .from(mfgMergedDaily)
      .groupBy(sql`to_char(${mfgMergedDaily.date}, 'YYYY')`);
    return rows
      .map((r: { year: string | null }) => Number(r.year))
      .filter((y: number) => Number.isFinite(y))
      .sort((a: number, b: number) => b - a);
  }

  private async getMonthlyFromMfg(
    year: number,
    excludeKinds: string = '',
  ): Promise<MonthlyCopItem[]> {
    const kinds: Set<string> = new Set(
      excludeKinds
        .split(',')
        .map((s: string) => s.trim())
        .filter((s: string) => s !== ''),
    );
    const abnormalParts: (ReturnType<typeof sql>)[] = [];
    if (kinds.has('stopped')) {
      abnormalParts.push(sql`${mfgMergedDaily.coolUsage} = 0`);
    }
    if (kinds.has('trial')) {
      abnormalParts.push(
        sql`${mfgMergedDaily.days} = 1 and ${mfgMergedDaily.coolUsage} > 0 and ${mfgMergedDaily.coolUsage} <= 3000`,
      );
    }
    const abnormalCond: ReturnType<typeof sql> | undefined =
      abnormalParts.length === 0
        ? undefined
        : abnormalParts.length === 1
          ? sql`not (${abnormalParts[0]})`
          : sql`not (${abnormalParts[0]} or ${abnormalParts[1]})`;
    const start: string = `${year}-01-01`;
    const end: string = `${year + 1}-01-01`;
    const rows: { month: string; cool: number | null; elec: number | null }[] =
      await this.db
        .select({
          month: sql<string>`to_char(${mfgMergedDaily.date}, 'YYYY-MM')`,
          cool: sql<number | null>`sum(${mfgMergedDaily.coolUsage})`,
          elec: sql<number | null>`sum(${mfgMergedDaily.elecUsage})`,
        })
        .from(mfgMergedDaily)
        .where(
          and(
            gte(mfgMergedDaily.date, start),
            lt(mfgMergedDaily.date, end),
            abnormalCond,
          ),
        )
        .groupBy(sql`to_char(${mfgMergedDaily.date}, 'YYYY-MM')`)
        .orderBy(sql`to_char(${mfgMergedDaily.date}, 'YYYY-MM')`);
    return rows
      .filter(
        (r: { month: string; cool: number | null; elec: number | null }) =>
          r.cool !== null && r.elec !== null && r.elec !== 0,
      )
      .map(
        (r: { month: string; cool: number | null; elec: number | null }) => ({
          month: r.month,
          coolKwh: r.cool as number,
          elecKwh: r.elec as number,
          cop: (r.cool as number) / (r.elec as number),
        }),
      );
  }

  /** 配料：从 merged_daily 聚合月度（支持剔除停机/试机） */
  private async getMonthlyFromMergedDaily(
    year: number,
    excludeKinds: string,
  ): Promise<MonthlyCopItem[]> {
    const kinds: Set<string> = new Set(
      excludeKinds
        .split(',')
        .map((s: string) => s.trim())
        .filter((s: string) => s !== ''),
    );
    const abnormalParts: (ReturnType<typeof sql>)[] = [];
    if (kinds.has('stopped')) {
      abnormalParts.push(
        sql`${mergedDaily.days} = 1 and ${mergedDaily.coolUsage} < 100`,
      );
    }
    if (kinds.has('trial')) {
      abnormalParts.push(
        sql`${mergedDaily.date} in ('2026-03-24','2026-03-25','2026-03-26','2026-03-28','2026-04-01')`,
      );
    }
    const abnormalCond: ReturnType<typeof sql> | undefined =
      abnormalParts.length === 0
        ? undefined
        : abnormalParts.length === 1
          ? sql`not (${abnormalParts[0]})`
          : sql`not (${abnormalParts[0]} or ${abnormalParts[1]})`;
    const start: string = `${year}-01-01`;
    const end: string = `${year + 1}-01-01`;
    const rows: { month: string; cool: number | null; elec: number | null }[] =
      await this.db
        .select({
          month: sql<string>`to_char(${mergedDaily.date}, 'YYYY-MM')`,
          cool: sql<number | null>`sum(${mergedDaily.coolUsage})`,
          elec: sql<number | null>`sum(${mergedDaily.elecUsage})`,
        })
        .from(mergedDaily)
        .where(
          and(
            gte(mergedDaily.date, start),
            lt(mergedDaily.date, end),
            abnormalCond,
          ),
        )
        .groupBy(sql`to_char(${mergedDaily.date}, 'YYYY-MM')`)
        .orderBy(sql`to_char(${mergedDaily.date}, 'YYYY-MM')`);
    return rows
      .filter(
        (r: { month: string; cool: number | null; elec: number | null }) =>
          r.cool !== null && r.elec !== null && r.elec !== 0,
      )
      .map(
        (r: { month: string; cool: number | null; elec: number | null }) => ({
          month: r.month,
          coolKwh: r.cool as number,
          elecKwh: r.elec as number,
          cop: (r.cool as number) / (r.elec as number),
        }),
      );
  }

  /** monthly_cop 与 sensor_data 中出现的年份并集，降序 */
  private async getAvailableYears(): Promise<number[]> {
    const [copMonthRows, sensorYearRows] = await Promise.all([
      this.db
        .select({ month: monthlyCop.month })
        .from(monthlyCop)
        .groupBy(monthlyCop.month),
      this.db
        .select({
          year: sql<number>`extract(year from ${sensorData.ts})`,
        })
        .from(sensorData)
        .groupBy(sql`extract(year from ${sensorData.ts})`),
    ]);

    const years = new Set<number>();
    for (const row of copMonthRows) {
      const y: number = Number(row.month.slice(0, 4));
      if (Number.isInteger(y)) years.add(y);
    }
    for (const row of sensorYearRows) {
      const y: number = Number(row.year);
      if (Number.isInteger(y)) years.add(y);
    }
    return [...years].sort((a: number, b: number) => b - a);
  }

  /** 分支 a：直接读 monthly_cop 表 */
  private async getMonthlyFromTable(
    year: number,
  ): Promise<MonthlyCopItem[]> {
    return this.db
      .select({
        month: monthlyCop.month,
        coolKwh: monthlyCop.coolKwh,
        elecKwh: monthlyCop.elecKwh,
        cop: monthlyCop.cop,
      })
      .from(monthlyCop)
      .where(like(monthlyCop.month, `${year}-%`))
      .orderBy(asc(monthlyCop.month));
  }

  /** 分支 b：从 sensor_data 累计量变量按月计算增量 */
  private async getMonthlyFromSensorData(
    year: number,
  ): Promise<MonthlyCopItem[]> {
    const yearStart: Date = new Date(`${year}-01-01T00:00:00+08:00`);
    const yearEnd: Date = new Date(`${year + 1}-01-01T00:00:00+08:00`);

    const [coolVar, elecVar] = await Promise.all([
      this.resolveVarname(COOL_VAR_EXACT, COOL_VAR_PATTERN, yearStart, yearEnd),
      this.resolveVarname(ELEC_VAR_EXACT, ELEC_VAR_PATTERN, yearStart, yearEnd),
    ]);
    if (!coolVar || !elecVar) return [];

    const records: {
      ts: Date;
      varname: string;
      value: number;
    }[] = await this.db
      .select({
        ts: sensorData.ts,
        varname: sensorData.varname,
        value: sensorData.value,
      })
      .from(sensorData)
      .where(
        and(
          inArray(sensorData.varname, [coolVar, elecVar]),
          gte(sensorData.ts, yearStart),
          lt(sensorData.ts, yearEnd),
        ),
      )
      .orderBy(asc(sensorData.ts));
    if (records.length === 0) return [];

    const coolByMonth = new Map<string, MonthAccumulator>();
    const elecByMonth = new Map<string, MonthAccumulator>();
    for (const record of records) {
      const monthKey: string = this.formatShanghaiMonth(record.ts);
      const target =
        record.varname === coolVar ? coolByMonth : elecByMonth;
      const acc = target.get(monthKey);
      if (acc) {
        acc.last = record.value;
      } else {
        target.set(monthKey, { first: record.value, last: record.value });
      }
    }

    const monthly: MonthlyCopItem[] = [];
    for (let month = 1; month <= 12; month += 1) {
      const key: string = `${year}-${String(month).padStart(2, '0')}`;
      const coolAcc = coolByMonth.get(key);
      const elecAcc = elecByMonth.get(key);
      if (!coolAcc || !elecAcc) continue;

      const coolInc: number = coolAcc.last - coolAcc.first;
      const elecInc: number = elecAcc.last - elecAcc.first;
      if (elecInc === 0) continue;

      monthly.push({
        month: key,
        coolKwh: coolInc,
        elecKwh: elecInc,
        cop: coolInc / elecInc,
      });
    }
    return monthly;
  }

  /** 精确匹配变量名；查不到时用 LIKE 兜底取排序后的第一个候选 */
  private async resolveVarname(
    exact: string,
    pattern: string,
    yearStart: Date,
    yearEnd: Date,
  ): Promise<string | null> {
    const candidates: { varname: string }[] = await this.db
      .selectDistinct({ varname: sensorData.varname })
      .from(sensorData)
      .where(
        and(
          like(sensorData.varname, pattern),
          gte(sensorData.ts, yearStart),
          lt(sensorData.ts, yearEnd),
        ),
      )
      .orderBy(asc(sensorData.varname));
    if (candidates.length === 0) return null;
    const exactMatch = candidates.find((c) => c.varname === exact);
    return exactMatch ? exactMatch.varname : candidates[0].varname;
  }

  private buildSummary(monthly: MonthlyCopItem[]): CopSummary {
    let yearCoolKwh = 0;
    let yearElecKwh = 0;
    for (const item of monthly) {
      yearCoolKwh += item.coolKwh;
      yearElecKwh += item.elecKwh;
    }
    return {
      yearCoolKwh,
      yearElecKwh,
      yearAvgCop: yearElecKwh === 0 ? 0 : yearCoolKwh / yearElecKwh,
    };
  }

  /** timestamptz -> 业务时区(Asia/Shanghai)下的 YYYY-MM */
  private formatShanghaiMonth(ts: Date): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: SHANGHAI_TZ,
      year: 'numeric',
      month: '2-digit',
    }).format(ts);
  }
}
