import { Controller, Get, Query } from '@nestjs/common';
import type { SensorQueryResponse } from '@shared/api.interface';
import { SensorDataService } from './sensor-data.service';

@Controller('api/sensor-data')
export class SensorDataController {
  constructor(private readonly sensorDataService: SensorDataService) {}

  @Get('variables')
  async getVariables(): Promise<{ variables: string[] }> {
    return this.sensorDataService.getVariables();
  }

  @Get('query')
  async query(
    @Query('start') start: string,
    @Query('end') end: string,
    @Query('varnames') varnames: string,
  ): Promise<SensorQueryResponse> {
    return this.sensorDataService.query(start, end, varnames);
  }
}
