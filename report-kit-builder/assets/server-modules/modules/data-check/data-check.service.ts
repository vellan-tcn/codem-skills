import { Inject, Injectable } from '@nestjs/common';
import { and, asc, gte, lte } from 'drizzle-orm';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { excelDaily, meterReading } from '@server/database/schema';
import type {
  CheckGranularity,
  DataCheckQueryResponse,
  DataCheckRow,
} from '@shared/api.interface';

const MINUTE_LIMIT = 5000;
const READING_LIMIT = 200000;

interface Reading {
  ts: string;
  cumCool: number | null;
  cumElec: number | null;
}

interface WindowAcc {
  firstCool: number | null;
  lastCool: number | null;
  firstElec: number | null;
  lastElec: number | null;
  count: number;
}

interface ExcelAcc {
  cool: number;
  elec: number;
  hasCool: boolean;
  hasElec: boolean;
}

@Injectable()
export class DataCheckService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async query(
    granularity: CheckGranularity,
    start: string,
    end: string,
  ): Promise<DataCheckQueryResponse> {
    if (granularity === 'minute') {
      return this.queryMinute(start, end);
    }
    return this.queryAggregate(granularity, start, end);
  }

  private bucketKey(ts: string, granularity: CheckGranularity): string {
    if (granularity === 'hour') return ts.slice(0, 13);
    if (granularity === 'day') return ts.slice(0, 10);
    if (granularity === 'month') return ts.slice(0, 7);
    return ts.slice(0, 4);
  }

  private periodLabel(key: string, granularity: CheckGranularity): string {
    if (granularity === 'hour') return `${key}:00`;
    return key;
  }

  private async queryMinute(
    start: string,
    end: string,
  ): Promise<DataCheckQueryResponse> {
    const rows = await this.fetchReadings(start, end, MINUTE_LIMIT);
    const result: DataCheckRow[] = rows.map((r: Reading) => ({
      period: r.ts.slice(0, 16),
      meterCool: r.cumCool,
      meterElec: r.cumElec,
      meterCop: null,
      excelCool: null,
      excelElec: null,
      excelCop: null,
    }));
    return { granularity: 'minute', rows: result };
  }

  private async queryAggregate(
    granularity: CheckGranularity,
    start: string,
    end: string,
  ): Promise<DataCheckQueryResponse> {
    const readings: Reading[] = await this.fetchReadings(
      start,
      end,
      READING_LIMIT,
    );
    const windows: Map<string, WindowAcc> = new Map();
    for (const r of readings) {
      const key: string = this.bucketKey(r.ts, granularity);
      const acc: WindowAcc = windows.get(key) ?? {
        firstCool: null,
        lastCool: null,
        firstElec: null,
        lastElec: null,
        count: 0,
      };
      if (r.cumCool !== null) {
        if (acc.firstCool === null) acc.firstCool = r.cumCool;
        acc.lastCool = r.cumCool;
      }
      if (r.cumElec !== null) {
        if (acc.firstElec === null) acc.firstElec = r.cumElec;
        acc.lastElec = r.cumElec;
      }
      acc.count += 1;
      windows.set(key, acc);
    }

    const excelMap: Map<string, ExcelAcc | DataCheckRow> =
      await this.fetchExcel(granularity, start, end);

    const keys: Set<string> = new Set(windows.keys());
    excelMap.forEach((_v: ExcelAcc | DataCheckRow, k: string) => keys.add(k));
    const sorted: string[] = [...keys].sort();

    const rows: DataCheckRow[] = sorted.map((key: string) => {
      const acc: WindowAcc | undefined = windows.get(key);
      const meterCool: number | null =
        acc !== undefined && acc.count >= 2 && acc.firstCool !== null && acc.lastCool !== null
          ? Number((acc.lastCool - acc.firstCool).toFixed(2))
          : null;
      const meterElec: number | null =
        acc !== undefined && acc.count >= 2 && acc.firstElec !== null && acc.lastElec !== null
          ? Number((acc.lastElec - acc.firstElec).toFixed(2))
          : null;
      const meterCop: number | null =
        meterCool !== null && meterElec !== null && meterElec > 0
          ? Number((meterCool / meterElec).toFixed(2))
          : null;

      const excel: { cool: number | null; elec: number | null; cop: number | null } =
        this.resolveExcel(excelMap.get(key));

      return {
        period: this.periodLabel(key, granularity),
        meterCool,
        meterElec,
        meterCop,
        excelCool: excel.cool,
        excelElec: excel.elec,
        excelCop: excel.cop,
      };
    });

    return { granularity, rows };
  }

  private resolveExcel(
    entry: ExcelAcc | DataCheckRow | undefined,
  ): { cool: number | null; elec: number | null; cop: number | null } {
    if (entry === undefined) {
      return { cool: null, elec: null, cop: null };
    }
    if ('period' in entry) {
      return { cool: entry.excelCool, elec: entry.excelElec, cop: entry.excelCop };
    }
    const cool: number | null = entry.hasCool ? Number(entry.cool.toFixed(1)) : null;
    const elec: number | null = entry.hasElec ? Number(entry.elec.toFixed(1)) : null;
    const cop: number | null =
      cool !== null && elec !== null && elec > 0
        ? Number((cool / elec).toFixed(2))
        : null;
    return { cool, elec, cop };
  }

  private async fetchReadings(
    start: string,
    end: string,
    limit: number,
  ): Promise<Reading[]> {
    const records: { ts: string; cumCool: number | null; cumElec: number | null }[] =
      await this.db
        .select({
          ts: meterReading.ts,
          cumCool: meterReading.cumCool,
          cumElec: meterReading.cumElec,
        })
        .from(meterReading)
        .where(
          and(
            gte(meterReading.ts, `${start} 00:00:00`),
            lte(meterReading.ts, `${end} 23:59:59`),
          ),
        )
        .orderBy(asc(meterReading.ts))
        .limit(limit);
    return records;
  }

  private async fetchExcel(
    granularity: CheckGranularity,
    start: string,
    end: string,
  ): Promise<Map<string, ExcelAcc | DataCheckRow>> {
    const map: Map<string, ExcelAcc | DataCheckRow> = new Map();
    if (granularity === 'hour' || granularity === 'minute') {
      return map;
    }
    const records: { date: string; coolKwh: number | null; elecKwh: number | null; cop: number | null }[] =
      await this.db
        .select({
          date: excelDaily.date,
          coolKwh: excelDaily.coolKwh,
          elecKwh: excelDaily.elecKwh,
          cop: excelDaily.cop,
        })
        .from(excelDaily)
        .where(and(gte(excelDaily.date, start), lte(excelDaily.date, end)));

    if (granularity === 'day') {
      for (const r of records) {
        map.set(r.date, {
          period: r.date,
          meterCool: null,
          meterElec: null,
          meterCop: null,
          excelCool: r.coolKwh,
          excelElec: r.elecKwh,
          excelCop: r.cop,
        });
      }
      return map;
    }

    for (const r of records) {
      const key: string = granularity === 'month' ? r.date.slice(0, 7) : r.date.slice(0, 4);
      const acc: ExcelAcc = map.get(key) as ExcelAcc | undefined ?? {
        cool: 0,
        elec: 0,
        hasCool: false,
        hasElec: false,
      };
      if (r.coolKwh !== null) {
        acc.cool += r.coolKwh;
        acc.hasCool = true;
      }
      if (r.elecKwh !== null) {
        acc.elec += r.elecKwh;
        acc.hasElec = true;
      }
      map.set(key, acc);
    }
    return map;
  }
}
