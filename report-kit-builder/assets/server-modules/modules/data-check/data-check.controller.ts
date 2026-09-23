import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import type { CheckGranularity, DataCheckQueryResponse } from '@shared/api.interface';
import { DataCheckService } from './data-check.service';

const GRANULARITIES: CheckGranularity[] = ['minute', 'hour', 'day', 'month', 'year'];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

@Controller('api/data-check')
export class DataCheckController {
  constructor(private readonly dataCheckService: DataCheckService) {}

  @Get('query')
  async query(
    @Query('granularity') granularity: string,
    @Query('start') start: string,
    @Query('end') end: string,
  ): Promise<DataCheckQueryResponse> {
    if (!GRANULARITIES.includes(granularity as CheckGranularity)) {
      throw new BadRequestException('granularity 必须是 minute/hour/day/month/year');
    }
    if (!DATE_PATTERN.test(start ?? '') || !DATE_PATTERN.test(end ?? '')) {
      throw new BadRequestException('start/end 必须是 YYYY-MM-DD 格式');
    }
    if (start > end) {
      throw new BadRequestException('起始日期不能晚于结束日期');
    }
    return this.dataCheckService.query(
      granularity as CheckGranularity,
      start,
      end,
    );
  }
}
