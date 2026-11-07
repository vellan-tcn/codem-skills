import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  CheckGranularity,
  DataCheckQueryResponse,
} from '@shared/api.interface';

export async function queryDataCheck(
  granularity: CheckGranularity,
  start: string,
  end: string,
): Promise<DataCheckQueryResponse> {
  const response = await axiosForBackend.get<DataCheckQueryResponse>(
    '/api/data-check/query',
    {
      params: { granularity, start, end },
    },
  );
  return response.data;
}
