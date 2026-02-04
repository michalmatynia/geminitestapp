import { parseJsonSetting } from "@/shared/utils/settings-json";

export const IMAGE_STUDIO_TREE_KEY_PREFIX = "image_studio_tree_";

export type ImageStudioFolderTree = {
  version: 1;
  folders: string[];
  fileMap: Record<string, string>;
};

const normalizeFolderPath = (value: string): string => {
  const normalized = value.replace(/\\/g, "/").trim();
  const parts = normalized
    .split("/")
    .map((part: string) => part.trim())
    .filter((part: string) => part && part !== "." && part !== "..")
    .map((part: string) => part.replace(/[^a-zA-Z0-9-_]/g, "_"))
    .filter(Boolean);
  return parts.join("/");
};

export function normalizeFolderPaths(values: string[]): string[] {
  const set = new Set<string>();
  values.forEach((value: string) => {
    const normalized = normalizeFolderPath(value);
    if (normalized) set.add(normalized);
  });
  return Array.from(set).sort((a: string, b: string) => a.localeCompare(b));
}

export function expandFolderPath(path: string): string[] {
  const normalized = normalizeFolderPath(path);
  if (!normalized) return [];
  const parts = normalized.split("/").filter(Boolean);
  return parts.map((_: string, idx: number) => parts.slice(0, idx + 1).join("/"));
}

export function normalizeTree(input: ImageStudioFolderTree | null | undefined): ImageStudioFolderTree {
  const rawFolders = input?.folders ?? [];
  const folders = normalizeFolderPaths(rawFolders.flatMap((path: string) => expandFolderPath(path)));
  const fileMap = Object.fromEntries(
    Object.entries(input?.fileMap ?? {})
      .filter(([id, folder]: [string, string]) => typeof id === "string" && typeof folder === "string")
      .map(([id, folder]: [string, string]) => [id, normalizeFolderPath(folder)])
  ) as Record<string, string>;
  return { version: 1, folders, fileMap };
}

export function parseImageStudioFolderTree(raw: string | null | undefined): ImageStudioFolderTree {
  const parsed = parseJsonSetting<ImageStudioFolderTree | null>(raw, null);
  if (!parsed) return { version: 1, folders: [], fileMap: {} };
  return normalizeTree(parsed);
}
