import type {
  CmsPageCreateRequestDto,
  CmsPageUpdateRequestDto,
  Page,
  PageSummary,
} from '@/shared/contracts/cms';
import { api } from '@/shared/lib/api-client';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export const fetchPages = async (domainId?: string | null): Promise<PageSummary[]> => {
  return api.get<PageSummary[]>('/api/cms/pages', {
    params: { domainId: domainId ?? undefined },
  });
};

export const fetchPage = async (id: string): Promise<Page> => {
  return api.get<Page>(`/api/cms/pages/${id}`);
};

export const createPage = async (
  input: CmsPageCreateRequestDto
): Promise<{ ok: boolean; payload: Page }> => {
  try {
    const payload = await api.post<Page>('/api/cms/pages', input);
    return { ok: true, payload };
  } catch (_error) {
    logClientError(_error);
    return { ok: false, payload: {} as Page };
  }
};

export const updatePage = async (
  id: string,
  input: CmsPageUpdateRequestDto
): Promise<{ ok: boolean; payload: Page }> => {
  try {
    const payload = await api.put<Page>(`/api/cms/pages/${id}`, input);
    return { ok: true, payload };
  } catch (_error) {
    logClientError(_error);
    return { ok: false, payload: {} as Page };
  }
};

export const deletePage = async (id: string): Promise<{ ok: boolean }> => {
  try {
    await api.delete(`/api/cms/pages/${id}`);
    return { ok: true };
  } catch (_error) {
    logClientError(_error);
    return { ok: false };
  }
};
