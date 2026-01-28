import type { Asset3DRecord, Asset3DUpdateInput, Asset3DListFilters } from "../types";

const API_BASE = "/api/assets3d";

export async function fetchAssets3D(filters?: Asset3DListFilters): Promise<Asset3DRecord[]> {
  const params = new URLSearchParams();
  if (filters?.filename) params.set("filename", filters.filename);
  if (filters?.category) params.set("category", filters.category);
  if (filters?.search) params.set("search", filters.search);
  if (filters?.isPublic !== undefined) params.set("isPublic", String(filters.isPublic));
  if (filters?.tags && filters.tags.length > 0) {
    params.set("tags", filters.tags.join(","));
  }

  const url = params.toString() ? `${API_BASE}?${params}` : API_BASE;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Failed to fetch 3D assets");
  }

  return response.json() as Promise<Asset3DRecord[]>;
}

export async function fetchAsset3DById(id: string): Promise<Asset3DRecord> {
  const response = await fetch(`${API_BASE}/${id}`);

  if (!response.ok) {
    throw new Error("Failed to fetch 3D asset");
  }

  return response.json() as Promise<Asset3DRecord>;
}

export async function uploadAsset3DFile(
  file: File,
  data?: { name?: string; description?: string; category?: string; tags?: string[]; isPublic?: boolean }
): Promise<Asset3DRecord> {
  const formData = new FormData();
  formData.append("file", file);
  if (data?.name) formData.append("name", data.name);
  if (data?.description) formData.append("description", data.description);
  if (data?.category) formData.append("category", data.category);
  if (data?.tags && data.tags.length > 0) formData.append("tags", data.tags.join(","));
  if (data?.isPublic !== undefined) formData.append("isPublic", String(data.isPublic));

  const response = await fetch(API_BASE, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const result = (await response.json()) as { error?: string };
    throw new Error(result.error ?? "Failed to upload 3D asset");
  }

  return response.json() as Promise<Asset3DRecord>;
}

export async function updateAsset3D(id: string, data: Asset3DUpdateInput): Promise<Asset3DRecord> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const result = (await response.json()) as { error?: string };
    throw new Error(result.error ?? "Failed to update 3D asset");
  }

  return response.json() as Promise<Asset3DRecord>;
}

export async function deleteAsset3DById(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete 3D asset");
  }
}

export async function fetchCategories(): Promise<string[]> {
  const response = await fetch(`${API_BASE}/categories`);
  if (!response.ok) return [];
  return response.json() as Promise<string[]>;
}

export async function fetchTags(): Promise<string[]> {
  const response = await fetch(`${API_BASE}/tags`);
  if (!response.ok) return [];
  return response.json() as Promise<string[]>;
}
