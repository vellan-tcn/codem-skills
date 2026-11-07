import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  MonthlyReportResponse,
  RawDataQueryResponse,
  RawGranularityParam,
  RawLatestResponse,
  RawStepUnit,
  RawYearsResponse,
} from '@shared/api.interface';

export type RawWorkshop = 'pei' | 'mfg';

export async function queryRawData(params: {
  start: string;
  end: string;
  granularity: RawGranularityParam;
  step?: number;
  unit?: RawStepUnit;
  workshop?: RawWorkshop;
}): Promise<RawDataQueryResponse> {
  const response = await axiosForBackend.get<RawDataQueryResponse>(
    '/api/raw-data/query',
    { params },
  );
  return response.data;
}

export async function getRawLatest(
  workshop: RawWorkshop = 'pei',
): Promise<RawLatestResponse> {
  const response = await axiosForBackend.get<RawLatestResponse>(
    '/api/raw-data/latest',
    { params: { workshop } },
  );
  return response.data;
}

export async function getRawYears(
  workshop: RawWorkshop = 'pei',
): Promise<RawYearsResponse> {
  const response = await axiosForBackend.get<RawYearsResponse>(
    '/api/raw-data/years',
    { params: { workshop } },
  );
  return response.data;
}

export async function queryRawReadings(params: {
  year: number;
  month?: number;
  workshop?: RawWorkshop;
  exclude?: string;
}): Promise<MonthlyReportResponse> {
  const response = await axiosForBackend.get<MonthlyReportResponse>(
    '/api/raw-data/readings',
    { params },
  );
  return response.data;
}
