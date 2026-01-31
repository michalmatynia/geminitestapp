import type { Slug } from "../types";

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

export const fetchSlugs = async (domainId?: string | null): Promise<Slug[]> => {
  const res = await fetch(withDomainQuery("/api/cms/slugs", domainId ?? undefined));
  if (!res.ok) {
    throw new Error("Failed to fetch slugs");
  }
  return res.json() as Promise<Slug[]>;
};

export const fetchAllSlugs = async (): Promise<Slug[]> => {
  const res = await fetch("/api/cms/slugs?scope=all");
  if (!res.ok) {
    throw new Error("Failed to fetch all slugs");
  }
  return res.json() as Promise<Slug[]>;
};

export const fetchSlug = async (id: string, domainId?: string | null): Promise<Slug> => {
  const res = await fetch(withDomainQuery(`/api/cms/slugs/${id}`, domainId ?? undefined));
  if (!res.ok) {
    throw new Error("Failed to fetch slug");
  }
  return res.json() as Promise<Slug>;
};

export const createSlug = async (input: { slug: string; domainId?: string | null }) => {
  const res = await fetch(withDomainQuery("/api/cms/slugs", input.domainId ?? undefined), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug: input.slug }),
  });
  const payload = await safeJson<Slug>(res);
  return { ok: res.ok, payload };
};

export const updateSlug = async (id: string, input: Partial<Slug>, domainId?: string | null) => {
  const res = await fetch(withDomainQuery(`/api/cms/slugs/${id}`, domainId ?? undefined), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await safeJson<Slug>(res);
  return { ok: res.ok, payload };
};

export const deleteSlug = async (id: string, domainId?: string | null) => {
  const res = await fetch(withDomainQuery(`/api/cms/slugs/${id}`, domainId ?? undefined), {
    method: "DELETE",
  });
  return { ok: res.ok };
};
