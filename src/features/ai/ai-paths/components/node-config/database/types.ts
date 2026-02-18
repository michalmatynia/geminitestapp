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
  nullable: boolean;
};

export type CollectionSchema = {
  name: string;
  fields: FieldSchema[];
  provider?: string;
};

export type SchemaData = {
  collections: CollectionSchema[];
  provider: string;
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
