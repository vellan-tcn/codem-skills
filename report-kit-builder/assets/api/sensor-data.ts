import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type { SensorQueryResponse } from '@shared/api.interface';

export async function getSensorVariables(): Promise<string[]> {
  const response = await axiosForBackend.get<{ variables: string[] }>(
    '/api/sensor-data/variables',
  );
  return response.data.variables;
}

export async function querySensorSeries(
  start: string,
  end: string,
  varnames: string[],
): Promise<SensorQueryResponse> {
  const response = await axiosForBackend.get<SensorQueryResponse>(
    '/api/sensor-data/query',
    {
      params: { start, end, varnames: varnames.join(',') },
    },
  );
  return response.data;
}
