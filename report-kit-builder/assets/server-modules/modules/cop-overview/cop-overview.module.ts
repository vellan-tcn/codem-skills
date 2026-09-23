import { Module } from '@nestjs/common';
import { CopOverviewController } from './cop-overview.controller';
import { CopOverviewService } from './cop-overview.service';

@Module({
  controllers: [CopOverviewController],
  providers: [CopOverviewService],
})
export class CopOverviewModule {}
