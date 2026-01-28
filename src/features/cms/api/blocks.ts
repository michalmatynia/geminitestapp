import type { Block } from "../types";

const safeJson = async <T>(res: Response): Promise<T> => {
  try {
    return (await res.json()) as T;
  } catch {
    return {} as T;
  }
};

export const fetchBlocks = async (): Promise<Block[]> => {
  const res = await fetch("/api/cms/blocks");
  if (!res.ok) {
    throw new Error("Failed to fetch blocks");
  }
  return res.json() as Promise<Block[]>;
};

export const fetchBlock = async (id: string): Promise<Block> => {
  const res = await fetch(`/api/cms/blocks/${id}`);
  if (!res.ok) {
    throw new Error("Failed to fetch block");
  }
  return res.json() as Promise<Block>;
};

export const createBlock = async (input: { name: string; content: unknown }) => {
  const res = await fetch("/api/cms/blocks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await safeJson<Block>(res);
  return { ok: res.ok, payload };
};

export const updateBlock = async (
  id: string,
  input: { name: string; content: unknown }
) => {
  const res = await fetch(`/api/cms/blocks/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await safeJson<Block>(res);
  return { ok: res.ok, payload };
};

export const deleteBlock = async (id: string) => {
  const res = await fetch(`/api/cms/blocks/${id}`, {
    method: "DELETE",
  });
  return { ok: res.ok };
};
