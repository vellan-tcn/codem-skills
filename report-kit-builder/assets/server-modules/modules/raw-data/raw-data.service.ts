import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, asc, gte, inArray, lt, sql, type SQL } from 'drizzle-orm';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { rawReading } from '@server/database/schema';
import type {
  MonthlyPeriodRow,
  MonthlyReportResponse,
  MonthlySummary,
  RawDataPoint,
  RawDataQueryResponse,
  RawGranularityParam,
  RawLatestResponse,
  RawStepUnit,
  RawYearsResponse,
} from '@shared/api.interface';

const RAW_LIMIT = 5000;
const MAX_BUCKETS = 10000;
const COOL_TAG = 'v893';
const ELEC_TAG = 'v919';
const FIXED_TAGS: string[] = [COOL_TAG, ELEC_TAG];

interface RawRecord {
  tag: string;
  ts: string;
  val: number | null;
}

interface SampleRecord {
  tag: string;
  lastTs: string;
  lastVal: number | null;
}

/** 按天聚合的示数首末值（数据源 raw_reading） */
interface DayAggRow {
  tag: string;
  day: string;
  minTs: string;
  maxTs: string;
  firstVal: number | null;
  lastVal: number | null;
}

interface DayAgg {
  firstVal: number | null;
  lastVal: number | null;
  minTs: string | null;
  maxTs: string | null;
}

function sumNullable(values: Array<number | null>): number | null {
  let sum: number | null = null;
  for (const v of values) {
    if (v === null) continue;
    sum = (sum ?? 0) + v;
  }
  return sum;
}

function diffNullable(end: number | null, start: number | null): number | null {
  if (end === null || start === null) return null;
  return end - start;
}

@Injectable()
export class RawDataService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  /** raw_reading 中出现的年份（数据源为原始示数表） */
  async years(): Promise<RawYearsResponse> {
    const rows: { year: string | null }[] = await this.db
      .select({ year: sql<string | null>`to_char(${rawReading.ts}, 'YYYY')` })
      .from(rawReading)
      .groupBy(sql`to_char(${rawReading.ts}, 'YYYY')`);
    return {
      years: rows
        .map((r: { year: string | null }) => Number(r.year))
        .filter((y: number) => Number.isFinite(y))
        .sort((a: number, b: number) => a - b),
    };
  }

  async latest(): Promise<RawLatestResponse> {
    const rows: { latest: string | null }[] = await this.db
      .select({ latest: sql<string | null>`max(${rawReading.ts})::text` })
      .from(rawReading);
    return { latest: rows.length > 0 ? rows[0].latest : null };
  }

  /** 按天聚合 raw_reading 各 tag 首末示数 */
  private async dailyAggs(
    start: string,
    end: string,
  ): Promise<Map<string, { cool: DayAgg; elec: DayAgg }>> {
    const rows: DayAggRow[] = await this.db
      .select({
        tag: rawReading.tag,
        day: sql<string>`to_char(${rawReading.ts}::date, 'YYYY-MM-DD')`,
        minTs: sql<string>`to_char(min(${rawReading.ts}), 'YYYY-MM-DD HH24:MI:SS')`,
        maxTs: sql<string>`to_char(max(${rawReading.ts}), 'YYYY-MM-DD HH24:MI:SS')`,
        firstVal: sql<number | null>`(array_agg(${rawReading.val} ORDER BY ${rawReading.ts} ASC))[1]`,
        lastVal: sql<number | null>`(array_agg(${rawReading.val} ORDER BY ${rawReading.ts} DESC))[1]`,
      })
      .from(rawReading)
      .where(
        and(
          inArray(rawReading.tag, FIXED_TAGS),
          gte(rawReading.ts, `${start} 00:00:00`),
          lt(rawReading.ts, `${end} 00:00:00`),
        ),
      )
      .groupBy(rawReading.tag, sql`${rawReading.ts}::date`)
      .orderBy(asc(sql`${rawReading.ts}::date`));
    const byDay: Map<string, { cool: DayAgg; elec: DayAgg }> = new Map();
    for (const r of rows) {
      let entry:
        | { cool: DayAgg; elec: DayAgg }
        | undefined = byDay.get(r.day);
      if (entry === undefined) {
        entry = {
          cool: { firstVal: null, lastVal: null, minTs: null, maxTs: null },
          elec: { firstVal: null, lastVal: null, minTs: null, maxTs: null },
        };
        byDay.set(r.day, entry);
      }
      const agg: DayAgg = {
        firstVal: r.firstVal,
        lastVal: r.lastVal,
        minTs: r.minTs,
        maxTs: r.maxTs,
      };
      if (r.tag === COOL_TAG) entry.cool = agg;
      else if (r.tag === ELEC_TAG) entry.elec = agg;
    }
    return byDay;
  }

  /**
   * 月度报表：全年按月展示首末示数（增量=当月用量），选月按日展示。
   * 数据源为 raw_reading（原始示数表），差值周期 = 天。
   */
  async readings(
    year: number,
    month: number | null,
    excludeKinds: string = '',
  ): Promise<MonthlyReportResponse> {
    const isMonth: boolean = month !== null;
    const start: string = isMonth
      ? `${year}-${String(month).padStart(2, '0')}-01`
      : `${year}-01-01`;
    const end: string = isMonth
      ? `${month === 12 ? year + 1 : year}-${String((month % 12) + 1).padStart(2, '0')}-01`
      : `${year + 1}-01-01`;

    const byDay: Map<string, { cool: DayAgg; elec: DayAgg }> =
      await this.dailyAggs(start, end);
    const days: string[] = [...byDay.keys()].sort();

    const kinds: Set<string> = new Set(
      excludeKinds
        .split(',')
        .map((s: string) => s.trim())
        .filter((s: string) => s !== ''),
    );

    if (isMonth) {
      const rows: MonthlyPeriodRow[] = days.map((day: string) =>
        this.dayRow(byDay, day),
      );
      const activeDays: string[] =
        kinds.size > 0
          ? days.filter((day: string) => {
              const row: MonthlyPeriodRow | undefined = rows.find(
                (r: MonthlyPeriodRow) => r.label === day,
              );
              return row === undefined || row.kind === null || !kinds.has(row.kind);
            })
          : days;
      const summary: MonthlySummary = this.sumDays(byDay, activeDays);
      return { mode: 'month', rows, summary };
    }

    const byMonth: Map<string, string[]> = new Map();
    for (const day of days) {
      const key: string = day.slice(0, 7);
      const list: string[] = byMonth.get(key) ?? [];
      list.push(day);
      byMonth.set(key, list);
    }
    const rows: MonthlyPeriodRow[] = [...byMonth.entries()]
      .sort((a: [string, string[]], b: [string, string[]]) => (a[0] < b[0] ? -1 : 1))
      .map(([key, list]: [string, string[]]) => this.monthRow(byDay, key, list));
    const summary: MonthlySummary = {
      coolUsage: sumNullable(rows.map((r: MonthlyPeriodRow) => r.coolUsage)),
      elecUsage: sumNullable(rows.map((r: MonthlyPeriodRow) => r.elecUsage)),
      totalDays: days.length,
      cop: null,
    };
    summary.cop = this.rowCop(summary.coolUsage, summary.elecUsage);
    return { mode: 'full-year', rows, summary };
  }

  /** 停机判定：日冷量用量为 0 视为停机 */
  static abnormalKind(coolUsage: number | null): 'stopped' | null {
    if (coolUsage === null) return null;
    return coolUsage === 0 ? 'stopped' : null;
  }

  private rowCop(
    coolUsage: number | null,
    elecUsage: number | null,
  ): number | null {
    if (coolUsage !== null && elecUsage !== null && elecUsage !== 0) {
      return coolUsage / elecUsage;
    }
    return null;
  }

  private dayRow(
    byDay: Map<string, { cool: DayAgg; elec: DayAgg }>,
    day: string,
  ): MonthlyPeriodRow {
    const { cool, elec } = byDay.get(day) ?? {
      cool: { firstVal: null, lastVal: null, minTs: null, maxTs: null },
      elec: { firstVal: null, lastVal: null, minTs: null, maxTs: null },
    };
    const coolUsage: number | null = diffNullable(cool.lastVal, cool.firstVal);
    const elecUsage: number | null = diffNullable(elec.lastVal, elec.firstVal);
    return {
      label: day,
      kind: RawDataService.abnormalKind(coolUsage),
      coolStart: cool.firstVal,
      coolStartTs: cool.minTs,
      coolEnd: cool.lastVal,
      coolEndTs: cool.maxTs,
      coolUsage,
      elecStart: elec.firstVal,
      elecStartTs: elec.minTs,
      elecEnd: elec.lastVal,
      elecEndTs: elec.maxTs,
      elecUsage,
      cop: this.rowCop(coolUsage, elecUsage),
    };
  }

  private monthRow(
    byDay: Map<string, { cool: DayAgg; elec: DayAgg }>,
    key: string,
    days: string[],
  ): MonthlyPeriodRow {
    const first: { cool: DayAgg; elec: DayAgg } | undefined = byDay.get(days[0]);
    const last: { cool: DayAgg; elec: DayAgg } | undefined = byDay.get(
      days[days.length - 1],
    );
    const empty: DayAgg = { firstVal: null, lastVal: null, minTs: null, maxTs: null };
    const firstCool: DayAgg = first?.cool ?? empty;
    const firstElec: DayAgg = first?.elec ?? empty;
    const lastCool: DayAgg = last?.cool ?? empty;
    const lastElec: DayAgg = last?.elec ?? empty;
    const coolUsage: number | null = diffNullable(lastCool.lastVal, firstCool.firstVal);
    const elecUsage: number | null = diffNullable(lastElec.lastVal, firstElec.firstVal);
    return {
      label: key,
      kind: null,
      coolStart: firstCool.firstVal,
      coolStartTs: firstCool.minTs,
      coolEnd: lastCool.lastVal,
      coolEndTs: lastCool.maxTs,
      coolUsage,
      elecStart: firstElec.firstVal,
      elecStartTs: firstElec.minTs,
      elecEnd: lastElec.lastVal,
      elecEndTs: lastElec.maxTs,
      elecUsage,
      cop: this.rowCop(coolUsage, elecUsage),
    };
  }

  private sumDays(
    byDay: Map<string, { cool: DayAgg; elec: DayAgg }>,
    days: string[],
  ): MonthlySummary {
    let coolUsage: number | null = null;
    let elecUsage: number | null = null;
    for (const day of days) {
      const entry:
        | { cool: DayAgg; elec: DayAgg }
        | undefined = byDay.get(day);
      if (entry === undefined) continue;
      const c: number | null = diffNullable(
        entry.cool.lastVal,
        entry.cool.firstVal,
      );
      const e: number | null = diffNullable(
        entry.elec.lastVal,
        entry.elec.firstVal,
      );
      if (c !== null) coolUsage = (coolUsage ?? 0) + c;
      if (e !== null) elecUsage = (elecUsage ?? 0) + e;
    }
    return {
      coolUsage,
      elecUsage,
      cop: this.rowCop(coolUsage, elecUsage),
      totalDays: days.length,
    };
  }

  async query(
    start: string,
    end: string,
    granularity: RawGranularityParam,
    step: number | null,
    unit: RawStepUnit | null,
  ): Promise<RawDataQueryResponse> {
    if (granularity === 'raw') {
      return this.queryRaw(start, end);
    }
    this.assertBucketCount(start, end, granularity, step, unit);
    return this.querySampled(
      start,
      end,
      granularity,
      this.buildBucketExpr(granularity, step, unit),
    );
  }

  private buildBucketExpr(
    granularity: RawGranularityParam,
    step: number | null,
    unit: RawStepUnit | null,
  ): SQL {
    if (granularity === 'custom') {
      const n: number = step ?? 1;
      if (unit === 'minute') {
        return sql`date_trunc('day', ${rawReading.ts}) + floor((extract(hour from ${rawReading.ts}) * 60 + extract(minute from ${rawReading.ts})) / ${n}) * ${n} * interval '1 minute'`;
      }
      if (unit === 'hour') {
        return sql`date_trunc('day', ${rawReading.ts}) + floor(extract(hour from ${rawReading.ts}) / ${n}) * ${n} * interval '1 hour'`;
      }
      return sql`date '1970-01-01' + (floor((${rawReading.ts}::date - date '1970-01-01') / ${n}) * ${n})::int`;
    }
    if (granularity === '5min') {
      return sql`date_trunc('hour', ${rawReading.ts}) + floor(extract(minute from ${rawReading.ts}) / 5) * 5 * interval '1 minute'`;
    }
    if (granularity === 'hour') {
      return sql`date_trunc('hour', ${rawReading.ts})`;
    }
    if (granularity === 'day') {
      return sql`date_trunc('day', ${rawReading.ts})`;
    }
    return sql`date_trunc('month', ${rawReading.ts})`;
  }

  private assertBucketCount(
    start: string,
    end: string,
    granularity: RawGranularityParam,
    step: number | null,
    unit: RawStepUnit | null,
  ): void {
    const startMs: number = new Date(start.replace(' ', 'T')).getTime();
    const endMs: number = new Date(end.replace(' ', 'T')).getTime();
    const diffMs: number = endMs - startMs;
    let buckets = 0;
    if (granularity === '5min') buckets = Math.ceil(diffMs / 300000);
    else if (granularity === 'hour') buckets = Math.ceil(diffMs / 3600000);
    else if (granularity === 'day') buckets = Math.ceil(diffMs / 86400000);
    else if (granularity === 'custom') {
      const unitMs: number =
        unit === 'hour' ? 3600000 : unit === 'day' ? 86400000 : 60000;
      buckets = Math.ceil(diffMs / ((step ?? 1) * unitMs));
    } else {
      const sy: number = Number(start.slice(0, 4));
      const sm: number = Number(start.slice(5, 7));
      const ey: number = Number(end.slice(0, 4));
      const em: number = Number(end.slice(5, 7));
      buckets = (ey - sy) * 12 + (em - sm) + 1;
    }
    if (buckets > MAX_BUCKETS) {
      throw new BadRequestException(
        '当前粒度下时间跨度过大，请缩小时间范围或改用更粗的粒度',
      );
    }
  }

  private async queryRaw(
    start: string,
    end: string,
  ): Promise<RawDataQueryResponse> {
    const records: RawRecord[] = await this.db
      .select({
        tag: rawReading.tag,
        ts: rawReading.ts,
        val: rawReading.val,
      })
      .from(rawReading)
      .where(
        and(
          inArray(rawReading.tag, FIXED_TAGS),
          gte(rawReading.ts, start),
          lt(rawReading.ts, end),
        ),
      )
      .orderBy(asc(rawReading.ts))
      .limit(RAW_LIMIT + 1);
    const truncated: boolean = records.length > RAW_LIMIT;
    const kept: RawRecord[] = truncated ? records.slice(0, RAW_LIMIT) : records;
    for (const r of kept) {
      r.ts = r.ts.replace(/\.0+$/u, '');
    }
    return {
      granularity: 'raw',
      points: this.mergeByTs(kept),
      truncated,
    };
  }

  private mergeByTs(records: RawRecord[]): RawDataPoint[] {
    const byTs: Map<string, RawDataPoint> = new Map();
    for (const r of records) {
      let point: RawDataPoint | undefined = byTs.get(r.ts);
      if (point === undefined) {
        point = { ts: r.ts, cool: null, elec: null };
        byTs.set(r.ts, point);
      }
      if (r.tag === COOL_TAG) point.cool = r.val;
      else if (r.tag === ELEC_TAG) point.elec = r.val;
    }
    return [...byTs.values()].sort((a: RawDataPoint, b: RawDataPoint) =>
      a.ts < b.ts ? -1 : 1,
    );
  }

  private async querySampled(
    start: string,
    end: string,
    granularity: RawGranularityParam,
    bucketExpr: SQL,
  ): Promise<RawDataQueryResponse> {
    const rows: SampleRecord[] = await this.db
      .select({
        tag: rawReading.tag,
        lastTs: sql<string>`to_char(max(${rawReading.ts}), 'YYYY-MM-DD HH24:MI:SS')`,
        lastVal: sql<number | null>`(array_agg(${rawReading.val} ORDER BY ${rawReading.ts} DESC))[1]`,
      })
      .from(rawReading)
      .where(
        and(
          inArray(rawReading.tag, FIXED_TAGS),
          gte(rawReading.ts, start),
          lt(rawReading.ts, end),
        ),
      )
      .groupBy(rawReading.tag, sql`${bucketExpr}`);

    const records: RawRecord[] = rows.map((r: SampleRecord) => ({
      tag: r.tag,
      ts: r.lastTs.replace(/\.0+$/u, ''),
      val: r.lastVal,
    }));
    return {
      granularity,
      points: this.mergeByTs(records),
      truncated: false,
    };
  }
}
