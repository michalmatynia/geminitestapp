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

const pickNestedString = (record: BaseProductRecord, paths: string[][]) => {
  for (const path of paths) {
    const value = toTrimmedString(pickNested(record, path));
    if (value) return value;
  }
  return null;
};

const pickFirstIntFromObject = (record: BaseProductRecord, key: string) => {
  const obj = record[key];
  if (!obj || typeof obj !== "object") return null;
  const values = Object.values(obj as object);
  for (const v of values) {
    if (typeof v === "number") return toInt(v);
    if (typeof v === "string") return toInt(v);
    if (typeof v === "object" && v) {
      const p = toInt(
        (v as any).price ?? (v as any).price_brutto ?? (v as any).price_gross
      );
      if (p !== null) return p;
    }
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

type TemplateMapping = {
  sourceKey: string;
  targetField: string;
};

const NUMBER_FIELDS = new Set([
  "price",
  "stock",
  "sizeLength",
  "sizeWidth",
  "weight",
  "length",
]);

const toStringValue = (value: unknown): string | null => {
  if (Array.isArray(value)) {
    const parts = value
      .map((entry) => toTrimmedString(entry))
      .filter((entry): entry is string => Boolean(entry));
    return parts.length ? parts.join(", ") : null;
  }
  if (value && typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return null;
    }
  }
  return toTrimmedString(value);
};

const toIntValue = (value: unknown): number | null => {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const parsed = toInt(entry);
      if (parsed !== null) return parsed;
    }
    return null;
  }
  return toInt(value);
};

const getByPath = (record: BaseProductRecord, path: string[]): unknown => {
  let current: unknown = record;
  for (const key of path) {
    if (!current || typeof current !== "object") return null;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
};

const findParameterValue = (
  params: unknown,
  sourceKey: string
): unknown => {
  if (!params) return null;
  if (Array.isArray(params)) {
    for (const entry of params) {
      if (!entry || typeof entry !== "object") continue;
      const record = entry as Record<string, unknown>;
      const name = toTrimmedString(record.name ?? record.parameter ?? record.code);
      const id = toTrimmedString(
        record.id ?? record.parameter_id ?? record.param_id
      );
      if (name === sourceKey || id === sourceKey) {
        return (
          record.value ??
          record.values ??
          record.value_id ??
          record.label ??
          record.text
        );
      }
    }
    return null;
  }
  if (typeof params === "object") {
    const record = params as Record<string, unknown>;
    if (sourceKey in record) return record[sourceKey];
  }
  return null;
};

const resolveTemplateValue = (
  record: BaseProductRecord,
  sourceKey: string
): unknown => {
  if (!sourceKey) return null;
  if (sourceKey.includes(".")) {
    const path = sourceKey.split(".").map((part) => part.trim());
    const value = getByPath(record, path);
    if (value !== null && value !== undefined) return value;
  }
  if (sourceKey in record) {
    return record[sourceKey];
  }
  const parameters =
    record.parameters ?? record.params ?? record.attributes ?? null;
  const parameterValue = findParameterValue(parameters, sourceKey);
  if (parameterValue !== null && parameterValue !== undefined) {
    return parameterValue;
  }
  const features = record.features ?? record.feature ?? null;
  return findParameterValue(features, sourceKey);
};

const applyTemplateMappings = (
  record: BaseProductRecord,
  mapped: ProductCreateData,
  mappings: TemplateMapping[]
) => {
  for (const mapping of mappings) {
    const sourceKey = mapping.sourceKey.trim();
    const targetField = mapping.targetField.trim();
    if (!sourceKey || !targetField) continue;
    const rawValue = resolveTemplateValue(record, sourceKey);
    if (rawValue === null || rawValue === undefined) continue;
    if (NUMBER_FIELDS.has(targetField)) {
      const parsed = toIntValue(rawValue);
      if (parsed === null) continue;
      (mapped as Record<string, unknown>)[targetField] = parsed;
      continue;
    }
    const stringValue = toStringValue(rawValue);
    if (!stringValue) continue;
    if (targetField === "sku") {
      mapped.sku = stringValue;
      continue;
    }
    if (targetField.startsWith("image_")) {
      const index = parseInt(targetField.replace("image_", ""), 10) - 1;
      if (!Number.isNaN(index) && index >= 0) {
        if (!mapped.imageLinks) mapped.imageLinks = [];
        // Ensure array is long enough by filling with empty strings if needed, 
        // though typically we just want to set the value. 
        // If we want to strictly order, we might need a sparse array or fill.
        // For now, let's just assign.
        mapped.imageLinks[index] = stringValue;
      }
      continue;
    }
    (mapped as Record<string, unknown>)[targetField] = stringValue;
  }
  
  // Clean up any empty slots if we created a sparse array
  if (mapped.imageLinks) {
    mapped.imageLinks = mapped.imageLinks.filter(Boolean);
  }
};

export function mapBaseProduct(
  record: BaseProductRecord,
  mappings: TemplateMapping[] = []
): ProductCreateData {
  // Extend this mapper as new Base.com fields are needed.
  const baseProductId = pickString(record, [
    "base_product_id",
    "product_id",
    "id",
  ]);

  const nameEn =
    pickString(record, ["name_en", "name", "title"]) ??
    pickNestedString(record, [
      ["text_fields", "name"],
      ["text_fields", "name_en"],
      ["text_fields", "name|en"],
      ["text_fields", "title"],
    ]);

  const namePl = pickString(record, ["name_pl"]);
  const nameDe = pickString(record, ["name_de"]);

  const descriptionEn =
    pickString(record, [
      "description_en",
      "description",
      "description_long",
    ]) ??
    pickNestedString(record, [
      ["text_fields", "description"],
      ["text_fields", "description_en"],
      ["text_fields", "description|en"],
      ["text_fields", "description_long"],
    ]);

  const descriptionPl = pickString(record, ["description_pl"]);
  const descriptionDe = pickString(record, ["description_de"]);

  const sku = pickString(record, ["sku", "code", "product_code", "item_code"]);

  const price =
    pickInt(record, ["price", "price_gross", "price_brutto"]) ??
    pickNestedInt(record, [
      ["prices", "0", "price"],
      ["prices", "0", "price_brutto"],
    ]) ??
    pickFirstIntFromObject(record, "prices");

  const stock =
    pickInt(record, ["stock", "quantity", "qty", "available"]) ??
    pickFirstIntFromObject(record, "stock");

  const weight = pickInt(record, ["weight"]);
  const sizeLength = pickInt(record, ["sizeLength", "length_cm"]);
  const sizeWidth = pickInt(record, ["sizeWidth", "width_cm"]);
  const length = pickInt(record, ["length"]);

  const mapped: ProductCreateData = {
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
    imageLinks: extractBaseImageUrls(record),
  };

  if (mappings.length > 0) {
    applyTemplateMappings(record, mapped, mappings);
  }

  return mapped;
}
