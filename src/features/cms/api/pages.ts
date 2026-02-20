import { api } from '@/shared/lib/api-client';

import type { Page, PageSummary } from '@/shared/contracts/cms';

export const fetchPages = async (domainId?: string | null): Promise<PageSummary[]> => {
  return api.get<PageSummary[]>('/api/cms/pages', {
    params: { domainId: domainId ?? undefined }
  });
};

export const fetchPage = async (id: string): Promise<Page> => {
  return api.get<Page>(`/api/cms/pages/${id}`);
};

export const createPage = async (input: {
  name: string;
  slugIds: string[];
}): Promise<{ ok: boolean; payload: Page }> => {
  try {
    const payload = await api.post<Page>('/api/cms/pages', input);
    return { ok: true, payload };
  } catch (_error) {
    return { ok: false, payload: {} as Page };
  }
};

export const updatePage = async (id: string, input: Page & { slugIds?: string[] }): Promise<{ ok: boolean; payload: Page }> => {
  try {
    const payload = await api.put<Page>(`/api/cms/pages/${id}`, input);
    return { ok: true, payload };
  } catch (_error) {
    return { ok: false, payload: {} as Page };
  }
};

export const deletePage = async (id: string): Promise<{ ok: boolean }> => {
  try {
    await api.delete(`/api/cms/pages/${id}`);
    return { ok: true };
  } catch (_error) {
    return { ok: false };
  }
};
