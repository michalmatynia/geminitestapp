import type { JsonPathEntry } from "@/shared/types/ai-paths";
import { extractJsonPathEntries, getValueAtMappingPath } from "./json";

export const looksLikeImageUrl = (value: string) =>
  /(\.(png|jpe?g|webp|gif|svg)|\/uploads\/|^https?:\/\/)/i.test(value);

export const isImageLikeValue = (value: unknown): boolean => {
  if (!value) return false;
  if (typeof value === "string") {
    return looksLikeImageUrl(value);
  }
  if (Array.isArray(value)) {
    return value.some((item) => isImageLikeValue(item));
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const candidates = [
      "url",
      "src",
      "thumbnail",
      "thumb",
      "imageUrl",
      "image",
      "filepath",
      "filePath",
      "path",
      "file",
      "previewUrl",
      "preview",
      "imageFile",
      "image_file",
      "media",
      "gallery",
    ];
    if (
      candidates.some((key) => {
        const val = record[key];
        return typeof val === "string" ? looksLikeImageUrl(val) : isImageLikeValue(val);
      })
    ) {
      return true;
    }
    return Object.entries(record).some(([key, val]) => {
      if (typeof val === "string") {
        if (!looksLikeImageUrl(val)) return false;
        return /(url|path|file|image|media|photo|thumb|preview)/i.test(key);
      }
      if (val && typeof val === "object" && /(image|file|media|photo)/i.test(key)) {
        return isImageLikeValue(val);
      }
      return false;
    });
  }
  return false;
};

export const inferImageMappingPath = (value: unknown, depth: number) => {
  if (!value) return null;
  const keyword = /(image|img|photo|picture|media|gallery)/i;
  const searchIn = (root: unknown, prefix: string) => {
    if (!root) return null;
    const entries = extractJsonPathEntries(root, depth);
    const candidates = entries.filter((entry) => keyword.test(entry.path));
    const resolveFullPath = (match: string) => {
      if (!prefix) return match;
      const prefixPath = prefix.startsWith("$") ? prefix : `$.${prefix}`;
      return `${prefixPath}${match.slice(1)}`;
    };
    const checkEntry = (entry: JsonPathEntry) => {
      const jsonPath = entry.path.startsWith("[") ? `$${entry.path}` : `$.${entry.path}`;
      const resolved = getValueAtMappingPath(root, jsonPath);
      if (isImageLikeValue(resolved)) return resolveFullPath(jsonPath);
      return null;
    };
    for (const entry of candidates) {
      const match = checkEntry(entry);
      if (match) return match;
    }
    for (const entry of entries) {
      const match = checkEntry(entry);
      if (match) return match;
    }
    return null;
  };
  const direct = searchIn(value, "");
  if (direct) return direct;
  const wrapperPaths = [
    "context.entity",
    "context.product",
    "simulation.entity",
    "simulation.product",
    "entity",
    "product",
    "item",
    "data",
  ];
  for (const path of wrapperPaths) {
    const wrapped = getValueAtMappingPath(value, path.startsWith("$") ? path : `$.${path}`);
    const match = searchIn(wrapped, path);
    if (match) return match;
  }
  return null;
};
