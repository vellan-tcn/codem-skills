import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import type { CopOverviewResponse } from '@shared/api.interface';
import { CopOverviewService } from './cop-overview.service';

@Controller('api/cop-overview')
export class CopOverviewController {
  constructor(private readonly copOverviewService: CopOverviewService) {}

  @Get()
  getOverview(
    @Query('workshop') workshop?: string,
    @Query('year') year?: string,
    @Query('exclude') excludeStr?: string,
  ): Promise<CopOverviewResponse> {
    const parsed: number =
      year === undefined || year === ''
        ? new Date().getFullYear()
        : Number(year);
    if (!Number.isInteger(parsed) || parsed < 2000 || parsed > 2100) {
      throw new BadRequestException('year 参数非法，需为 2000~2100 的整数');
    }
    return this.copOverviewService.getOverview(
        parsed,
        workshop === 'mfg' ? 'mfg' : 'pei',
        excludeStr ?? '',
      );
  }
}
