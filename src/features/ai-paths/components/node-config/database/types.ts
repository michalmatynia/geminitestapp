export type SchemaData = {
  provider: string;
  collections: Array<{
    name: string;
    fields: Array<{ name: string; type: string }>;
    relations?: string[];
  }>;
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
