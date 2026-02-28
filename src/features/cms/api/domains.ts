import type { CmsDomain } from '@/shared/contracts/cms';
import { api } from '@/shared/lib/api-client';

export const fetchDomains = async (): Promise<CmsDomain[]> => {
  return api.get<CmsDomain[]>('/api/cms/domains');
};

export const createDomain = async (input: {
  domain: string;
}): Promise<{ ok: boolean; payload: CmsDomain }> => {
  try {
    const payload = await api.post<CmsDomain>('/api/cms/domains', input);
    return { ok: true, payload };
  } catch (_error) {
    return { ok: false, payload: {} as CmsDomain };
  }
};

export const deleteDomain = async (id: string): Promise<{ ok: boolean }> => {
  try {
    await api.delete(`/api/cms/domains/${id}`);
    return { ok: true };
  } catch (_error) {
    return { ok: false };
  }
};

export const updateDomain = async (
  id: string,
  input: { aliasOf?: string | null }
): Promise<{ ok: boolean; payload: CmsDomain }> => {
  try {
    const payload = await api.put<CmsDomain>(`/api/cms/domains/${id}`, input);
    return { ok: true, payload };
  } catch (_error) {
    return { ok: false, payload: {} as CmsDomain };
  }
};
