import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, asc, gte, inArray, lt, lte, sql, type SQL } from 'drizzle-orm';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { rawReading } from '@server/database/schema';
import {
  mergedDaily,
  mfgMergedDaily,
  mfgRawReading,
  type MergedDailyRecord,
} from './merged-daily.table';
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

const RAW_BATCH = 5000;
/** raw 分块拉取的最大批次数（400×5000=200 万行，覆盖全年 30 秒级数据） */
const RAW_MAX_BATCHES = 400;
const MAX_BUCKETS = 120000;
const COOL_TAG = 'v893';
const ELEC_TAG = 'v919';
const FIXED_TAGS: string[] = [COOL_TAG, ELEC_TAG];
const MFG_TAGS: string[] = ['cool', 'elec'];
type RawTable = typeof rawReading | typeof mfgRawReading;
type MergedTable = typeof mergedDaily | typeof mfgMergedDaily;

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

interface ReadingTs {
  minTs: string;
  maxTs: string;
}

type DayTsMap = Map<string, ReadingTs>;

interface CacheEntry {
  exp: number;
  val: unknown;
}

interface ReadingTsRecord {
  tag: string;
  day: string;
  minTs: string;
  maxTs: string;
}

function sumNullable(values: Array<number | null>): number | null {
  let sum: number | null = null;
  for (const v of values) {
    if (v === null) continue;
    sum = (sum ?? 0) + v;
  }
  return sum;
}

@Injectable()
export class RawDataService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  private readonly cache: Map<string, CacheEntry> = new Map();

  /** 简单内存缓存：车间来回切换时秒出，TTL 过期后自动重查 */
  private cached<T>(
    key: string,
    ttlMs: number,
    fn: () => Promise<T>,
  ): Promise<T> {
    const hit: CacheEntry | undefined = this.cache.get(key);
    if (hit !== undefined && hit.exp > Date.now()) {
      return Promise.resolve(hit.val as T);
    }
    return fn().then(
      (v: T): T => {
        this.cache.set(key, { exp: Date.now() + ttlMs, val: v });
        return v;
      },
    );
  }

  private mergedTable(workshop: string): MergedTable {
    return workshop === 'mfg' ? mfgMergedDaily : mergedDaily;
  }

  private rawTable(workshop: string): RawTable {
    return workshop === 'mfg' ? mfgRawReading : rawReading;
  }

  private tagsFor(workshop: string): string[] {
    return workshop === 'mfg' ? MFG_TAGS : FIXED_TAGS;
  }

  async years(workshop: string = 'pei'): Promise<RawYearsResponse> {
    const cacheKey: string = `years:${workshop}`;
    return this.cached(cacheKey, 600_000, async (): Promise<RawYearsResponse> => {
    const t: MergedTable = this.mergedTable(workshop);
    const rows: { year: string | null }[] = await this.db
      .selectDistinct({
        year: sql<string | null>`to_char(${t.date}, 'YYYY')`,
      })
      .from(t)
      .orderBy(asc(sql`to_char(${t.date}, 'YYYY')`));
    return {
      years: rows
        .map((r: { year: string | null }) => Number(r.year))
        .filter((y: number) => Number.isFinite(y)),
    };
    });
  }

  async latest(workshop: string = 'pei'): Promise<RawLatestResponse> {
    const cacheKey: string = `latest:${workshop}`;
    return this.cached(cacheKey, 60_000, async (): Promise<RawLatestResponse> => {
    const t: RawTable = this.rawTable(workshop);
    const rows: { latest: string | null }[] = await this.db
      .select({ latest: sql<string | null>`max(${t.ts})::text` })
      .from(t);
    return { latest: rows.length > 0 ? rows[0].latest : null };
    });
  }

  async readings(
    workshop: string = 'pei',
    year: number,
    month: number | null,
    excludeKinds: string = '',
  ): Promise<MonthlyReportResponse> {
    const cacheKey: string = `readings:${workshop}:${year}:${month ?? 'all'}:${excludeKinds}`;
    return this.cached(cacheKey, 180_000, async (): Promise<MonthlyReportResponse> => {
    const t: MergedTable = this.mergedTable(workshop);
    const isMonth: boolean = month !== null;
    const start: string = isMonth
      ? `${year}-${String(month).padStart(2, '0')}-01`
      : `${year}-01-01`;
    const end: string = isMonth
      ? `${month === 12 ? year + 1 : year}-${String((month % 12) + 1).padStart(2, '0')}-01`
      : `${year + 1}-01-01`;
    const periods: MergedDailyRecord[] = await this.db
      .select({
        date: t.date,
        dateEnd: t.dateEnd,
        coolStart: t.coolStart,
        elecStart: t.elecStart,
        coolEnd: t.coolEnd,
        elecEnd: t.elecEnd,
        coolUsage: t.coolUsage,
        elecUsage: t.elecUsage,
        cop: t.cop,
        days: t.days,
      })
      .from(t)
      .where(
        and(
          gte(t.date, start),
          lt(t.date, end),
        ),
      )
      .orderBy(asc(t.date));

    const [coolTsByDay, elecTsByDay] = await this.readingTsByDay(workshop, start, end);

    const kinds: Set<string> = new Set(
      excludeKinds
        .split(',')
        .map((s: string) => s.trim())
        .filter((s: string) => s !== ''),
    );
    const activePeriods: MergedDailyRecord[] =
      kinds.size > 0
        ? periods.filter((p: MergedDailyRecord) => {
            const kind: string | null = RawDataService.abnormalKind(
              p,
              workshop,
            );
            return kind === null || !kinds.has(kind);
          })
        : periods;
    const summary: MonthlySummary = this.sumUsage(activePeriods);
    if (isMonth) {
      const rows: MonthlyPeriodRow[] = periods.map(
        (p: MergedDailyRecord, i: number) =>
          this.periodRow(
            p,
            workshop,
            coolTsByDay,
            elecTsByDay,
            periods[i + 1] ?? null,
          ),
      );
      return { mode: 'month', rows, summary };
    }
    const byMonth: Map<string, MergedDailyRecord[]> = new Map();
    const activeByMonth: Map<string, MergedDailyRecord[]> = new Map();
    for (const p of periods) {
      if (p.date === null) continue;
      const key: string = p.date.slice(0, 7);
      const list: MergedDailyRecord[] = byMonth.get(key) ?? [];
      list.push(p);
      byMonth.set(key, list);
    }
    for (const p of activePeriods) {
      if (p.date === null) continue;
      const key: string = p.date.slice(0, 7);
      const list: MergedDailyRecord[] = activeByMonth.get(key) ?? [];
      list.push(p);
      activeByMonth.set(key, list);
    }
    const rows: MonthlyPeriodRow[] = [...byMonth.entries()]
      .sort(
        (a: [string, MergedDailyRecord[]], b: [string, MergedDailyRecord[]]) =>
          a[0] < b[0] ? -1 : 1,
      )
      .map(
        ([key, list]: [string, MergedDailyRecord[]]) =>
          this.monthRow(
            key,
            list,
            activeByMonth.get(key) ?? [],
            coolTsByDay,
            elecTsByDay,
          ),
      );
    return { mode: 'full-year', rows, summary };
    });
  }

  private async readingTsByDay(
    workshop: string = 'pei',
    start: string,
    end: string,
  ): Promise<[DayTsMap, DayTsMap]> {
    const t: RawTable = this.rawTable(workshop);
    const coolTag: string = this.tagsFor(workshop)[0];
    const rows: ReadingTsRecord[] = await this.db
      .select({
        tag: t.tag,
        day: sql<string>`to_char(${t.ts}::date, 'YYYY-MM-DD')`,
        minTs: sql<string>`to_char(min(${t.ts}), 'YYYY-MM-DD HH24:MI:SS')`,
        maxTs: sql<string>`to_char(max(${t.ts}), 'YYYY-MM-DD HH24:MI:SS')`,
      })
      .from(t)
      .where(
        and(
          inArray(t.tag, this.tagsFor(workshop)),
          gte(t.ts, `${start} 00:00:00`),
          lt(t.ts, `${end} 00:00:00`),
        ),
      )
      .groupBy(t.tag, sql`${t.ts}::date`);
    const coolMap: DayTsMap = new Map();
    const elecMap: DayTsMap = new Map();
    for (const r of rows) {
      const target: DayTsMap = r.tag === coolTag ? coolMap : elecMap;
      target.set(r.day, { minTs: r.minTs, maxTs: r.maxTs });
    }
    return [coolMap, elecMap];
  }

  private tsFor(
    map: DayTsMap,
    day: string | null,
    kind: 'min' | 'max',
  ): string | null {
    if (day === null) return null;
    const entry: ReadingTs | undefined = map.get(day);
    if (entry === undefined) {
      // 跨度行起始日无明细：起始示数实际取自前一日末条读数 → 回退最近有明细的前一天
      const d: Date = new Date(`${day}T00:00:00Z`);
      if (Number.isNaN(d.getTime())) return null;
      for (let i = 0; i < 7; i++) {
        d.setUTCDate(d.getUTCDate() - 1);
        const prev: ReadingTs | undefined = map.get(d.toISOString().slice(0, 10));
        if (prev !== undefined) return prev.maxTs;
      }
      return null;
    }
    return kind === 'min' ? entry.minTs : entry.maxTs;
  }

  private dayBefore(day: string | null): string | null {
    if (day === null) return null;
    const d: Date = new Date(`${day}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return null;
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  /** 行起始读数的真实时刻：跨天行=当日首条（minTs）；当天行（锚点法重建）=前日末条（maxTs） */
  private startTsFor(map: DayTsMap, p: MergedDailyRecord): string | null {
    const selfDay: boolean = p.dateEnd !== null && p.dateEnd === p.date;
    return selfDay
      ? this.tsFor(map, this.dayBefore(p.date), 'max')
      : this.tsFor(map, p.date, 'min');
  }

  private rowCop(
    coolUsage: number | null,
    elecUsage: number | null,
    fallback: number | null,
  ): number | null {
    if (coolUsage !== null && elecUsage !== null && elecUsage !== 0) {
      return coolUsage / elecUsage;
    }
    return fallback;
  }

  /** 配料试机天（2026-03-24~04-02 窗口内实际试机的 5 天，见界面细节保留清单） */
  static readonly PEI_TRIAL_DAYS: Set<string> = new Set([
    '2026-03-24',
    '2026-03-25',
    '2026-03-26',
    '2026-03-28',
    '2026-04-01',
  ]);

  /** 异常周期分类（按车间）：stopped=停机/冷机未开，trial=试机/切机，null=正常 */
  static abnormalKind(
    p: MergedDailyRecord,
    workshop: string = 'pei',
  ): 'stopped' | 'trial' | null {
    if (p.coolUsage === null) return null;
    const days: number = p.days ?? 1;
    if (workshop === 'mfg') {
      if (p.coolUsage === 0) return 'stopped';
      return days === 1 && p.coolUsage > 0 && p.coolUsage <= 3000
        ? 'trial'
        : null;
    }
    // 配料：单日冷量<100（含停机/冷机未开）→stopped；试机窗口 5 天→trial
    if (days === 1 && p.coolUsage < 100) return 'stopped';
    if (
      p.date !== null &&
      RawDataService.PEI_TRIAL_DAYS.has(p.date)
    ) {
      return 'trial';
    }
    return null;
  }

  private sumUsage(periods: MergedDailyRecord[]): MonthlySummary {
    const coolUsage: number | null = sumNullable(
      periods.map((p: MergedDailyRecord) => p.coolUsage),
    );
    const elecUsage: number | null = sumNullable(
      periods.map((p: MergedDailyRecord) => p.elecUsage),
    );
    const totalDays: number = periods.reduce(
      (acc: number, p: MergedDailyRecord) => acc + (p.days ?? 1),
      0,
    );
    return {
      coolUsage,
      elecUsage,
      cop: this.rowCop(coolUsage, elecUsage, null),
      totalDays,
    };
  }

  private periodRow(
    p: MergedDailyRecord,
    workshop: string,
    coolTs: DayTsMap,
    elecTs: DayTsMap,
    next: MergedDailyRecord | null,
  ): MonthlyPeriodRow {
    const dateStr: string = p.date ?? '-';
    const days: number = p.days ?? 1;
    const label: string =
      days > 1 && p.dateEnd !== null
        ? `${dateStr}~${p.dateEnd}（${days}天）`
        : dateStr;
    const endDay: string | null = p.dateEnd ?? p.date;
      // 链式时间戳：end=次行起始读数的真实时刻（行 n 末=行 n+1 首，无缝咬合）；末行按自身结构兜底
      const selfDay: boolean = p.dateEnd !== null && p.dateEnd === p.date;
    return {
      label,
      coolStart: p.coolStart,
      coolStartTs: this.startTsFor(coolTs, p),
      coolEnd: p.coolEnd,
      coolEndTs:
        next !== null
          ? this.startTsFor(coolTs, next)
          : this.tsFor(coolTs, endDay, selfDay ? 'max' : 'min'),
      coolUsage: p.coolUsage,
      elecStart: p.elecStart,
      elecStartTs: this.startTsFor(elecTs, p),
      elecEnd: p.elecEnd,
      elecEndTs:
        next !== null
          ? this.startTsFor(elecTs, next)
          : this.tsFor(elecTs, endDay, selfDay ? 'max' : 'min'),
      elecUsage: p.elecUsage,
      cop: this.rowCop(p.coolUsage, p.elecUsage, p.cop),
      kind: RawDataService.abnormalKind(p, workshop),
    };
  }

  private monthRow(
    key: string,
    list: MergedDailyRecord[],
    activeList: MergedDailyRecord[],
    coolTs: DayTsMap,
    elecTs: DayTsMap,
  ): MonthlyPeriodRow {
    const first: MergedDailyRecord = list[0];
    const last: MergedDailyRecord = list[list.length - 1];
    const usageSource: MergedDailyRecord[] =
      activeList.length > 0 ? activeList : list;
    const coolUsage: number | null = sumNullable(
      usageSource.map((p: MergedDailyRecord) => p.coolUsage),
    );
    const elecUsage: number | null = sumNullable(
      usageSource.map((p: MergedDailyRecord) => p.elecUsage),
    );
    const endDay: string | null = last.dateEnd ?? last.date;
      const firstSelf: boolean =
        first.dateEnd !== null && first.dateEnd === first.date;
      const lastSelf: boolean =
        last.dateEnd !== null && last.dateEnd === last.date;
    return {
      label: key,
      kind: null,
      coolStart: first.coolStart,
      coolStartTs: firstSelf
        ? this.tsFor(coolTs, this.dayBefore(first.date), 'max')
        : this.tsFor(coolTs, first.date, 'min'),
      coolEnd: last.coolEnd,
      coolEndTs: this.tsFor(coolTs, endDay, lastSelf ? 'max' : 'min'),
      coolUsage,
      elecStart: first.elecStart,
      elecStartTs: firstSelf
        ? this.tsFor(elecTs, this.dayBefore(first.date), 'max')
        : this.tsFor(elecTs, first.date, 'min'),
      elecEnd: last.elecEnd,
      elecEndTs: this.tsFor(elecTs, endDay, lastSelf ? 'max' : 'min'),
      elecUsage,
      cop: this.rowCop(coolUsage, elecUsage, null),
    };
  }

  async query(
    workshop: string = 'pei',
    start: string,
    end: string,
    granularity: RawGranularityParam,
    step: number | null,
    unit: RawStepUnit | null,
  ): Promise<RawDataQueryResponse> {
    const cacheKey: string = `query:${workshop}:${start}:${end}:${granularity}:${step ?? ''}:${unit ?? ''}`;
    return this.cached(cacheKey, 60_000, async (): Promise<RawDataQueryResponse> => {
    if (granularity === 'raw') {
      return this.queryRaw(workshop, start, end);
    }
    this.assertBucketCount(start, end, granularity, step, unit);
    return this.querySampled(
        workshop,
      start,
      end,
      granularity,
      this.buildBucketExpr(this.rawTable(workshop), granularity, step, unit),
    );
    });
  }

  private buildBucketExpr(
    t: RawTable,
    granularity: RawGranularityParam,
    step: number | null,
    unit: RawStepUnit | null,
  ): SQL {
    if (granularity === 'custom') {
      // step 已在 controller 校验为正整数，用 sql.raw 内联（不绑参数），
      // 保证 select 与 groupBy 中表达式文本一致，PG 才认可 GROUP BY
      const n: string = String(step ?? 1);
      if (unit === 'minute') {
        return sql`date_trunc('day', ${t.ts}) + floor((extract(hour from ${t.ts}) * 60 + extract(minute from ${t.ts})) / ${sql.raw(n)}) * ${sql.raw(n)} * interval '1 minute'`;
      }
      if (unit === 'hour') {
        return sql`date_trunc('day', ${t.ts}) + floor(extract(hour from ${t.ts}) / ${sql.raw(n)}) * ${sql.raw(n)} * interval '1 hour'`;
      }
      return sql`date '1970-01-01' + (floor((${t.ts}::date - date '1970-01-01') / ${sql.raw(n)}) * ${sql.raw(n)})::int`;
    }
    if (granularity === '5min') {
      return sql`date_trunc('hour', ${t.ts}) + floor(extract(minute from ${t.ts}) / 5) * 5 * interval '1 minute'`;
    }
    if (granularity === 'hour') {
      return sql`date_trunc('hour', ${t.ts})`;
    }
    if (granularity === 'day') {
      return sql`date_trunc('day', ${t.ts})`;
    }
    return sql`date_trunc('month', ${t.ts})`;
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
    workshop: string = 'pei',
    start: string,
    end: string,
  ): Promise<RawDataQueryResponse> {
    const t: RawTable = this.rawTable(workshop);
    // 分块循环拉全量：游标推进 + (tag,ts) 去重，避免单次 limit 截断（如整月 30 秒级数据 ~5.7 万行）
    const tags: string[] = this.tagsFor(workshop);
    const records: RawRecord[] = [];
    const seen: Set<string> = new Set();
    let cursor: string = start;
    for (let i = 0; i < RAW_MAX_BATCHES; i++) {
      const batch: RawRecord[] = await this.db
        .select({ tag: t.tag, ts: t.ts, val: t.val })
        .from(t)
        .where(and(inArray(t.tag, tags), gte(t.ts, cursor), lte(t.ts, end)))
        .orderBy(asc(t.ts))
        .limit(RAW_BATCH);
      if (batch.length === 0) break;
      for (const r of batch) {
        const key: string = r.tag + '|' + r.ts;
        if (!seen.has(key)) {
          seen.add(key);
          records.push(r);
        }
      }
      const lastTs: string = batch[batch.length - 1].ts;
      if (batch.length < RAW_BATCH || lastTs <= cursor) break;
      cursor = lastTs;
    }
    const truncated: boolean = records.length >= RAW_MAX_BATCHES * RAW_BATCH;
    for (const r of records) {
      r.ts = r.ts.replace(/\.0+$/u, '');
    }
    return {
      granularity: 'raw',
      points: this.mergeByTs(records, tags[0], tags[1]),
      truncated,
    };
  }

  /**
   * 按分钟桶对齐冷量/电量两路示数再合并：
   * 两数据源（WinCC/有人云）时间戳存在秒级错位，按精确时间戳合并会留下单边空值（前端显示横杠）。
   * 分钟桶内同 tag 取时间靠后的最后一条真实读数；分钟内两 tag 时间戳差异通常 <=30s。
   */
  private mergeByTs(
    records: RawRecord[],
    coolTag: string,
    elecTag: string,
  ): RawDataPoint[] {
    interface Slot {
      ts: string;
      cool: number | null;
      elec: number | null;
    }
    const byMinute: Map<string, Slot> = new Map();
    for (const r of records) {
      const minuteKey: string = r.ts.slice(0, 16);
      let slot: Slot | undefined = byMinute.get(minuteKey);
      if (slot === undefined) {
        slot = { ts: r.ts, cool: null, elec: null };
        byMinute.set(minuteKey, slot);
      }
      if (r.tag === coolTag) slot.cool = r.val;
      else if (r.tag === elecTag) slot.elec = r.val;
      slot.ts = r.ts;
    }
    return [...byMinute.values()].sort((a: RawDataPoint, b: RawDataPoint) =>
      a.ts < b.ts ? -1 : 1,
    );
  }

  private async querySampled(
    workshop: string = 'pei',
    start: string,
    end: string,
    granularity: RawGranularityParam,
    bucketExpr: SQL,
  ): Promise<RawDataQueryResponse> {
    const t: RawTable = this.rawTable(workshop);
    // 桶键与展示时间戳同源（同一 bucketExpr），保证两 tag 同桶必合并，
    // 避免各 tag 桶内最后时间戳跨分钟边界导致错位显示横杠
    const fmt: string =
      granularity === '5min' || granularity === 'hour' || granularity === 'custom'
        ? 'YYYY-MM-DD HH24:MI'
        : 'YYYY-MM-DD';
    // fmt 为内部常量（两种固定值），用 sql.raw 内联进 SQL 文本，
    // 避免 drizzle 在 select/groupBy 分别绑定参数（$1≠$6）导致 PG 判定表达式不等价
    const bucketKey: SQL<string> = sql<string>`to_char(${bucketExpr}, ${sql.raw(`'${fmt}'`)})`;
      const rows: { tag: string; bucket: string; lastVal: number | null }[] = await this.db
        .select({
        tag: t.tag,
            bucket: bucketKey,
        lastVal: sql<number | null>`(array_agg(${t.val} ORDER BY ${t.ts} DESC))[1]`,
      })
      .from(t)
      .where(
        and(
          inArray(t.tag, this.tagsFor(workshop)),
          gte(t.ts, start),
          lte(t.ts, end),
        ),
      )
      .groupBy(t.tag, bucketKey);

    const [coolTag, elecTag] = this.tagsFor(workshop);
    const byBucket: Map<string, RawDataPoint> = new Map();
    for (const r of rows) {
      let point: RawDataPoint | undefined = byBucket.get(r.bucket);
      if (point === undefined) {
        point = { ts: r.bucket, cool: null, elec: null };
        byBucket.set(r.bucket, point);
      }
      if (r.tag === coolTag) point.cool = r.lastVal;
      else if (r.tag === elecTag) point.elec = r.lastVal;
    }
    return {
      granularity,
      points: [...byBucket.values()].sort((a: RawDataPoint, b: RawDataPoint) =>
        a.ts < b.ts ? -1 : 1,
      ),
      truncated: false,
    };
  }
}
