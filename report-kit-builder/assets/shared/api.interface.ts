/* 前后端共享的类型写在这里 */

// ---------- 历史数据查询（sensor_data） ----------

export interface SensorPoint {
  /** 数据时间，ISO 8601 字符串 */
  ts: string;
  value: number;
}

export interface SensorSeries {
  varname: string;
  /** 按时间升序；数据缺失时段不补点 */
  points: SensorPoint[];
}

export interface SensorQueryResponse {
  series: SensorSeries[];
}

// ---------- COP 总览（monthly_cop / 计算兜底） ----------

export interface MonthlyCopItem {
  /** 月份，格式 YYYY-MM */
  month: string;
  /** 当月冷量（kWh） */
  coolKwh: number;
  /** 当月电量（kWh） */
  elecKwh: number;
  /** 当月 COP = coolKwh / elecKwh */
  cop: number;
}

export interface CopSummary {
  /** 全年累计冷量（kWh） */
  yearCoolKwh: number;
  /** 全年累计用电量（kWh） */
  yearElecKwh: number;
  /** 年平均 COP = yearCoolKwh / yearElecKwh，无数据时为 0 */
  yearAvgCop: number;
}

export type CopDataSource =
  | 'monthly_cop'
  | 'sensor_data'
  | 'merged_daily'
  | 'mfg_merged_daily'
  | 'raw_reading'
  | 'none';

export interface CopOverviewResponse {
  monthly: MonthlyCopItem[];
  summary: CopSummary;
  /** 数据中出现的年份，降序 */
  availableYears: number[];
  source: CopDataSource;
}

// ---------- 原始数据查询（raw_reading，固定 v893 冷量 / v919 电量） ----------

// 报表查询：时间范围 + 展示频率的原始示数查询（非原始粒度取窗口内最后一条原始示数，不做聚合）

export type RawGranularity = 'raw' | '5min' | 'hour' | 'day' | 'month';

// 查询入参粒度：预制粒度或 custom（配合 step + unit 组成任意间隔）
export type RawGranularityParam = RawGranularity | 'custom';

// 自定义粒度的单位：分钟 / 小时 / 天（月仅由预制粒度提供）
export type RawStepUnit = 'minute' | 'hour' | 'day';

export interface RawDataPoint {
  ts: string;
  /** 冷量示数值（v893） */
  cool: number | null;
  /** 电量示数值（v919） */
  elec: number | null;
}

export interface RawDataQueryResponse {
  granularity: RawGranularityParam;
  points: RawDataPoint[];
  /** 原始粒度结果超过 5000 行被截断 */
  truncated: boolean;
}

// 月度报表：按年/月取时段首末示数（结束示数 = 次期首条，保证跨期连续；无次期的末期整行剔除）


export interface RawYearsResponse {
  /** 数据实际覆盖的年份，升序 */
  years: number[];
}

export interface MonthlyPeriodRow {
  /** 全年视图为 YYYY-MM（按月合计）；选月视图为 YYYY-MM-DD（days=1）或 YYYY-MM-DD~YYYY-MM-DD（N天）跨度格式 */
  label: string;
  coolStart: number | null;
  /** 起始冷量示数对应原始读数的时间戳（YYYY-MM-DD HH:mm:ss），无读数为 null */
  coolStartTs: string | null;
  coolEnd: number | null;
  /** 结束冷量示数对应原始读数的时间戳，无读数为 null */
  coolEndTs: string | null;
  coolUsage: number | null;
  elecStart: number | null;
  /** 起始电量示数对应原始读数的时间戳，无读数为 null */
  elecStartTs: string | null;
  elecEnd: number | null;
  /** 结束电量示数对应原始读数的时间戳，无读数为 null */
  elecEndTs: string | null;
  elecUsage: number | null;
  /** 冷量用量÷电量用量（3位小数），电量为0或缺失为 null */
  cop: number | null;
  /** 异常类别标注：stopped=停机/冷机未开，trial=试机/切机，null=正常（全年按月行恒为 null） */
  kind?: 'stopped' | 'trial' | null;
}

export interface MonthlySummary {
  coolUsage: number | null;
  elecUsage: number | null;
  cop: number | null;
  /** 全部周期覆盖的实际天数（各周期 days 求和） */
  totalDays: number;
}

export type CheckGranularity =
  | 'minute'
  | 'hour'
  | 'day'
  | 'month'
  | 'year';

export interface DataCheckRow {
  period: string;
  meterCool: number | null;
  excelCool: number | null;
  meterElec: number | null;
  excelElec: number | null;
  meterCop: number | null;
  excelCop: number | null;
}

export interface DataCheckQueryResponse {
  granularity: CheckGranularity;
  rows: DataCheckRow[];
}

/** 原始数据最新归档时间 */
export interface RawLatestResponse {
  latest: string | null;
}

export interface RawVariableItem {
  tag: string;
  nameCn: string | null;
  grp: string | null;
}

export interface MonthlyReportResponse {
  /** full-year：按月合计；month：逐周期明细 */
  mode: 'full-year' | 'month';
  rows: MonthlyPeriodRow[];
  summary: MonthlySummary;
}
