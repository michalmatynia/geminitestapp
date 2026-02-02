import fs from "fs/promises";
import path from "path";
import { getDiskPathFromPublicPath } from "@/features/files/utils/fileUploader";

const TOTAL_IMAGE_SLOTS = 15;

const isDataUrl = (value: string): boolean => value.startsWith("data:");

const guessMimeType = (filepath: string): string => {
  const ext = path.extname(filepath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "image/jpeg";
};

const toDataUrl = (buffer: Buffer, mimetype: string): string =>
  `data:${mimetype};base64,${buffer.toString("base64")}`;

const fetchAsDataUrl = async (url: string): Promise<string | null> => {
  const res = await fetch(url);
  if (!res.ok) return null;
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") || "image/jpeg";
  return toDataUrl(buffer, contentType);
};

const readLocalAsDataUrl = async (
  publicPath: string,
  mimetype?: string | null,
): Promise<string | null> => {
  const diskPath = getDiskPathFromPublicPath(publicPath);
  const buffer = await fs.readFile(diskPath);
  return toDataUrl(buffer, mimetype || guessMimeType(publicPath));
};

const normalizeImageLinks = (links?: string[] | null): string[] => {
  const next: string[] = new Array<string>(TOTAL_IMAGE_SLOTS).fill("");
  if (!Array.isArray(links)) return next;
  links.slice(0, TOTAL_IMAGE_SLOTS).forEach((link: string, index: number) => {
    const value = typeof link === "string" ? link.trim() : "";
    next[index] = value && !isDataUrl(value) ? value : "";
  });
  return next;
};

const normalizeImageBase64s = (
  base64s?: string[] | null,
  links?: string[] | null,
): string[] => {
  const next: string[] = new Array<string>(TOTAL_IMAGE_SLOTS).fill("");
  if (Array.isArray(base64s)) {
    base64s.slice(0, TOTAL_IMAGE_SLOTS).forEach((value: string, index: number) => {
      const trimmed = typeof value === "string" ? value.trim() : "";
      next[index] = trimmed && isDataUrl(trimmed) ? trimmed : "";
    });
  }
  if (Array.isArray(links)) {
    links.slice(0, TOTAL_IMAGE_SLOTS).forEach((value: string, index: number) => {
      const trimmed = typeof value === "string" ? value.trim() : "";
      if (trimmed && isDataUrl(trimmed) && !next[index]) {
        next[index] = trimmed;
      }
    });
  }
  return next;
};

export type ProductImageBase64Source = {
  images?: Array<{ imageFile?: { filepath?: string | null; mimetype?: string | null } }> | null;
  imageLinks?: string[] | null;
  imageBase64s?: string[] | null;
};

export const buildImageBase64Slots = async (
  product: ProductImageBase64Source,
): Promise<{ imageBase64s: string[]; imageLinks: string[] }> => {
  const imageBase64s = normalizeImageBase64s(product.imageBase64s, product.imageLinks);
  const imageLinks = normalizeImageLinks(product.imageLinks);
  const slots = product.images ?? [];

  for (let i = 0; i < TOTAL_IMAGE_SLOTS; i += 1) {
    if (imageBase64s[i]) continue;

    const slotFilepath = slots[i]?.imageFile?.filepath ?? null;
    const slotMimetype = slots[i]?.imageFile?.mimetype ?? null;
    const linkValue = imageLinks[i] ?? "";

    if (slotFilepath) {
      if (isDataUrl(slotFilepath)) {
        imageBase64s[i] = slotFilepath;
        continue;
      }
      if (/^https?:\/\//i.test(slotFilepath)) {
        const dataUrl = await fetchAsDataUrl(slotFilepath);
        if (dataUrl) imageBase64s[i] = dataUrl;
        continue;
      }
      const dataUrl = await readLocalAsDataUrl(slotFilepath, slotMimetype);
      if (dataUrl) imageBase64s[i] = dataUrl;
      continue;
    }

    if (linkValue) {
      if (isDataUrl(linkValue)) {
        imageBase64s[i] = linkValue;
        imageLinks[i] = "";
        continue;
      }
      if (/^https?:\/\//i.test(linkValue)) {
        const dataUrl = await fetchAsDataUrl(linkValue);
        if (dataUrl) imageBase64s[i] = dataUrl;
      } else if (linkValue.startsWith("/")) {
        const dataUrl = await readLocalAsDataUrl(linkValue, null);
        if (dataUrl) imageBase64s[i] = dataUrl;
      }
    }
  }

  return { imageBase64s, imageLinks };
};
