import type {
  DatabaseTypeDto,
  SqlQueryFieldDto,
  SqlQueryResultDto,
  FieldInfoDto,
  CollectionSchemaDto,
  DatabasePresetOptionDto,
  DatabaseNodeConfigDto,
  AiQueryDto,
} from '@/shared/contracts/database';

export type DatabaseType = DatabaseTypeDto;

export type SqlQueryField = SqlQueryFieldDto;

export type SqlQueryResult = SqlQueryResultDto;

export type FieldSchema = FieldInfoDto;

export type CollectionSchema = CollectionSchemaDto;

type ProviderSourceSchema = {
  provider: 'mongodb' | 'prisma';
  collections: CollectionSchema[];
};

export type SchemaData = {
  collections: CollectionSchema[];
  provider: 'mongodb' | 'prisma' | 'multi';
  sources?: Partial<Record<'mongodb' | 'prisma', ProviderSourceSchema | null | undefined>> | undefined;
};

export type DatabasePresetOption = DatabasePresetOptionDto;

export type DatabaseNodeConfig = DatabaseNodeConfigDto;

export type AiQuery = AiQueryDto;
