import { DtoBase } from '../types/base';

// Database DTOs
export interface DatabaseInfoDto {
  name: string;
  type: 'postgresql' | 'mongodb';
  size: string;
  tables: number;
  lastBackup: string | null;
  status: 'healthy' | 'warning' | 'error';
}

export interface DatabaseBackupDto extends DtoBase {
  name: string;
  type: 'postgresql' | 'mongodb';
  size: string;
  path: string;
  status: 'completed' | 'failed' | 'in_progress';
}

export interface DatabaseRestoreDto {
  backupId: string;
  targetDatabase: string;
  options?: Record<string, unknown>;
}

export interface CreateBackupDto {
  name?: string;
  type: 'postgresql' | 'mongodb';
  options?: Record<string, unknown>;
}

export interface DatabaseSchemaDto {
  tables: DatabaseTableDto[];
  indexes: DatabaseIndexDto[];
  constraints: DatabaseConstraintDto[];
}

export interface DatabaseTableDto {
  name: string;
  columns: DatabaseColumnDto[];
  rowCount: number;
  size: string;
}

export interface DatabaseColumnDto {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue: string | null;
  isPrimaryKey: boolean;
}

export interface DatabaseIndexDto {
  name: string;
  table: string;
  columns: string[];
  unique: boolean;
}

export interface DatabaseConstraintDto {
  name: string;
  table: string;
  type: 'primary_key' | 'foreign_key' | 'unique' | 'check';
  definition: string;
}

// Database Schema Introspection DTOs
export interface FieldInfoDto {
  name: string;
  type: string;
  isRequired?: boolean | null;
  isId?: boolean | null;
  isUnique?: boolean | null;
  hasDefault?: boolean | null;
  relationTo?: string | null;
}

export interface CollectionSchemaDto {
  name: string;
  fields: FieldInfoDto[];
  relations?: string[];
}

export type SchemaProviderDto = 'mongodb' | 'prisma';

export interface SchemaResponseDto {
  provider: SchemaProviderDto;
  collections: CollectionSchemaDto[];
}

export interface MultiSchemaResponseDto {
  provider: 'multi';
  collections: Array<CollectionSchemaDto & { provider: SchemaProviderDto }>;
  sources: Partial<Record<SchemaProviderDto, SchemaResponseDto>>;
}

export type SchemaResponsePayloadDto = SchemaResponseDto | MultiSchemaResponseDto;

export interface DatabaseBrowseParamsDto {
  collection: string;
  limit?: number;
  skip?: number;
  query?: string;
  provider?: SchemaProviderDto;
}

export interface DatabaseBrowseDto {
  provider: SchemaProviderDto;
  collection: string;
  documents: Record<string, unknown>[];
  total: number;
  limit: number;
  skip: number;
}

export interface BrowseResponseDto {
  total: number;
  items: Record<string, unknown>[];
  fields: string[];
}
