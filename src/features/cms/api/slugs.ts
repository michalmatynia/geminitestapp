import type { Slug } from '@/shared/contracts/cms';
import { api } from '@/shared/lib/api-client';


export const fetchSlugs = async (domainId?: string | null): Promise<Slug[]> => {
  return api.get<Slug[]>('/api/cms/slugs', {
    params: { domainId: domainId ?? undefined }
  });
};

export const fetchAllSlugs = async (): Promise<Slug[]> => {
  return api.get<Slug[]>('/api/cms/slugs', {
    params: { scope: 'all' }
  });
};

export const fetchSlug = async (id: string, domainId?: string | null): Promise<Slug> => {
  return api.get<Slug>(`/api/cms/slugs/${id}`, {
    params: { domainId: domainId ?? undefined }
  });
};

export const fetchSlugDomains = async (id: string): Promise<{ domainIds: string[] }> => {
  return api.get<{ domainIds: string[] }>(`/api/cms/slugs/${id}/domains`);
};

export const updateSlugDomains = async (id: string, domainIds: string[]): Promise<{ domainIds: string[] }> => {
  return api.put<{ domainIds: string[] }>(`/api/cms/slugs/${id}/domains`, { domainIds });
};

export const createSlug = async (input: { slug: string; domainId?: string | null }): Promise<{ ok: boolean; payload: Slug }> => {
  try {
    const payload = await api.post<Slug>('/api/cms/slugs', { slug: input.slug }, {
      params: { domainId: input.domainId ?? undefined }
    });
    return { ok: true, payload };
  } catch (_error) {
    return { ok: false, payload: {} as Slug };
  }
};

export const updateSlug = async (id: string, input: Partial<Slug>, domainId?: string | null): Promise<{ ok: boolean; payload: Slug }> => {
  try {
    const payload = await api.put<Slug>(`/api/cms/slugs/${id}`, input, {
      params: { domainId: domainId ?? undefined }
    });
    return { ok: true, payload };
  } catch (_error) {
    return { ok: false, payload: {} as Slug };
  }
};

export const deleteSlug = async (id: string, domainId?: string | null): Promise<{ ok: boolean }> => {
  try {
    await api.delete(`/api/cms/slugs/${id}`, {
      params: { domainId: domainId ?? undefined }
    });
    return { ok: true };
  } catch (_error) {
    return { ok: false };
  }
};
