import type { CmsTheme, CmsThemeCreateInput, CmsThemeUpdateInput } from "../types";

const safeJson = async <T>(res: Response): Promise<T> => {
  try {
    return (await res.json()) as T;
  } catch {
    return {} as T;
  }
};

export const fetchThemes = async (): Promise<CmsTheme[]> => {
  const res = await fetch("/api/cms/themes");
  if (!res.ok) {
    throw new Error("Failed to fetch themes");
  }
  return res.json() as Promise<CmsTheme[]>;
};

export const fetchTheme = async (id: string): Promise<CmsTheme> => {
  const res = await fetch(`/api/cms/themes/${id}`);
  if (!res.ok) {
    throw new Error("Failed to fetch theme");
  }
  return res.json() as Promise<CmsTheme>;
};

export const createTheme = async (input: CmsThemeCreateInput): Promise<{ ok: boolean; payload: CmsTheme }> => {
  const res = await fetch("/api/cms/themes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await safeJson<CmsTheme>(res);
  return { ok: res.ok, payload };
};

export const updateTheme = async (id: string, input: CmsThemeUpdateInput): Promise<{ ok: boolean; payload: CmsTheme }> => {
  const res = await fetch(`/api/cms/themes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await safeJson<CmsTheme>(res);
  return { ok: res.ok, payload };
};

export const deleteTheme = async (id: string): Promise<{ ok: boolean }> => {
  const res = await fetch(`/api/cms/themes/${id}`, {
    method: "DELETE",
  });
  return { ok: res.ok };
};
