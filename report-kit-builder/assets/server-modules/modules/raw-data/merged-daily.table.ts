import {
  date,
  doublePrecision,
  integer,
  pgSchema,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

// ★★项目特定参数：下行为妙搭应用数据库 schema 名（全库唯一硬编码），新项目必改为自己的——获取方式：lark-cli apps +db-list（或线上建表后从表名前缀读）。改完 grep workspace_ 确认无残留。
const workspaceSchema = pgSchema('workspace_XXXXXXXXXXXX');

export const mergedDaily = workspaceSchema.table('merged_daily', {
  id: uuid('id').primaryKey(),
  date: date('date', { mode: 'string' }),
  dateEnd: date('date_end', { mode: 'string' }),
  coolStart: doublePrecision('cool_start'),
  elecStart: doublePrecision('elec_start'),
  coolEnd: doublePrecision('cool_end'),
  elecEnd: doublePrecision('elec_end'),
  coolUsage: doublePrecision('cool_usage'),
  elecUsage: doublePrecision('elec_usage'),
  cop: doublePrecision('cop'),
  days: integer('days'),
  src: varchar('src'),
});

export const mfgMergedDaily = workspaceSchema.table('mfg_merged_daily', {
  id: uuid('id').primaryKey(),
  date: date('date', { mode: 'string' }),
  dateEnd: date('date_end', { mode: 'string' }),
  coolStart: doublePrecision('cool_start'),
  elecStart: doublePrecision('elec_start'),
  coolEnd: doublePrecision('cool_end'),
  elecEnd: doublePrecision('elec_end'),
  coolUsage: doublePrecision('cool_usage'),
  elecUsage: doublePrecision('elec_usage'),
  cop: doublePrecision('cop'),
  days: integer('days'),
  src: varchar('src'),
});

export const mfgRawReading = workspaceSchema.table('mfg_raw_reading', {
  id: uuid('id').primaryKey(),
  tag: varchar('tag', { length: 16 }),
  ts: timestamp('ts', { mode: 'string' }),
  val: doublePrecision('val'),
  quality: integer('quality'),
});

export interface MergedDailyRecord {
  date: string | null;
  dateEnd: string | null;
  coolStart: number | null;
  elecStart: number | null;
  coolEnd: number | null;
  elecEnd: number | null;
  coolUsage: number | null;
  elecUsage: number | null;
  cop: number | null;
  days: number | null;
}
