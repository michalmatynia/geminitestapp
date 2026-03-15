import type {
  CmsTheme,
  CmsThemeCreateRequestDto,
  CmsThemeUpdateRequestDto,
} from '@/shared/contracts/cms';
import { api } from '@/shared/lib/api-client';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


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
  input: CmsThemeCreateRequestDto
): Promise<ThemeMutationResult> => {
  try {
    const payload = await api.post<CmsTheme>('/api/cms/themes', input);
    return { ok: true, payload };
  } catch (error) {
    logClientError(error);
    return {
      ok: false,
      payload: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export const updateTheme = async (
  id: string,
  input: CmsThemeUpdateRequestDto
): Promise<ThemeMutationResult> => {
  try {
    const payload = await api.put<CmsTheme>(`/api/cms/themes/${id}`, input);
    return { ok: true, payload };
  } catch (error) {
    logClientError(error);
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
    logClientError(_error);
    return { ok: false };
  }
};
