import type { Slug } from "../types";

const safeJson = async <T>(res: Response): Promise<T> => {
  try {
    return (await res.json()) as T;
  } catch {
    return {} as T;
  }
};

export const fetchSlugs = async (): Promise<Slug[]> => {
  const res = await fetch("/api/cms/slugs");
  if (!res.ok) {
    throw new Error("Failed to fetch slugs");
  }
  return res.json() as Promise<Slug[]>;
};

export const fetchSlug = async (id: string): Promise<Slug> => {
  const res = await fetch(`/api/cms/slugs/${id}`);
  if (!res.ok) {
    throw new Error("Failed to fetch slug");
  }
  return res.json() as Promise<Slug>;
};

export const createSlug = async (input: { slug: string }) => {
  const res = await fetch("/api/cms/slugs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await safeJson<Slug>(res);
  return { ok: res.ok, payload };
};

export const updateSlug = async (id: string, input: Partial<Slug>) => {
  const res = await fetch(`/api/cms/slugs/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await safeJson<Slug>(res);
  return { ok: res.ok, payload };
};

export const deleteSlug = async (id: string) => {
  const res = await fetch(`/api/cms/slugs/${id}`, {
    method: "DELETE",
  });
  return { ok: res.ok };
};
