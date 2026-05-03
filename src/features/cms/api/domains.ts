import type {
  CmsDomain,
  CmsDomainCreateRequestDto,
  CmsDomainUpdateRequestDto,
} from '@/shared/contracts/cms';
import { api } from '@/shared/lib/api-client';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export const fetchDomains = async (): Promise<CmsDomain[]> => {
  return api.get<CmsDomain[]>('/api/cms/domains');
};

export const createDomain = async (
  input: CmsDomainCreateRequestDto
): Promise<{ ok: boolean; payload: CmsDomain }> => {
  try {
    const payload = await api.post<CmsDomain>('/api/cms/domains', input);
    return { ok: true, payload };
  } catch (_error) {
    logClientError(_error);
    return { ok: false, payload: {} as unknown as CmsDomain };
  }
};

export const deleteDomain = async (id: string): Promise<{ ok: boolean }> => {
  try {
    await api.delete(`/api/cms/domains/${id}`);
    return { ok: true };
  } catch (_error) {
    logClientError(_error);
    return { ok: false };
  }
};

export const updateDomain = async (
  id: string,
  input: CmsDomainUpdateRequestDto
): Promise<{ ok: boolean; payload: CmsDomain }> => {
  try {
    const payload = await api.put<CmsDomain>(`/api/cms/domains/${id}`, input);
    return { ok: true, payload };
  } catch (_error) {
    logClientError(_error);
    return { ok: false, payload: {} as unknown as CmsDomain };
  }
};
