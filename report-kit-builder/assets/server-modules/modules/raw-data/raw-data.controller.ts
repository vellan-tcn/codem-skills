import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import type {
  MonthlyReportResponse,
  RawDataQueryResponse,
  RawGranularityParam,
  RawLatestResponse,
  RawStepUnit,
  RawYearsResponse,
} from '@shared/api.interface';
import { RawDataService } from './raw-data.service';

const GRANULARITIES: RawGranularityParam[] = ['raw', '5min', 'hour', 'day', 'month', 'custom'];
const CUSTOM_UNITS: RawStepUnit[] = ['minute', 'hour', 'day'];
const TS_PATTERN = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/u;

function normWorkshop(v: string | undefined): 'pei' | 'mfg' {
  return v === 'mfg' ? 'mfg' : 'pei';
}

@Controller('api/raw-data')
export class RawDataController {
  constructor(private readonly rawDataService: RawDataService) {}

  @Get('latest')
  async latest(@Query('workshop') ws: string): Promise<RawLatestResponse> {
    return this.rawDataService.latest(normWorkshop(ws));
  }

  @Get('years')
  async years(@Query('workshop') ws: string): Promise<RawYearsResponse> {
    return this.rawDataService.years(normWorkshop(ws));
  }

  @Get('readings')
  async readings(
    @Query('workshop') ws: string,
      @Query('year') yearStr: string,
    @Query('month') monthStr: string,
    @Query('exclude') excludeStr: string,
  ): Promise<MonthlyReportResponse> {
    const year: number = Number(yearStr);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new BadRequestException('year 必须是 2000~2100 的整数');
    }
    let month: number | null = null;
    if (monthStr !== undefined && monthStr !== '') {
      month = Number(monthStr);
      if (!Number.isInteger(month) || month < 1 || month > 12) {
        throw new BadRequestException('month 必须是 1~12 的整数');
      }
    }
    return this.rawDataService.readings(
        normWorkshop(ws),
        year,
        month,
        excludeStr ?? '',
      );
  }

  @Get('query')
  async query(
    @Query('workshop') ws: string,
      @Query('start') start: string,
    @Query('end') end: string,
    @Query('granularity') granularity: string,
    @Query('step') stepStr: string,
    @Query('unit') unit: string,
  ): Promise<RawDataQueryResponse> {
    if (!GRANULARITIES.includes(granularity as RawGranularityParam)) {
      throw new BadRequestException(
        'granularity 必须是 raw/5min/hour/day/month/custom',
      );
    }
    let step: number | null = null;
    let stepUnit: RawStepUnit | null = null;
    if (granularity === 'custom') {
      const parsedStep: number = Number(stepStr);
      if (!Number.isInteger(parsedStep) || parsedStep < 1) {
        throw new BadRequestException('自定义粒度 step 必须是正整数（至少 1）');
      }
      if (!CUSTOM_UNITS.includes(unit as RawStepUnit)) {
        throw new BadRequestException('自定义粒度 unit 必须是 minute/hour/day');
      }
      step = parsedStep;
      stepUnit = unit as RawStepUnit;
    }
    if (!TS_PATTERN.test(start ?? '') || !TS_PATTERN.test(end ?? '')) {
      throw new BadRequestException('start/end 必须是 YYYY-MM-DDTHH:mm:ss 格式');
    }
    const startTs: string = start.replace(' ', 'T');
    const endTs: string = end.replace(' ', 'T');
    if (startTs >= endTs) {
      throw new BadRequestException('起始时间必须早于结束时间');
    }
    return this.rawDataService.query(
        normWorkshop(ws),
      `${startTs.slice(0, 10)} ${startTs.slice(11)}`,
      `${endTs.slice(0, 10)} ${endTs.slice(11)}`,
      granularity as RawGranularityParam,
      step,
      stepUnit,
    );
  }
}
