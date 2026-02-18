import type {
  DatabaseTypeDto,
  SqlQueryFieldDto,
  SqlQueryResultDto
} from '@/shared/contracts/database';

export type DatabaseType = DatabaseTypeDto;

export type SqlQueryField = SqlQueryFieldDto;

export type SqlQueryResult = SqlQueryResultDto;

export type FieldSchema = {
  name: string;
  type: string;
  nullable?: boolean | null | undefined;
  isRequired?: boolean | null | undefined;
  isId?: boolean | null | undefined;
  isUnique?: boolean | null | undefined;
  hasDefault?: boolean | null | undefined;
  relationTo?: string | null | undefined;
};

export type CollectionSchema = {
  name: string;
  fields: FieldSchema[];
  provider?: 'mongodb' | 'prisma' | undefined;
  relations?: string[] | undefined;
  documentCount?: number | undefined;
};

type ProviderSourceSchema = {
  provider: 'mongodb' | 'prisma';
  collections: CollectionSchema[];
};

export type SchemaData = {
  collections: CollectionSchema[];
  provider: 'mongodb' | 'prisma' | 'multi';
  sources?: Partial<Record<'mongodb' | 'prisma', ProviderSourceSchema | null | undefined>> | undefined;
};

export type DatabasePresetOption = {
  id: string;
  label: string;
  description: string;
};

export interface DatabaseNodeConfig {
  type: DatabaseType;
  operation: 'query' | 'insert' | 'update' | 'delete' | 'schema';
  sql?: string;
  collection?: string;
  filter?: string;
  update?: string;
  document?: string;
  variableName?: string;
}

export type AiQuery = {
  id: string;
  query: string;
  timestamp: string;
};
