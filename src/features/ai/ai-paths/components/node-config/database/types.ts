export type FieldSchema = { name: string; type: string };

export type CollectionSchema = {
  name: string;
  fields: FieldSchema[];
  relations?: string[];
  provider?: 'mongodb' | 'prisma';
};

export type SchemaData = {
  provider: 'mongodb' | 'prisma' | 'multi';
  collections: CollectionSchema[];
  sources?: Partial<Record<'mongodb' | 'prisma', { provider: 'mongodb' | 'prisma'; collections: CollectionSchema[] }>>;
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
