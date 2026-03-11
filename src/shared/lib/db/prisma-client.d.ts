export declare namespace Prisma {
  const DbNull: null;
  const JsonNull: null;

  class PrismaClientKnownRequestError extends Error {
    code: string;
    constructor(message?: string, options?: { code?: string });
  }

  type InputJsonValue = unknown;
  type JsonValue = unknown;
  type NullableJsonNullValueInput = null;
  type TransactionClient = any;

  type AgentLongTermMemoryGetPayload<T = unknown> = any;
  type AgentMemoryItemGetPayload<T = unknown> = any;
  type ChatbotMessageGetPayload<T = unknown> = any;
  type ChatbotSessionGetPayload<T = unknown> = any;
  type ChatbotSettingsGetPayload<T = unknown> = any;
  type DraftGetPayload<T = unknown> = any;
  type ExternalCategoryGetPayload<T = unknown> = any;
  type ExternalProducerGetPayload<T = unknown> = any;
  type ExternalTagGetPayload<T = unknown> = any;
  type ProducerMappingGetPayload<T = unknown> = any;
  type ProductDraftGetPayload<T = unknown> = any;
  type ProductGetPayload<T = unknown> = any;
  type ProductListingGetPayload<T = unknown> = any;
  type TagMappingGetPayload<T = unknown> = any;

  type CountryUpdateInput = Record<string, unknown>;
  type LanguageUpdateInput = Record<string, unknown>;
  type PriceGroupUncheckedUpdateInput = Record<string, unknown>;
  type ProductDraftCreateInput = Record<string, unknown>;
  type ProductDraftUpdateInput = Record<string, unknown>;
  type ProductListingUpdateInput = Record<string, unknown>;
  type FileUploadEventWhereInput = Record<string, unknown>;
  type SystemLogWhereInput = Record<string, unknown>;
  type SystemLogCountArgs = Record<string, unknown>;

  type AuthLoginChallengeCreateManyInput = Record<string, unknown>;
  type AuthSecurityAttemptCreateManyInput = Record<string, unknown>;
  type AccountCreateManyInput = Record<string, unknown>;
  type AuthSecurityProfileCreateManyInput = Record<string, unknown>;
  type SessionCreateManyInput = Record<string, unknown>;
  type UserCreateManyInput = Record<string, unknown>;
  type VerificationTokenCreateManyInput = Record<string, unknown>;
  type CatalogCreateManyInput = Record<string, unknown>;
  type CatalogLanguageCreateManyInput = Record<string, unknown>;
  type PriceGroupCreateManyInput = Record<string, unknown>;
  type ProducerCreateManyInput = Record<string, unknown>;
  type ProductCategoryCreateManyInput = Record<string, unknown>;
  type ProductParameterCreateManyInput = Record<string, unknown>;
  type ProductTagCreateManyInput = Record<string, unknown>;
  type ChatbotJobCreateManyInput = Record<string, unknown>;
  type ChatbotMessageCreateManyInput = Record<string, unknown>;
  type ChatbotSessionCreateManyInput = Record<string, unknown>;
  type CmsDomainCreateManyInput = Record<string, unknown>;
  type CmsDomainSlugCreateManyInput = Record<string, unknown>;
  type CmsThemeCreateManyInput = Record<string, unknown>;
  type PageComponentCreateManyInput = Record<string, unknown>;
  type PageCreateManyInput = Record<string, unknown>;
  type PageSlugCreateManyInput = Record<string, unknown>;
  type SlugCreateManyInput = Record<string, unknown>;
  type CountryCreateManyInput = Record<string, unknown>;
  type CountryCurrencyCreateManyInput = Record<string, unknown>;
  type CurrencyCreateManyInput = Record<string, unknown>;
  type LanguageCountryCreateManyInput = Record<string, unknown>;
  type LanguageCreateManyInput = Record<string, unknown>;
  type ImageFileCreateManyInput = Record<string, unknown>;
  type ImageStudioSlotCreateManyInput = Record<string, unknown>;
  type IntegrationCreateManyInput = Record<string, unknown>;
  type CategoryCreateManyInput = Record<string, unknown>;
  type NoteCategoryCreateManyInput = Record<string, unknown>;
  type NoteCreateManyInput = Record<string, unknown>;
  type NoteFileCreateManyInput = Record<string, unknown>;
  type NoteRelationCreateManyInput = Record<string, unknown>;
  type NoteTagCreateManyInput = Record<string, unknown>;
  type NotebookCreateManyInput = Record<string, unknown>;
  type TagCreateManyInput = Record<string, unknown>;
  type ThemeCreateManyInput = Record<string, unknown>;
  type ProductCatalogCreateManyInput = Record<string, unknown>;
  type ProductCategoryAssignmentCreateManyInput = Record<string, unknown>;
  type ProductCreateManyInput = Record<string, unknown>;
  type ProductDraftCreateManyInput = Record<string, unknown>;
  type ProductImageCreateManyInput = Record<string, unknown>;
  type ProductProducerAssignmentCreateManyInput = Record<string, unknown>;
  type ProductTagAssignmentCreateManyInput = Record<string, unknown>;
  type AiConfigurationCreateManyInput = Record<string, unknown>;
  type FileUploadEventCreateManyInput = Record<string, unknown>;
  type SystemLogCreateManyInput = Record<string, unknown>;
  type UserPreferencesCreateManyInput = Record<string, unknown>;
  type AiPathRunCreateManyInput = Record<string, unknown>;
  type AiPathRunEventCreateManyInput = Record<string, unknown>;
  type AiPathRunNodeCreateManyInput = Record<string, unknown>;
  type ProductAiJobCreateManyInput = Record<string, unknown>;
}

export declare const Prisma: {
  DbNull: null;
  JsonNull: null;
  PrismaClientKnownRequestError: typeof Prisma.PrismaClientKnownRequestError;
};

export declare class PrismaClient {
  constructor(...args: unknown[]);
}

export type Catalog = Record<string, unknown>;
export type CmsDomain = Record<string, unknown>;
export type CmsTheme = Record<string, unknown>;
export type Currency = Record<string, unknown>;
export type FileUploadEvent = Record<string, unknown>;
export type ImageFile = Record<string, unknown>;
export type Notebook = Record<string, unknown>;
export type Page = Record<string, unknown>;
export type PageComponent = Record<string, unknown>;
export type Producer = Record<string, unknown>;
export type Product = Record<string, unknown>;
export type ProductAiJob = Record<string, unknown>;
export type ProductCatalog = Record<string, unknown>;
export type ProductCategory = Record<string, unknown>;
export type ProductImage = Record<string, unknown>;
export type ProductParameter = Record<string, unknown>;
export type ProductTag = Record<string, unknown>;
export type ProductValidationPattern = Record<string, unknown>;
export type Slug = Record<string, unknown>;
export type SystemLog = Record<string, unknown>;
export type Tag = Record<string, unknown>;
export type Theme = Record<string, unknown>;

export type CurrencyCode = string;
export declare const CurrencyCode: Record<string, string>;

export type CountryCode = string;
export declare const CountryCode: Record<string, string>;

export type AiPathRunEventLevel = string;
export declare const AiPathRunEventLevel: Record<string, string>;

export type ProductAiJobStatus = string;
export declare const ProductAiJobStatus: Record<string, string>;
