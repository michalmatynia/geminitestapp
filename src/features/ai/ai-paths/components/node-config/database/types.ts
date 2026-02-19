import type {
  DatabaseTypeDto,
  SqlQueryFieldDto,
  SqlQueryResultDto,
  FieldInfoDto,
  CollectionSchemaDto,
  DatabasePresetOptionDto,
  DatabaseNodeConfigDto,
  AiQueryDto,
  SchemaDataDto,
  SchemaProviderDto,
} from '@/shared/contracts/database';

export type DatabaseType = DatabaseTypeDto;

export type SqlQueryField = SqlQueryFieldDto;

export type SqlQueryResult = SqlQueryResultDto;

export type FieldSchema = FieldInfoDto;

export type CollectionSchema = CollectionSchemaDto & {
  provider?: SchemaProviderDto;
};

export type SchemaData = SchemaDataDto;

export type DatabasePresetOption = DatabasePresetOptionDto;

export type DatabaseNodeConfig = DatabaseNodeConfigDto;

export type AiQuery = AiQueryDto;
