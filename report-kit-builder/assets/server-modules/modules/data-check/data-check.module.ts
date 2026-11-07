import { Module } from '@nestjs/common';
import { DataCheckController } from './data-check.controller';
import { DataCheckService } from './data-check.service';

@Module({
  controllers: [DataCheckController],
  providers: [DataCheckService],
})
export class DataCheckModule {}
