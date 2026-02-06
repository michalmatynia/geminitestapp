import type { Page, PageSummary } from '../types';

const safeJson = async <T>(res: Response): Promise<T> => {
  try {
    return (await res.json()) as T;
  } catch {
    return {} as T;
  }
};

const withDomainQuery = (url: string, domainId?: string | null): string => {
  if (!domainId) return url;
  const params = new URLSearchParams({ domainId });
  return `${url}?${params.toString()}`;
};

export const fetchPages = async (domainId?: string | null): Promise<PageSummary[]> => {
  const res = await fetch(withDomainQuery('/api/cms/pages', domainId ?? undefined));
  if (!res.ok) {
    throw new Error('Failed to fetch pages');
  }
  return res.json() as Promise<PageSummary[]>;
};

export const fetchPage = async (id: string): Promise<Page> => {
  const res = await fetch(`/api/cms/pages/${id}`);
  if (!res.ok) {
    throw new Error('Failed to fetch page');
  }
  return res.json() as Promise<Page>;
};

export const createPage = async (input: {
  name: string;
  slugIds: string[];
}): Promise<{ ok: boolean; payload: Page }> => {
  const res = await fetch('/api/cms/pages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const payload = await safeJson<Page>(res);
  return { ok: res.ok, payload };
};

export const updatePage = async (id: string, input: Page & { slugIds?: string[] }): Promise<{ ok: boolean; payload: Page }> => {
  const res = await fetch(`/api/cms/pages/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const payload = await safeJson<Page>(res);
  return { ok: res.ok, payload };
};

export const deletePage = async (id: string): Promise<{ ok: boolean }> => {
  const res = await fetch(`/api/cms/pages/${id}`, {
    method: 'DELETE',
  });
  return { ok: res.ok };
};
