import type { DbQueryConfig } from '@/features/ai/ai-paths/lib';

type LabeledPreset = { id: string; label: string; value: string };

type TemplateSnippet = { label: string; value: string };
type SnippetItem = { label: string; value: string; disabled?: boolean; note?: string };
type SnippetGroup = { label: string; items: SnippetItem[] };

const PLACEHOLDER_CHIPS = [
  '{{value}}',
  '{{entityId}}',
  '{{productId}}',
  '{{context.entityId}}',
  '{{bundle.key}}',
  '{{meta.pathId}}',
];

const TEMPLATE_SNIPPETS: TemplateSnippet[] = [
  {
    label: 'By _id',
    value: '{\n  "_id": "{{value}}"\n}',
  },
  {
    label: 'By productId',
    value: '{\n  "productId": "{{value}}"\n}',
  },
  {
    label: 'By SKU',
    value: '{\n  "sku": "{{value}}"\n}',
  },
  {
    label: 'Name contains',
    value: '{\n  "name": { "$regex": "{{value}}", "$options": "i" }\n}',
  },
  {
    label: 'Created after',
    value: '{\n  "createdAt": { "$gte": "{{value}}" }\n}',
  },
];

const PRISMA_TEMPLATE_SNIPPETS: TemplateSnippet[] = [
  {
    label: 'By id',
    value: '{\n  "id": "{{value}}"\n}',
  },
  {
    label: 'By SKU',
    value: '{\n  "sku": "{{value}}"\n}',
  },
  {
    label: 'Name contains',
    value: '{\n  "name_en": { "contains": "{{value}}", "mode": "insensitive" }\n}',
  },
  {
    label: 'Created after',
    value: '{\n  "createdAt": { "gte": "{{value}}" }\n}',
  },
  {
    label: 'Catalog contains product',
    value: '{\n  "catalogs": { "some": { "catalogId": "{{value}}" } }\n}',
  },
];

const SORT_PRESETS: LabeledPreset[] = [
  { id: 'created_desc', label: 'Newest first (createdAt desc)', value: '{ "createdAt": -1 }' },
  { id: 'created_asc', label: 'Oldest first (createdAt asc)', value: '{ "createdAt": 1 }' },
  { id: 'updated_desc', label: 'Recently updated', value: '{ "updatedAt": -1 }' },
  { id: 'name_asc', label: 'Name A-Z', value: '{ "name_en": 1 }' },
  { id: 'name_desc', label: 'Name Z-A', value: '{ "name_en": -1 }' },
  { id: 'price_asc', label: 'Price low-high', value: '{ "price": 1 }' },
  { id: 'price_desc', label: 'Price high-low', value: '{ "price": -1 }' },
];

const toPrismaSortValue = (value: string): string => {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const next: Record<string, 'asc' | 'desc'> = {};
    Object.entries(parsed).forEach(([key, val]) => {
      if (val === -1 || val === 'desc') next[key] = 'desc';
      if (val === 1 || val === 'asc') next[key] = 'asc';
    });
    return JSON.stringify(next, null, 2);
  } catch {
    return value;
  }
};

const PRISMA_SORT_PRESETS: LabeledPreset[] = SORT_PRESETS.map((preset: LabeledPreset) => ({
  ...preset,
  value: toPrismaSortValue(preset.value),
}));

const PROJECTION_PRESETS: LabeledPreset[] = [
  {
    id: 'list_minimal',
    label: 'Minimal list',
    value: '{ "id": 1, "sku": 1, "name_en": 1, "name_pl": 1 }',
  },
  {
    id: 'pricing',
    label: 'Pricing fields',
    value: '{ "id": 1, "sku": 1, "defaultPriceGroupId": 1, "price": 1 }',
  },
  {
    id: 'names_only',
    label: 'Names only',
    value: '{ "id": 1, "name_en": 1, "name_pl": 1, "name_de": 1 }',
  },
  {
    id: 'descriptions',
    label: 'Descriptions only',
    value: '{ "id": 1, "description_en": 1, "description_pl": 1 }',
  },
  {
    id: 'images_only',
    label: 'Images only',
    value: '{ "id": 1, "images": 1, "imageUrls": 1 }',
  },
  {
    id: 'listing_overview',
    label: 'Listing overview',
    value: '{ "id": 1, "sku": 1, "name_en": 1, "status": 1, "createdAt": 1 }',
  },
];

const toPrismaProjectionValue = (value: string): string => {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const next: Record<string, boolean> = {};
    Object.entries(parsed).forEach(([key, val]) => {
      if (val === 1 || val === true) next[key] = true;
    });
    return JSON.stringify(next, null, 2);
  } catch {
    return value;
  }
};

const PRISMA_PROJECTION_PRESETS: LabeledPreset[] = PROJECTION_PRESETS.map((preset: LabeledPreset) => ({
  ...preset,
  value: toPrismaProjectionValue(preset.value),
}));

const READ_QUERY_TYPES: SnippetItem[] = [
  {
    label: 'Find (filter)',
    value: '{\n  "status": "active"\n}',
  },
  {
    label: 'Aggregation pipeline',
    value:
      '[\n  { "$match": { "status": "active" } },\n  { "$group": { "_id": "$category", "count": { "$sum": 1 } } }\n]',
  },
  {
    label: 'Text search ($text)',
    value: '{\n  "$text": { "$search": "search terms" }\n}',
  },
  {
    label: 'Atlas Search ($search stage)',
    value:
      '[\n  { "$search": { "index": "default", "text": { "query": "search terms", "path": "name" } } }\n]',
    note: 'Atlas only',
  },
  {
    label: 'Geospatial ($near)',
    value:
      '{\n  "location": {\n    "$near": {\n      "$geometry": { "type": "Point", "coordinates": [0, 0] },\n      "$maxDistance": 1000\n    }\n  }\n}',
  },
  {
    label: 'Change stream (watch pipeline)',
    value:
      '[\n  { "$match": { "operationType": "insert" } }\n]',
    disabled: true,
    note: 'Not supported in UI runtime',
  },
];

const PRISMA_READ_QUERY_TYPES: SnippetItem[] = [
  {
    label: 'Find (where)',
    value: '{\n  "status": "active"\n}',
  },
  {
    label: 'Contains (case-insensitive)',
    value: '{\n  "name_en": { "contains": "{{value}}", "mode": "insensitive" }\n}',
  },
  {
    label: 'In list',
    value: '{\n  "sku": { "in": ["A", "B"] }\n}',
  },
  {
    label: 'Relation filter',
    value: '{\n  "catalogs": { "some": { "catalogId": "{{value}}" } }\n}',
  },
  {
    label: 'Date range',
    value: '{\n  "createdAt": { "gte": "{{value}}", "lte": "{{value}}" }\n}',
  },
];

const QUERY_OPERATOR_GROUPS: SnippetGroup[] = [
  {
    label: 'Comparison',
    items: [
      { label: '$eq', value: '{ "field": { "$eq": "{{value}}" } }' },
      { label: '$ne', value: '{ "field": { "$ne": "{{value}}" } }' },
      { label: '$gt', value: '{ "field": { "$gt": 10 } }' },
      { label: '$gte', value: '{ "field": { "$gte": 10 } }' },
      { label: '$lt', value: '{ "field": { "$lt": 10 } }' },
      { label: '$lte', value: '{ "field": { "$lte": 10 } }' },
      { label: '$in', value: '{ "field": { "$in": ["a", "b"] } }' },
      { label: '$nin', value: '{ "field": { "$nin": ["a", "b"] } }' },
    ],
  },
  {
    label: 'Logical',
    items: [
      { label: '$and', value: '{ "$and": [ { "a": 1 }, { "b": 2 } ] }' },
      { label: '$or', value: '{ "$or": [ { "a": 1 }, { "b": 2 } ] }' },
      { label: '$not', value: '{ "field": { "$not": { "$regex": "pattern" } } }' },
      { label: '$nor', value: '{ "$nor": [ { "a": 1 }, { "b": 2 } ] }' },
    ],
  },
  {
    label: 'Existence / Type',
    items: [
      { label: '$exists', value: '{ "field": { "$exists": true } }' },
      { label: '$type', value: '{ "field": { "$type": "string" } }' },
    ],
  },
  {
    label: 'Evaluation',
    items: [
      { label: '$expr', value: '{ "$expr": { "$gt": ["$price", 10] } }' },
      { label: '$regex', value: '{ "field": { "$regex": "pattern", "$options": "i" } }' },
      { label: '$mod', value: '{ "field": { "$mod": [4, 0] } }' },
      { label: '$where', value: '{ "$where": "this.price > 10" }' },
    ],
  },
  {
    label: 'Array',
    items: [
      { label: '$all', value: '{ "tags": { "$all": ["a", "b"] } }' },
      { label: '$elemMatch', value: '{ "scores": { "$elemMatch": { "$gt": 80, "$lt": 90 } } }' },
      { label: '$size', value: '{ "tags": { "$size": 3 } }' },
    ],
  },
  {
    label: 'Bitwise',
    items: [
      { label: '$bitsAllSet', value: '{ "flags": { "$bitsAllSet": 7 } }' },
      { label: '$bitsAnySet', value: '{ "flags": { "$bitsAnySet": 7 } }' },
      { label: '$bitsAllClear', value: '{ "flags": { "$bitsAllClear": 7 } }' },
      { label: '$bitsAnyClear', value: '{ "flags": { "$bitsAnyClear": 7 } }' },
    ],
  },
  {
    label: 'Geospatial',
    items: [
      { label: '$geoWithin', value: '{ "loc": { "$geoWithin": { "$centerSphere": [[0, 0], 0.1] } } }' },
      { label: '$geoIntersects', value: '{ "loc": { "$geoIntersects": { "$geometry": { "type": "Point", "coordinates": [0, 0] } } } }' },
      { label: '$near', value: '{ "loc": { "$near": { "$geometry": { "type": "Point", "coordinates": [0, 0] }, "$maxDistance": 1000 } } }' },
      { label: '$nearSphere', value: '{ "loc": { "$nearSphere": { "$geometry": { "type": "Point", "coordinates": [0, 0] }, "$maxDistance": 1000 } } }' },
    ],
  },
  {
    label: 'Text',
    items: [{ label: '$text', value: '{ "$text": { "$search": "search terms" } }' }],
  },
];

const PRISMA_QUERY_OPERATOR_GROUPS: SnippetGroup[] = [
  {
    label: 'Comparison',
    items: [
      { label: 'equals', value: '{ "field": { "equals": "{{value}}" } }' },
      { label: 'not', value: '{ "field": { "not": "{{value}}" } }' },
      { label: 'in', value: '{ "field": { "in": ["a", "b"] } }' },
      { label: 'notIn', value: '{ "field": { "notIn": ["a", "b"] } }' },
      { label: 'gt', value: '{ "field": { "gt": 10 } }' },
      { label: 'gte', value: '{ "field": { "gte": 10 } }' },
      { label: 'lt', value: '{ "field": { "lt": 10 } }' },
      { label: 'lte', value: '{ "field": { "lte": 10 } }' },
    ],
  },
  {
    label: 'String',
    items: [
      { label: 'contains', value: '{ "field": { "contains": "{{value}}" } }' },
      { label: 'startsWith', value: '{ "field": { "startsWith": "{{value}}" } }' },
      { label: 'endsWith', value: '{ "field": { "endsWith": "{{value}}" } }' },
      { label: 'mode insensitive', value: '{ "field": { "contains": "{{value}}", "mode": "insensitive" } }' },
    ],
  },
  {
    label: 'Logical',
    items: [
      { label: 'AND', value: '{ "AND": [ { "field": { "contains": "{{value}}" } }, { "field": { "contains": "{{value2}}" } } ] }' },
      { label: 'OR', value: '{ "OR": [ { "field": { "contains": "{{value}}" } }, { "field": { "contains": "{{value2}}" } } ] }' },
      { label: 'NOT', value: '{ "NOT": { "field": { "contains": "{{value}}" } } }' },
    ],
  },
  {
    label: 'Array',
    items: [
      { label: 'has', value: '{ "field": { "has": "{{value}}" } }' },
      { label: 'hasSome', value: '{ "field": { "hasSome": ["a", "b"] } }' },
      { label: 'hasEvery', value: '{ "field": { "hasEvery": ["a", "b"] } }' },
      { label: 'isEmpty', value: '{ "field": { "isEmpty": true } }' },
    ],
  },
  {
    label: 'Relation',
    items: [
      { label: 'some', value: '{ "relation": { "some": { "id": "{{value}}" } } }' },
      { label: 'every', value: '{ "relation": { "every": { "id": "{{value}}" } } }' },
      { label: 'none', value: '{ "relation": { "none": { "id": "{{value}}" } } }' },
    ],
  },
];

const UPDATE_OPERATOR_GROUPS: SnippetGroup[] = [
  {
    label: 'Field updates',
    items: [
      { label: '$set', value: '{ "$set": { "field": "{{value}}" } }' },
      { label: '$unset', value: '{ "$unset": { "field": "" } }' },
      { label: '$rename', value: '{ "$rename": { "oldField": "newField" } }' },
      { label: '$setOnInsert', value: '{ "$setOnInsert": { "field": "value" } }' },
    ],
  },
  {
    label: 'Numeric',
    items: [
      { label: '$inc', value: '{ "$inc": { "count": 1 } }' },
      { label: '$mul', value: '{ "$mul": { "price": 1.1 } }' },
      { label: '$min', value: '{ "$min": { "price": 10 } }' },
      { label: '$max', value: '{ "$max": { "price": 100 } }' },
    ],
  },
  {
    label: 'Array updates',
    items: [
      { label: '$push', value: '{ "$push": { "tags": "new" } }' },
      { label: '$addToSet', value: '{ "$addToSet": { "tags": "new" } }' },
      { label: '$pop', value: '{ "$pop": { "tags": 1 } }' },
      { label: '$pull', value: '{ "$pull": { "tags": "old" } }' },
      { label: '$pullAll', value: '{ "$pullAll": { "tags": ["a", "b"] } }' },
    ],
  },
  {
    label: 'Bitwise update',
    items: [{ label: '$bit', value: '{ "$bit": { "flags": { "and": 5 } } }' }],
  },
  {
    label: 'Date/time',
    items: [{ label: '$currentDate', value: '{ "$currentDate": { "updatedAt": true } }' }],
  },
  {
    label: 'Positional',
    items: [
      { label: '$', value: '{ "$set": { "items.$.status": "ok" } }' },
      { label: '$[]', value: '{ "$set": { "items.$[].status": "ok" } }' },
      { label: '$[<id>]', value: '{ "$set": { "items.$[item].status": "ok" } }' },
    ],
  },
  {
    label: 'Pipeline update',
    items: [
      {
        label: 'Pipeline',
        value: '[\n  { "$set": { "field": "value" } }\n]',
      },
    ],
  },
];

const PRISMA_UPDATE_OPERATOR_GROUPS: SnippetGroup[] = [
  {
    label: 'Field updates',
    items: [
      { label: 'set', value: '{ "field": { "set": "{{value}}" } }' },
      { label: 'unset (set null)', value: '{ "field": { "set": null } }' },
    ],
  },
  {
    label: 'Numeric',
    items: [
      { label: 'increment', value: '{ "field": { "increment": 1 } }' },
      { label: 'decrement', value: '{ "field": { "decrement": 1 } }' },
      { label: 'multiply', value: '{ "field": { "multiply": 2 } }' },
    ],
  },
  {
    label: 'Array / List',
    items: [
      { label: 'push', value: '{ "field": { "push": "{{value}}" } }' },
      { label: 'set list', value: '{ "field": { "set": ["a", "b"] } }' },
    ],
  },
  {
    label: 'Relations',
    items: [
      { label: 'connect', value: '{ "relation": { "connect": { "id": "{{value}}" } } }' },
      { label: 'disconnect', value: '{ "relation": { "disconnect": { "id": "{{value}}" } } }' },
    ],
  },
];

const AGGREGATION_STAGE_SNIPPETS: SnippetItem[] = [
  { label: '$match', value: '{ "$match": { "status": "active" } }' },
  { label: '$project', value: '{ "$project": { "field": 1 } }' },
  { label: '$addFields / $set', value: '{ "$addFields": { "field": "value" } }' },
  { label: '$unset', value: '{ "$unset": "field" }' },
  { label: '$sort', value: '{ "$sort": { "createdAt": -1 } }' },
  { label: '$skip', value: '{ "$skip": 10 }' },
  { label: '$limit', value: '{ "$limit": 10 }' },
  { label: '$group', value: '{ "$group": { "_id": "$category", "count": { "$sum": 1 } } }' },
  { label: '$count', value: '{ "$count": "total" }' },
  { label: '$bucket', value: '{ "$bucket": { "groupBy": "$price", "boundaries": [0, 50, 100], "default": "other" } }' },
  { label: '$bucketAuto', value: '{ "$bucketAuto": { "groupBy": "$price", "buckets": 5 } }' },
  { label: '$facet', value: '{ "$facet": { "byCategory": [ { "$group": { "_id": "$category", "count": { "$sum": 1 } } } ] } }' },
  { label: '$lookup', value: '{ "$lookup": { "from": "other", "localField": "id", "foreignField": "refId", "as": "joined" } }' },
  { label: '$graphLookup', value: '{ "$graphLookup": { "from": "nodes", "startWith": "$parentId", "connectFromField": "parentId", "connectToField": "_id", "as": "tree" } }' },
  { label: '$unwind', value: '{ "$unwind": "$items" }' },
  { label: '$replaceRoot / $replaceWith', value: '{ "$replaceRoot": { "newRoot": "$item" } }' },
  { label: '$unionWith', value: '{ "$unionWith": "otherCollection" }' },
  { label: '$out', value: '{ "$out": "targetCollection" }' },
  { label: '$merge', value: '{ "$merge": "targetCollection" }' },
];

const PRISMA_AGGREGATION_STAGE_SNIPPETS: SnippetItem[] = [];

const buildPresetQueryTemplate = (queryConfig: DbQueryConfig): string => {
  const preset = queryConfig.preset;
  let field = '_id';
  let valuePlaceholder = '{{value}}';
  if (preset === 'by_productId') {
    field = 'productId';
    valuePlaceholder = '{{productId}}';
  } else if (preset === 'by_entityId') {
    field = 'entityId';
    valuePlaceholder = '{{entityId}}';
  } else if (preset === 'by_field') {
    field = queryConfig.field?.trim() || 'field';
    valuePlaceholder = '{{value}}';
  } else if (preset === 'by_id') {
    field = queryConfig.idType === 'objectId' ? '_id' : 'id';
    valuePlaceholder = '{{value}}';
  }
  return `\n{\n  \"${field}\": \"${valuePlaceholder}\"\n}`.trim();
};

export {
  PLACEHOLDER_CHIPS,
  TEMPLATE_SNIPPETS,
  PRISMA_TEMPLATE_SNIPPETS,
  SORT_PRESETS,
  PRISMA_SORT_PRESETS,
  PROJECTION_PRESETS,
  PRISMA_PROJECTION_PRESETS,
  READ_QUERY_TYPES,
  PRISMA_READ_QUERY_TYPES,
  QUERY_OPERATOR_GROUPS,
  PRISMA_QUERY_OPERATOR_GROUPS,
  UPDATE_OPERATOR_GROUPS,
  PRISMA_UPDATE_OPERATOR_GROUPS,
  AGGREGATION_STAGE_SNIPPETS,
  PRISMA_AGGREGATION_STAGE_SNIPPETS,
  buildPresetQueryTemplate,
};
