import type { Page, PageSummary } from "../types";

const safeJson = async <T>(res: Response): Promise<T> => {
  try {
    return (await res.json()) as T;
  } catch {
    return {} as T;
  }
};

export const fetchPages = async (): Promise<PageSummary[]> => {
  const res = await fetch("/api/cms/pages");
  if (!res.ok) {
    throw new Error("Failed to fetch pages");
  }
  return res.json() as Promise<PageSummary[]>;
};

export const fetchPage = async (id: string): Promise<Page> => {
  const res = await fetch(`/api/cms/pages/${id}`);
  if (!res.ok) {
    throw new Error("Failed to fetch page");
  }
  return res.json() as Promise<Page>;
};

export const createPage = async (input: {
  name: string;
  slugIds: string[];
}) => {
  const res = await fetch("/api/cms/pages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await safeJson<Page>(res);
  return { ok: res.ok, payload };
};

export const updatePage = async (id: string, input: Page) => {
  const res = await fetch(`/api/cms/pages/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await safeJson<Page>(res);
  return { ok: res.ok, payload };
};

export const deletePage = async (id: string) => {
  const res = await fetch(`/api/cms/pages/${id}`, {
    method: "DELETE",
  });
  return { ok: res.ok };
};
