import type { DbQueryConfig } from "@/lib/ai-paths";

type LabeledPreset = { id: string; label: string; value: string };

type TemplateSnippet = { label: string; value: string };

const PLACEHOLDER_CHIPS = [
  "{{value}}",
  "{{entityId}}",
  "{{productId}}",
  "{{context.entityId}}",
  "{{bundle.key}}",
  "{{meta.pathId}}",
];

const TEMPLATE_SNIPPETS: TemplateSnippet[] = [
  {
    label: "By _id",
    value: "{\n  \"_id\": \"{{value}}\"\n}",
  },
  {
    label: "By productId",
    value: "{\n  \"productId\": \"{{value}}\"\n}",
  },
  {
    label: "By SKU",
    value: "{\n  \"sku\": \"{{value}}\"\n}",
  },
  {
    label: "Name contains",
    value: "{\n  \"name\": { \"$regex\": \"{{value}}\", \"$options\": \"i\" }\n}",
  },
  {
    label: "Created after",
    value: "{\n  \"createdAt\": { \"$gte\": \"{{value}}\" }\n}",
  },
];

const SORT_PRESETS: LabeledPreset[] = [
  { id: "created_desc", label: "Newest first (createdAt desc)", value: "{ \"createdAt\": -1 }" },
  { id: "created_asc", label: "Oldest first (createdAt asc)", value: "{ \"createdAt\": 1 }" },
  { id: "updated_desc", label: "Recently updated", value: "{ \"updatedAt\": -1 }" },
  { id: "name_asc", label: "Name A-Z", value: "{ \"name_en\": 1 }" },
  { id: "name_desc", label: "Name Z-A", value: "{ \"name_en\": -1 }" },
  { id: "price_asc", label: "Price low-high", value: "{ \"price\": 1 }" },
  { id: "price_desc", label: "Price high-low", value: "{ \"price\": -1 }" },
];

const PROJECTION_PRESETS: LabeledPreset[] = [
  {
    id: "list_minimal",
    label: "Minimal list",
    value: "{ \"id\": 1, \"sku\": 1, \"name_en\": 1, \"name_pl\": 1 }",
  },
  {
    id: "pricing",
    label: "Pricing fields",
    value: "{ \"id\": 1, \"sku\": 1, \"defaultPriceGroupId\": 1, \"price\": 1 }",
  },
  {
    id: "names_only",
    label: "Names only",
    value: "{ \"id\": 1, \"name_en\": 1, \"name_pl\": 1, \"name_de\": 1 }",
  },
  {
    id: "descriptions",
    label: "Descriptions only",
    value: "{ \"id\": 1, \"description_en\": 1, \"description_pl\": 1 }",
  },
  {
    id: "images_only",
    label: "Images only",
    value: "{ \"id\": 1, \"images\": 1, \"imageUrls\": 1 }",
  },
  {
    id: "listing_overview",
    label: "Listing overview",
    value: "{ \"id\": 1, \"sku\": 1, \"name_en\": 1, \"status\": 1, \"createdAt\": 1 }",
  },
];

const buildPresetQueryTemplate = (queryConfig: DbQueryConfig) => {
  const preset = queryConfig.preset;
  let field = "_id";
  let valuePlaceholder = "{{value}}";
  if (preset === "by_productId") {
    field = "productId";
    valuePlaceholder = "{{productId}}";
  } else if (preset === "by_entityId") {
    field = "entityId";
    valuePlaceholder = "{{entityId}}";
  } else if (preset === "by_field") {
    field = queryConfig.field?.trim() || "field";
    valuePlaceholder = "{{value}}";
  } else if (preset === "by_id") {
    field = queryConfig.idType === "objectId" ? "_id" : "id";
    valuePlaceholder = "{{value}}";
  }
  return `\n{\n  \"${field}\": \"${valuePlaceholder}\"\n}`.trim();
};

export {
  PLACEHOLDER_CHIPS,
  TEMPLATE_SNIPPETS,
  SORT_PRESETS,
  PROJECTION_PRESETS,
  buildPresetQueryTemplate,
};
