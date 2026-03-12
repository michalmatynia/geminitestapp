/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-redeclare */
class RemovedPrismaClientKnownRequestError extends Error {
  code: string;

  constructor(message = 'Prisma has been removed.', options?: { code?: string }) {
    super(message);
    this.name = 'PrismaClientKnownRequestError';
    this.code = options?.code ?? 'PRISMA_REMOVED';
  }
}

type LooseModel = Record<string, any>;

export namespace Prisma {
  export type InputJsonValue = unknown;
  export type JsonValue = unknown;
  export type NullableJsonNullValueInput = null;
  export type TransactionClient = any;
  export type PrismaClientKnownRequestError = InstanceType<
    typeof RemovedPrismaClientKnownRequestError
  >;

  export type AgentLongTermMemoryGetPayload<T = unknown> = T extends never ? never : any;
  export type AgentMemoryItemGetPayload<T = unknown> = T extends never ? never : any;
  export type ChatbotMessageGetPayload<T = unknown> = T extends never ? never : any;
  export type ChatbotSessionGetPayload<T = unknown> = T extends never ? never : any;
  export type ChatbotSettingsGetPayload<T = unknown> = T extends never ? never : any;
  export type DraftGetPayload<T = unknown> = T extends never ? never : any;
  export type ExternalCategoryGetPayload<T = unknown> = T extends never ? never : any;
  export type ExternalProducerGetPayload<T = unknown> = T extends never ? never : any;
  export type ExternalTagGetPayload<T = unknown> = T extends never ? never : any;
  export type ProducerMappingGetPayload<T = unknown> = T extends never ? never : any;
  export type ProductDraftGetPayload<T = unknown> = T extends never ? never : any;
  export type ProductGetPayload<T = unknown> = T extends never ? never : any;
  export type ProductListingGetPayload<T = unknown> = T extends never ? never : any;
  export type TagMappingGetPayload<T = unknown> = T extends never ? never : any;

  export type CountryUpdateInput = Record<string, unknown>;
  export type LanguageUpdateInput = Record<string, unknown>;
  export type PriceGroupUncheckedUpdateInput = Record<string, unknown>;
  export type ProductDraftCreateInput = Record<string, unknown>;
  export type ProductDraftUpdateInput = Record<string, unknown>;
  export type ProductListingUpdateInput = Record<string, unknown>;
  export type FileUploadEventWhereInput = Record<string, unknown>;
  export type SystemLogWhereInput = Record<string, any>;
  export type SystemLogCountArgs = { where?: SystemLogWhereInput };

  export type AuthLoginChallengeCreateManyInput = Record<string, unknown>;
  export type AuthSecurityAttemptCreateManyInput = Record<string, unknown>;
  export type AccountCreateManyInput = Record<string, unknown>;
  export type AuthSecurityProfileCreateManyInput = Record<string, unknown>;
  export type SessionCreateManyInput = Record<string, unknown>;
  export type UserCreateManyInput = Record<string, unknown>;
  export type VerificationTokenCreateManyInput = Record<string, unknown>;
  export type CatalogCreateManyInput = Record<string, unknown>;
  export type CatalogLanguageCreateManyInput = Record<string, unknown>;
  export type PriceGroupCreateManyInput = Record<string, unknown>;
  export type ProducerCreateManyInput = Record<string, unknown>;
  export type ProductCategoryCreateManyInput = Record<string, unknown>;
  export type ProductParameterCreateManyInput = Record<string, unknown>;
  export type ProductTagCreateManyInput = Record<string, unknown>;
  export type ChatbotJobCreateManyInput = Record<string, unknown>;
  export type ChatbotMessageCreateManyInput = Record<string, unknown>;
  export type ChatbotSessionCreateManyInput = Record<string, unknown>;
  export type CmsDomainCreateManyInput = Record<string, unknown>;
  export type CmsDomainSlugCreateManyInput = Record<string, unknown>;
  export type CmsThemeCreateManyInput = Record<string, unknown>;
  export type PageComponentCreateManyInput = Record<string, unknown>;
  export type PageCreateManyInput = Record<string, unknown>;
  export type PageSlugCreateManyInput = Record<string, unknown>;
  export type SlugCreateManyInput = Record<string, unknown>;
  export type CountryCreateManyInput = Record<string, unknown>;
  export type CountryCurrencyCreateManyInput = Record<string, unknown>;
  export type CurrencyCreateManyInput = Record<string, unknown>;
  export type LanguageCountryCreateManyInput = Record<string, unknown>;
  export type LanguageCreateManyInput = Record<string, unknown>;
  export type ImageFileCreateManyInput = Record<string, unknown>;
  export type ImageStudioSlotCreateManyInput = Record<string, unknown>;
  export type IntegrationCreateManyInput = Record<string, unknown>;
  export type CategoryCreateManyInput = Record<string, unknown>;
  export type NoteCategoryCreateManyInput = Record<string, unknown>;
  export type NoteCreateManyInput = Record<string, unknown>;
  export type NoteFileCreateManyInput = Record<string, unknown>;
  export type NoteRelationCreateManyInput = Record<string, unknown>;
  export type NoteTagCreateManyInput = Record<string, unknown>;
  export type NotebookCreateManyInput = Record<string, unknown>;
  export type TagCreateManyInput = Record<string, unknown>;
  export type ThemeCreateManyInput = Record<string, unknown>;
  export type ProductCatalogCreateManyInput = Record<string, unknown>;
  export type ProductCategoryAssignmentCreateManyInput = Record<string, unknown>;
  export type ProductCreateManyInput = Record<string, unknown>;
  export type ProductImageCreateManyInput = Record<string, unknown>;
  export type ProductProducerAssignmentCreateManyInput = Record<string, unknown>;
  export type ProductTagAssignmentCreateManyInput = Record<string, unknown>;
  export type AiConfigurationCreateManyInput = Record<string, unknown>;
  export type FileUploadEventCreateManyInput = Record<string, unknown>;
  export type SystemLogCreateManyInput = Record<string, unknown>;
  export type UserPreferencesCreateManyInput = Record<string, unknown>;
  export type AiPathRunCreateManyInput = Record<string, unknown>;
  export type AiPathRunEventCreateManyInput = Record<string, unknown>;
  export type AiPathRunNodeCreateManyInput = Record<string, unknown>;
  export type ProductAiJobCreateManyInput = Record<string, unknown>;
}

export class PrismaClient {
  constructor() {
    throw new Error('Prisma has been removed. The application is MongoDB-only.');
  }
}

export const Prisma = {
  DbNull: null,
  JsonNull: null,
  PrismaClientKnownRequestError: RemovedPrismaClientKnownRequestError,
} as const;

export const CurrencyCode = {} as Record<string, string>;
export const CountryCode = {} as Record<string, string>;
export const AiPathRunEventLevel = {} as Record<string, string>;
export const ProductAiJobStatus = {
  pending: 'pending',
  queued: 'queued',
  running: 'running',
  completed: 'completed',
  failed: 'failed',
  canceled: 'canceled',
} as const;

export type Catalog = LooseModel;
export type CmsDomain = LooseModel;
export type CmsTheme = LooseModel;
export type Currency = LooseModel;
export type FileUploadEvent = LooseModel;
export type ImageFile = LooseModel;
export type Notebook = LooseModel;
export type Page = LooseModel;
export type PageComponent = LooseModel;
export type Producer = LooseModel;
export type Product = LooseModel;
export type ProductAiJob = LooseModel;
export type ProductCatalog = LooseModel;
export type ProductCategory = LooseModel;
export type ProductImage = LooseModel;
export type ProductParameter = LooseModel;
export type ProductTag = LooseModel;
export type ProductValidationPattern = LooseModel;
export type Slug = LooseModel;
export type SystemLog = {
  id: string;
  level: 'error' | 'info' | 'warn';
  message: string;
  createdAt: Date;
  updatedAt?: Date | null;
  category?: string | null;
  source?: string | null;
  service?: string | null;
  context?: Record<string, unknown> | null;
  stack?: string | null;
  path?: string | null;
  method?: string | null;
  statusCode?: number | null;
  requestId?: string | null;
  traceId?: string | null;
  correlationId?: string | null;
  spanId?: string | null;
  parentSpanId?: string | null;
  userId?: string | null;
  [key: string]: any;
};
export type Tag = LooseModel;
export type Theme = LooseModel;
