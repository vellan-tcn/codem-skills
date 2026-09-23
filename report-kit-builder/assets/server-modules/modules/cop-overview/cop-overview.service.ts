import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { and, asc, gte, inArray, lt, sql } from 'drizzle-orm';
import { rawReading } from '@server/database/schema';
import type {
  CopOverviewResponse,
  CopSummary,
  MonthlyCopItem,
} from '@shared/api.interface';

/** 宜兴中央冷站：raw_reading 固定 tag（v893 冷量 / v919 电量，累计示数） */
const COOL_TAG = 'v893';
const ELEC_TAG = 'v919';
const TAGS: string[] = [COOL_TAG, ELEC_TAG];

interface MonthAccRow {
  month: string;
  tag: string;
  firstVal: number | null;
  lastVal: number | null;
}

@Injectable()
export class CopOverviewService {
  private readonly logger = new Logger(CopOverviewService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async getOverview(year: number): Promise<CopOverviewResponse> {
    const [availableYears, monthly]: [number[], MonthlyCopItem[]] =
      await Promise.all([this.getYears(), this.getMonthly(year)]);
    return {
      monthly,
      summary: this.buildSummary(monthly),
      availableYears,
      source: monthly.length > 0 ? 'raw_reading' : 'none',
    };
  }

  /** raw_reading 中出现的年份，降序 */
  private async getYears(): Promise<number[]> {
    const rows: { year: string | null }[] = await this.db
      .select({ year: sql<string | null>`to_char(${rawReading.ts}, 'YYYY')` })
      .from(rawReading)
      .groupBy(sql`to_char(${rawReading.ts}, 'YYYY')`);
    return rows
      .map((r: { year: string | null }) => Number(r.year))
      .filter((y: number) => Number.isFinite(y))
      .sort((a: number, b: number) => b - a);
  }

  /** 按月取各 tag 首末累计示数，增量即当月用量 */
  private async getMonthly(year: number): Promise<MonthlyCopItem[]> {
    const start: string = `${year}-01-01 00:00:00`;
    const end: string = `${year + 1}-01-01 00:00:00`;
    const rows: MonthAccRow[] = await this.db
      .select({
        month: sql<string>`to_char(${rawReading.ts}, 'YYYY-MM')`,
        tag: rawReading.tag,
        firstVal: sql<
          number | null
        >`(array_agg(${rawReading.val} order by ${rawReading.ts} asc))[1]`,
        lastVal: sql<
          number | null
        >`(array_agg(${rawReading.val} order by ${rawReading.ts} desc))[1]`,
      })
      .from(rawReading)
      .where(
        and(
          inArray(rawReading.tag, TAGS),
          gte(rawReading.ts, start),
          lt(rawReading.ts, end),
        ),
      )
      .groupBy(sql`to_char(${rawReading.ts}, 'YYYY-MM')`, rawReading.tag)
      .orderBy(asc(sql`to_char(${rawReading.ts}, 'YYYY-MM')`));

    const byMonth = new Map<string, { coolInc: number; elecInc: number }>();
    for (const r of rows) {
      if (r.firstVal === null || r.lastVal === null) continue;
      const inc: number = r.lastVal - r.firstVal;
      const acc =
        byMonth.get(r.month) ?? { coolInc: 0, elecInc: 0 };
      if (r.tag === COOL_TAG) {
        acc.coolInc = inc;
      } else if (r.tag === ELEC_TAG) {
        acc.elecInc = inc;
      }
      byMonth.set(r.month, acc);
    }

    const monthly: MonthlyCopItem[] = [];
    for (const [month, acc] of [...byMonth.entries()].sort((a, b) =>
      a[0] < b[0] ? -1 : 1,
    )) {
      if (acc.elecInc === 0) {
        this.logger.warn(`month ${month} 电量增量为 0，跳过`);
        continue;
      }
      monthly.push({
        month,
        coolKwh: acc.coolInc,
        elecKwh: acc.elecInc,
        cop: acc.coolInc / acc.elecInc,
      });
    }
    return monthly;
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
}
