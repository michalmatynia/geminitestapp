import type { CmsTheme, CmsThemeCreateInput, CmsThemeUpdateInput } from '@/shared/contracts/cms';
import { api } from '@/shared/lib/api-client';

type ThemeMutationResult =
  | { ok: true; payload: CmsTheme }
  | { ok: false; payload: null; error: string };

export const fetchThemes = async (): Promise<CmsTheme[]> => {
  return api.get<CmsTheme[]>('/api/cms/themes');
};

export const fetchTheme = async (id: string): Promise<CmsTheme> => {
  return api.get<CmsTheme>(`/api/cms/themes/${id}`);
};

export const createTheme = async (
  input: CmsThemeCreateInput
): Promise<ThemeMutationResult> => {
  try {
    const payload = await api.post<CmsTheme>('/api/cms/themes', input);
    return { ok: true, payload };
  } catch (error) {
    return {
      ok: false,
      payload: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export const updateTheme = async (
  id: string,
  input: CmsThemeUpdateInput
): Promise<ThemeMutationResult> => {
  try {
    const payload = await api.put<CmsTheme>(`/api/cms/themes/${id}`, input);
    return { ok: true, payload };
  } catch (error) {
    return {
      ok: false,
      payload: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
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
