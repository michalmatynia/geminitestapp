import type { CmsDomain } from "../types";

const safeJson = async <T>(res: Response): Promise<T> => {
  try {
    return (await res.json()) as T;
  } catch {
    return {} as T;
  }
};

export const fetchDomains = async (): Promise<CmsDomain[]> => {
  const res = await fetch("/api/cms/domains");
  if (!res.ok) {
    throw new Error("Failed to fetch domains");
  }
  return res.json() as Promise<CmsDomain[]>;
};

export const createDomain = async (input: { domain: string }) => {
  const res = await fetch("/api/cms/domains", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await safeJson<CmsDomain>(res);
  return { ok: res.ok, payload };
};

export const deleteDomain = async (id: string) => {
  const res = await fetch(`/api/cms/domains/${id}`, {
    method: "DELETE",
  });
  return { ok: res.ok };
};

export const updateDomain = async (id: string, input: { aliasOf?: string | null }) => {
  const res = await fetch(`/api/cms/domains/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await safeJson<CmsDomain>(res);
  return { ok: res.ok, payload };
};
