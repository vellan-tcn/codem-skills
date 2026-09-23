import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type { CopOverviewResponse } from '@shared/api.interface';
import type { RawWorkshop } from '@client/src/api/raw-data';

export async function getCopOverview(
  year: number,
  workshop: RawWorkshop = 'pei',
  exclude: string = '',
): Promise<CopOverviewResponse> {
  const response = await axiosForBackend.get<CopOverviewResponse>(
    '/api/cop-overview',
    {
      params: { year, workshop, exclude },
    },
  );
  return response.data;
}
