import { api } from '@/shared/lib/api-client';

import type { CmsTheme, CmsThemeCreateInput, CmsThemeUpdateInput } from '@/shared/contracts/cms';

export const fetchThemes = async (): Promise<CmsTheme[]> => {
  return api.get<CmsTheme[]>('/api/cms/themes');
};

export const fetchTheme = async (id: string): Promise<CmsTheme> => {
  return api.get<CmsTheme>(`/api/cms/themes/${id}`);
};

export const createTheme = async (input: CmsThemeCreateInput): Promise<{ ok: boolean; payload: CmsTheme }> => {
  try {
    const payload = await api.post<CmsTheme>('/api/cms/themes', input);
    return { ok: true, payload };
  } catch (error) {
    return { ok: false, payload: { error: error instanceof Error ? error.message : 'Unknown error' } as unknown as CmsTheme };
  }
};

export const updateTheme = async (id: string, input: CmsThemeUpdateInput): Promise<{ ok: boolean; payload: CmsTheme }> => {
  try {
    const payload = await api.put<CmsTheme>(`/api/cms/themes/${id}`, input);
    return { ok: true, payload };
  } catch (error) {
    return { ok: false, payload: { error: error instanceof Error ? error.message : 'Unknown error' } as unknown as CmsTheme };
  }
};

export const deleteTheme = async (id: string): Promise<{ ok: boolean }> => {
  try {
    await api.delete(`/api/cms/themes/${id}`);
    return { ok: true };
  } catch (_error) {
    return { ok: false };
  }
};
