import type {
  CollectionSchemaDto,
  FieldInfoDto,
  SchemaProviderDto,
} from '@/shared/dtos/database';
import type { DbSchemaSnapshot } from '@/shared/types/domain/ai-paths';

export type FieldSchema = Pick<FieldInfoDto, 'name' | 'type'>;

export type CollectionSchema = CollectionSchemaDto & {
  provider?: SchemaProviderDto;
};

type SchemaSnapshotMeta = Omit<DbSchemaSnapshot, 'provider' | 'collections' | 'sources'>;

type SchemaSource = {
  provider: SchemaProviderDto;
  collections: CollectionSchema[];
};

type SingleProviderSchemaData = SchemaSnapshotMeta & {
  provider: SchemaProviderDto;
  collections: CollectionSchema[];
};

type MultiProviderSchemaData = SchemaSnapshotMeta & {
  provider: 'multi';
  collections: CollectionSchema[];
  sources?: Partial<Record<SchemaProviderDto, SchemaSource>>;
};

export type SchemaData = SingleProviderSchemaData | MultiProviderSchemaData;

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
