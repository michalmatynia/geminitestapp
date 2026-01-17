import type { ProductCreateData } from "@/lib/validations/product";
import type { BaseProductRecord } from "@/lib/services/imports/base-client";

const toTrimmedString = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
};

const toInt = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed)) {
      return Math.round(parsed);
    }
  }
  return null;
};

const pickString = (record: BaseProductRecord, keys: string[]) => {
  for (const key of keys) {
    const value = toTrimmedString(record[key]);
    if (value) return value;
  }
  return null;
};

const pickInt = (record: BaseProductRecord, keys: string[]) => {
  for (const key of keys) {
    const value = toInt(record[key]);
    if (value !== null) return value;
  }
  return null;
};

const pickNested = (
  record: BaseProductRecord,
  path: string[]
): unknown => {
  let current: unknown = record;
  for (const key of path) {
    if (!current || typeof current !== "object") return null;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
};

const pickNestedInt = (record: BaseProductRecord, paths: string[][]) => {
  for (const path of paths) {
    const value = toInt(pickNested(record, path));
    if (value !== null) return value;
  }
  return null;
};

const isUrl = (value: string) => /^https?:\/\//i.test(value);

const collectUrls = (value: unknown, urls: string[]) => {
  if (!value) return;
  if (typeof value === "string") {
    if (isUrl(value)) urls.push(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => collectUrls(entry, urls));
    return;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const candidates = [
      record.url,
      record.href,
      record.src,
      record.image,
      record.imageUrl,
      record.image_url,
      record.link,
      record.photo,
      record.thumbnail,
    ];
    candidates.forEach((candidate) => collectUrls(candidate, urls));
    Object.values(record).forEach((candidate) => collectUrls(candidate, urls));
  }
};

export function extractBaseImageUrls(record: BaseProductRecord): string[] {
  const urls: string[] = [];
  const keys = [
    "images",
    "image",
    "image_url",
    "imageUrl",
    "images_url",
    "images_urls",
    "photos",
    "photo",
    "gallery",
    "pictures",
    "main_image",
    "mainImage",
  ];
  keys.forEach((key) => collectUrls(record[key], urls));
  collectUrls(record, urls);
  return Array.from(new Set(urls));
}

export function mapBaseProduct(record: BaseProductRecord): ProductCreateData {
  // Extend this mapper as new Base.com fields are needed.
  const baseProductId = pickString(record, [
    "base_product_id",
    "product_id",
    "id",
  ]);

  const nameEn = pickString(record, ["name_en", "name", "title"]);
  const namePl = pickString(record, ["name_pl"]);
  const nameDe = pickString(record, ["name_de"]);

  const descriptionEn = pickString(record, [
    "description_en",
    "description",
    "description_long",
  ]);
  const descriptionPl = pickString(record, ["description_pl"]);
  const descriptionDe = pickString(record, ["description_de"]);

  const sku = pickString(record, ["sku", "code", "product_code", "item_code"]);

  const price =
    pickInt(record, ["price", "price_gross", "price_brutto"]) ??
    pickNestedInt(record, [
      ["prices", "0", "price"],
      ["prices", "0", "price_brutto"],
    ]);

  const stock = pickInt(record, ["stock", "quantity", "qty", "available"]);

  const weight = pickInt(record, ["weight"]);
  const sizeLength = pickInt(record, ["sizeLength", "length_cm"]);
  const sizeWidth = pickInt(record, ["sizeWidth", "width_cm"]);
  const length = pickInt(record, ["length"]);

  return {
    sku: sku ?? undefined,
    baseProductId: baseProductId ?? null,
    defaultPriceGroupId: null,
    name_en: nameEn ?? null,
    name_pl: namePl ?? null,
    name_de: nameDe ?? null,
    description_en: descriptionEn ?? null,
    description_pl: descriptionPl ?? null,
    description_de: descriptionDe ?? null,
    supplierName: pickString(record, ["supplierName", "supplier_name"]),
    supplierLink: pickString(record, ["supplierLink", "supplier_url"]),
    priceComment: pickString(record, ["priceComment", "price_comment"]),
    stock: stock ?? null,
    price: price ?? null,
    sizeLength: sizeLength ?? null,
    sizeWidth: sizeWidth ?? null,
    weight: weight ?? null,
    length: length ?? null,
  };
}
