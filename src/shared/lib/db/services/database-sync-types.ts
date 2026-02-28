import type { ObjectId } from 'mongodb';

export const AUTH_COLLECTIONS: readonly string[] = [
  'users',
  'accounts',
  'sessions',
  'verification_tokens',
  'auth_security_profiles',
  'auth_login_challenges',
  'auth_security_attempts',
];

export const currencyCodes = new Set(['USD', 'EUR', 'PLN', 'GBP', 'SEK']);
export const countryCodes = new Set(['PL', 'DE', 'GB', 'US', 'SE']);

export interface MongoSettingDoc {
  _id?: ObjectId;
  key?: string;
  value?: unknown;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface MongoUserDoc {
  _id?: ObjectId;
  id?: string;
  name?: string | null;
  email?: string | null;
  emailVerified?: Date | string | null;
  image?: string | null;
  passwordHash?: string | null;
}

export interface MongoAccountDoc {
  _id?: ObjectId;
  id?: string;
  userId?: string | ObjectId;
  type?: string;
  provider?: string;
  providerAccountId?: string;
  refresh_token?: string | null;
  access_token?: string | null;
  expires_at?: number | null;
  token_type?: string | null;
  scope?: string | null;
  id_token?: string | null;
  session_state?: string | null;
}

export interface MongoAuthSecurityProfileDoc {
  _id?: ObjectId;
  id?: string;
  userId?: string;
  mfaEnabled?: boolean;
  mfaSecret?: string | null;
  recoveryCodes?: string[];
  allowedIps?: string[];
  disabledAt?: Date | string | null;
  bannedAt?: Date | string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface MongoUserPreferencesDoc {
  _id?: ObjectId;
  id?: string;
  userId?: string;
  productListNameLocale?: string | null;
  productListCatalogFilter?: string | null;
  productListCurrencyCode?: string | null;
  productListPageSize?: number | null;
  productListThumbnailSource?: string | null;
  aiPathsActivePathId?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface MongoSystemLogDoc {
  _id?: ObjectId;
  level?: string;
  message?: string;
  source?: string | null;
  context?: unknown;
  stack?: string | null;
  path?: string | null;
  method?: string | null;
  statusCode?: number | null;
  requestId?: string | null;
  userId?: string | null;
  createdAt?: Date | string;
}

export interface MongoFileUploadEventDoc {
  _id?: ObjectId;
  status?: string;
  category?: string | null;
  projectId?: string | null;
  folder?: string | null;
  filename?: string | null;
  filepath?: string | null;
  mimetype?: string | null;
  size?: number;
  source?: string | null;
  errorMessage?: string | null;
  requestId?: string | null;
  userId?: string | null;
  meta?: unknown;
  createdAt?: Date | string;
}

export interface MongoAiConfigurationDoc {
  _id?: ObjectId;
  type?: string | null;
  descriptionGenerationModel?: string | null;
  generationInputPrompt?: string | null;
  generationOutputEnabled?: boolean;
  generationOutputPrompt?: string | null;
  imageAnalysisModel?: string | null;
  visionInputPrompt?: string | null;
  visionOutputEnabled?: boolean;
  visionOutputPrompt?: string | null;
  testProductId?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface MongoChatbotMessageDoc {
  role: string;
  content: string;
  createdAt?: Date | string;
}

export interface MongoChatbotSessionDoc {
  _id?: ObjectId;
  title?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  messages?: MongoChatbotMessageDoc[];
}

export interface MongoChatbotJobDoc {
  _id?: ObjectId;
  sessionId?: string;
  status?: string;
  model?: string | null;
  payload?: unknown;
  resultText?: string | null;
  errorMessage?: string | null;
  createdAt?: Date | string;
  startedAt?: Date | string | null;
  finishedAt?: Date | string | null;
}

export interface MongoSessionDoc {
  _id?: ObjectId;
  id?: string;
  userId?: string | ObjectId;
  sessionToken?: string;
  expires?: Date | string;
}

export interface MongoVerificationTokenDoc {
  identifier?: string;
  token?: string;
  expires?: Date | string;
}

export interface MongoCurrencyDoc {
  _id?: ObjectId;
  id?: string;
  code?: string;
  name?: string;
  symbol?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MongoCountryDoc {
  _id?: ObjectId;
  id?: string;
  code?: string;
  name?: string;
  createdAt?: Date;
  updatedAt?: Date;
  currencyIds?: string[];
}

export interface MongoLanguageDoc {
  _id?: ObjectId;
  id?: string;
  code?: string;
  name?: string;
  nativeName?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  countries?: Array<{ countryId: string }>;
}

export interface MongoPriceGroupDoc {
  _id?: ObjectId;
  id?: string;
  groupId?: string;
  isDefault?: boolean;
  name?: string;
  description?: string | null;
  currencyId?: string;
  type?: string;
  basePriceField?: string;
  sourceGroupId?: string | null;
  priceMultiplier?: number;
  addToPrice?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MongoCatalogDoc {
  _id?: ObjectId;
  id?: string;
  name?: string;
  description?: string | null;
  isDefault?: boolean;
  defaultLanguageId?: string | null;
  defaultPriceGroupId?: string | null;
  priceGroupIds?: string[];
  createdAt?: Date;
  updatedAt?: Date;
  languageIds?: string[];
}

export interface MongoProductParameterDoc {
  _id?: ObjectId | string;
  id?: string;
  catalogId?: string;
  name_en?: string;
  name_pl?: string | null;
  name_de?: string | null;
  selectorType?: string;
  optionLabels?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MongoProducerDoc {
  _id?: ObjectId;
  id?: string;
  name?: string;
  website?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface MongoImageFileDoc {
  _id?: ObjectId;
  id?: string;
  filename?: string;
  filepath?: string;
  mimetype?: string;
  size?: number;
  width?: number | null;
  height?: number | null;
  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MongoImageStudioSlotDoc {
  _id?: ObjectId;
  id?: string;
  projectId?: string;
  name?: string | null;
  folderPath?: string | null;
  position?: number | null;
  imageFileId?: string | null;
  imageUrl?: string | null;
  imageBase64?: string | null;
  asset3dId?: string | null;
  screenshotFileId?: string | null;
  metadata?: unknown;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface MongoTagDoc {
  _id?: ObjectId;
  id?: string;
  name?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MongoCategoryDoc {
  _id?: ObjectId;
  id?: string;
  catalogId?: string;
  parentId?: string | null;
  name_en?: string;
  name_pl?: string | null;
  name_de?: string | null;
  description_en?: string | null;
  description_pl?: string | null;
  description_de?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MongoProductDoc {
  _id?: ObjectId;
  id?: string;
  sku?: string | null;
  baseProductId?: string | null;
  defaultPriceGroupId?: string | null;
  ean?: string | null;
  gtin?: string | null;
  asin?: string | null;
  name_en?: string | null;
  name_pl?: string | null;
  name_de?: string | null;
  description_en?: string | null;
  description_pl?: string | null;
  description_de?: string | null;
  supplierName?: string | null;
  supplierLink?: string | null;
  priceComment?: string | null;
  stock?: number | null;
  price?: number | null;
  sizeLength?: number | null;
  sizeWidth?: number | null;
  weight?: number | null;
  length?: number | null;
  parameters?: Array<{
    parameterId: string;
    value_en?: string;
    value_pl?: string;
    value_de?: string;
  }>;
  imageLinks?: string[];
  imageBase64s?: string[];
  createdAt?: Date;
  updatedAt?: Date;
  images?: Array<{ imageFileId: string; assignedAt?: Date }>;
  catalogs?: Array<{ catalogId: string; assignedAt?: Date }>;
  categoryId?: string | null;
  categories?: Array<{ categoryId: string; assignedAt?: Date }>;
  tags?: Array<{ tagId: string; assignedAt?: Date }>;
  producers?: Array<{ producerId: string; assignedAt?: Date }>;
}
