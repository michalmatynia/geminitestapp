import { isImageLikeValue } from "./image";

export type PortDataType =
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "array"
  | "image"
  | "id"
  | "json"
  | "any";

const PORT_DATA_TYPES: Record<string, PortDataType | PortDataType[]> = {
  simulation: "object",
  trigger: "object",
  context: "object",
  meta: "object",
  entityJson: "object",
  entityId: "id",
  entityType: "string",
  productId: "id",
  title: "string",
  images: "image",
  description: "string",
  description_en: "string",
  content_en: "string",
  analysis: "string",
  prompt: "string",
  aiPrompt: "string",
  bundle: "object",
  value: "any",
  result: "any",
  valid: "boolean",
  errors: "array",
  query: ["object", "string"],
  queryCallback: ["object", "string"],
  aiQuery: ["object", "string"],
  schema: "object",
  jobId: "id",
  status: "string",
};

const TYPE_LABELS: Record<PortDataType, string> = {
  string: "string",
  number: "number",
  boolean: "boolean",
  object: "object",
  array: "array",
  image: "image list (urls/blobs)",
  id: "id (string/number)",
  json: "json (object/array)",
  any: "any",
};

const expandTypes = (types: PortDataType[]): Set<string> => {
  const expanded = new Set<string>();
  types.forEach((type) => {
    if (type === "any") {
      expanded.add("any");
      return;
    }
    if (type === "id") {
      expanded.add("string");
      expanded.add("number");
      return;
    }
    if (type === "json") {
      expanded.add("object");
      expanded.add("array");
      return;
    }
    if (type === "image") {
      expanded.add("image");
      expanded.add("array");
      return;
    }
    expanded.add(type);
  });
  return expanded;
};

export const getPortDataTypes = (port: string): PortDataType[] => {
  const value = PORT_DATA_TYPES[port];
  if (!value) return ["any"];
  return Array.isArray(value) ? value : [value];
};

export const formatPortDataTypes = (types: PortDataType[]): string => {
  if (types.includes("any")) return TYPE_LABELS.any;
  return types.map((type) => TYPE_LABELS[type]).join(" | ");
};

export const getValueTypeLabel = (value: unknown): string => {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (isImageLikeValue(value)) return "image";
  if (Array.isArray(value)) return "array";
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "object") return "object";
  return typeof value;
};

export const isValueCompatibleWithTypes = (
  value: unknown,
  expectedTypes: PortDataType[]
): boolean => {
  if (value === undefined || value === null) return true;
  if (expectedTypes.includes("any")) return true;
  const actualType = getValueTypeLabel(value);
  const expected = expandTypes(expectedTypes);
  if (expected.has("any")) return true;
  if (actualType === "image" && expected.has("array")) return true;
  return expected.has(actualType);
};

export const arePortTypesCompatible = (
  fromTypes: PortDataType[],
  toTypes: PortDataType[]
): boolean => {
  if (fromTypes.includes("any") || toTypes.includes("any")) return true;
  const fromExpanded = expandTypes(fromTypes);
  const toExpanded = expandTypes(toTypes);
  if (fromExpanded.has("any") || toExpanded.has("any")) return true;
  for (const type of fromExpanded) {
    if (toExpanded.has(type)) return true;
  }
  return false;
};
