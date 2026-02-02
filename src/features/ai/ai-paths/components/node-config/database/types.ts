export type FieldSchema = { name: string; type: string };

export type CollectionSchema = {
  name: string;
  fields: FieldSchema[];
  relations?: string[];
};

export type SchemaData = {
  provider: string;
  collections: CollectionSchema[];
};

export type AiQuery = {
  id: string;
  query: string;
  timestamp: string;
};

export type DatabasePresetOption = {
  id: string;
  label: string;
  description: string;
};
