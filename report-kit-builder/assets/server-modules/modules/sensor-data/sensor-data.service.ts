import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { and, asc, gte, inArray, lte, sql } from 'drizzle-orm';
import { sensorData } from '@server/database/schema';
import type {
  SensorPoint,
  SensorQueryResponse,
  SensorSeries,
} from '@shared/api.interface';

const MAX_QUERY_VARIABLES: number = 5;

interface VariableRow {
  varname: string;
  firstTs: string;
}

interface SensorRow {
  ts: Date;
  varname: string;
  value: number;
}

@Injectable()
export class SensorDataService {
  private readonly logger: Logger = new Logger(SensorDataService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  /** 变量列表，按各变量数据最早出现时间排序 */
  async getVariables(): Promise<{ variables: string[] }> {
    const rows: VariableRow[] = await this.db
      .select({
        varname: sensorData.varname,
        firstTs: sql<string>`min(${sensorData.ts})`,
      })
      .from(sensorData)
      .groupBy(sensorData.varname)
      .orderBy(asc(sql`min(${sensorData.ts})`));
    this.logger.log(`getVariables count=${rows.length}`);
    return { variables: rows.map((row: VariableRow) => row.varname) };
  }

  /** 按时间范围与变量查询时序数据，按请求变量顺序分组返回 */
  async query(
    start: string | undefined,
    end: string | undefined,
    varnamesParam: string | undefined,
  ): Promise<SensorQueryResponse> {
    if (!start || !end) {
      throw new BadRequestException('缺少 start 或 end 参数');
    }
    const startDate: Date = new Date(start);
    const endDate: Date = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new BadRequestException('start / end 无法解析为时间');
    }
    if (endDate.getTime() <= startDate.getTime()) {
      throw new BadRequestException('结束时间必须晚于开始时间');
    }
    if (!varnamesParam) {
      throw new BadRequestException('缺少 varnames 参数');
    }
    const varnames: string[] = varnamesParam
      .split(',')
      .map((item: string) => item.trim())
      .filter((item: string) => item.length > 0);
    if (varnames.length === 0) {
      throw new BadRequestException('变量列表不能为空');
    }
    if (varnames.length > MAX_QUERY_VARIABLES) {
      throw new BadRequestException(
        `最多同时查询 ${MAX_QUERY_VARIABLES} 个变量`,
      );
    }

    this.logger.log(
      `query start=${startDate.toISOString()} end=${endDate.toISOString()} varnames=${JSON.stringify(varnames)}`,
    );

    const rows: SensorRow[] = await this.db
      .select({
        ts: sensorData.ts,
        varname: sensorData.varname,
        value: sensorData.value,
      })
      .from(sensorData)
      .where(
        and(
          gte(sensorData.ts, startDate),
          lte(sensorData.ts, endDate),
          inArray(sensorData.varname, varnames),
        ),
      )
      .orderBy(asc(sensorData.ts));

    const pointsByVarname: Map<string, SensorPoint[]> = new Map<
      string,
      SensorPoint[]
    >();
    varnames.forEach((varname: string) => {
      pointsByVarname.set(varname, []);
    });
    rows.forEach((row: SensorRow) => {
      const bucket: SensorPoint[] | undefined = pointsByVarname.get(
        row.varname,
      );
      if (bucket) {
        bucket.push({ ts: row.ts.toISOString(), value: row.value });
      }
    });

    const series: SensorSeries[] = varnames.map((varname: string) => ({
      varname,
      points: pointsByVarname.get(varname) ?? [],
    }));
    return { series };
  }
}
