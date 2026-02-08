 
 
 
 
 
 
 
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import 'server-only';

import {
  Prisma,
  ChatbotJobStatus,
  CurrencyCode,
  ProductAiJobStatus,
  AiPathRunStatus,
  AiPathNodeStatus,
  AiPathRunEventLevel,
} from '@prisma/client';
import { ObjectId } from 'mongodb';

import { createFullDatabaseBackup } from '@/features/database/services/database-backup';
import { ErrorSystem } from '@/features/observability/server';
import { operationFailedError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

export type DatabaseSyncDirection = 'mongo_to_prisma' | 'prisma_to_mongo';

export type DatabaseSyncCollectionResult = {
  name: string;
  status: 'completed' | 'skipped' | 'failed';
  sourceCount: number;
  targetDeleted: number;
  targetInserted: number;
  warnings?: string[];
  error?: string;
};

export type DatabaseSyncResult = {
  direction: DatabaseSyncDirection;
  startedAt: string;
  finishedAt: string;
  backups: Awaited<ReturnType<typeof createFullDatabaseBackup>>;
  collections: DatabaseSyncCollectionResult[];
};

const currencyCodes = new Set(['USD', 'EUR', 'PLN', 'GBP', 'SEK']);
const countryCodes = new Set(['PL', 'DE', 'GB', 'US', 'SE']);

interface MongoSettingDoc {
  _id?: ObjectId;
  key?: string;
  value?: unknown;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

interface MongoUserDoc {
  _id?: ObjectId;
  id?: string;
  name?: string | null;
  email?: string | null;
  emailVerified?: Date | string | null;
  image?: string | null;
  passwordHash?: string | null;
}

interface MongoAccountDoc {
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

interface MongoAuthSecurityProfileDoc {
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

interface MongoUserPreferencesDoc {
  _id?: ObjectId;
  id?: string;
  userId?: string;
  productListNameLocale?: string | null;
  productListCatalogFilter?: string | null;
  productListCurrencyCode?: string | null;
  productListPageSize?: number | null;
  productListThumbnailSource?: string | null;
  aiPathsActivePathId?: string | null;
  aiPathsExpandedGroups?: string[];
  aiPathsPaletteCollapsed?: boolean | null;
  aiPathsPathIndex?: unknown;
  aiPathsPathConfigs?: unknown;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

interface MongoSystemLogDoc {
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

interface MongoFileUploadEventDoc {
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

interface MongoAiConfigurationDoc {
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

interface MongoChatbotMessageDoc {
  role: string;
  content: string;
  createdAt?: Date | string;
}

interface MongoChatbotSessionDoc {
  _id?: ObjectId;
  title?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  messages?: MongoChatbotMessageDoc[];
}

interface MongoChatbotJobDoc {
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

interface MongoSessionDoc {
  _id?: ObjectId;
  id?: string;
  userId?: string | ObjectId;
  sessionToken?: string;
  expires?: Date | string;
}

interface MongoVerificationTokenDoc {
  identifier?: string;
  token?: string;
  expires?: Date | string;
}













interface MongoCurrencyDoc {
  _id?: ObjectId;
  id?: string;
  code?: string;
  name?: string;
  symbol?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface MongoCountryDoc {
  _id?: ObjectId;
  id?: string;
  code?: string;
  name?: string;
  createdAt?: Date;
  updatedAt?: Date;
  currencyIds?: string[];
}

interface MongoLanguageDoc {
  _id?: ObjectId;
  id?: string;
  code?: string;
  name?: string;
  nativeName?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  countries?: Array<{ countryId: string }>;
}

interface MongoPriceGroupDoc {
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

interface MongoCatalogDoc {
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

interface MongoProductParameterDoc {
  _id?: ObjectId;
  id?: string;
  catalogId?: string;
  name_en?: string;
  name_pl?: string | null;
  name_de?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface MongoProducerDoc {
  _id?: ObjectId;
  id?: string;
  name?: string;
  website?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

interface MongoImageFileDoc {
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

interface MongoImageStudioSlotDoc {
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

interface MongoTagDoc {
  _id?: ObjectId;
  id?: string;
  name?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface MongoCategoryDoc {
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

interface MongoProductDoc {
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
  parameters?: Array<{ parameterId: string; value_en?: string; value_pl?: string; value_de?: string }>;
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



const isObjectIdString = (value: string): boolean =>
  /^[a-fA-F0-9]{24}$/.test(value);

const toObjectIdMaybe = (value: string): ObjectId | string =>
  isObjectIdString(value) ? new ObjectId(value) : value;

const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.valueOf()) ? null : parsed;
  }
  return null;
};

const toJsonValue = (value: unknown): any => {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof ObjectId) return value.toString();
  if (Array.isArray(value)) {
    return value.map((entry: unknown) => toJsonValue(entry));
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const entries = Object.entries(record).map(([key, entry]) => [
      key,
      toJsonValue(entry),
    ]);
    return Object.fromEntries(entries);
  }
  return value;
};

const normalizeId = (doc: any): string => {
  const direct = doc.id;
  if (typeof direct === 'string' && direct.trim()) return direct;
  const raw = doc._id;
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object' && 'toString' in raw) {
    return (raw as { toString: () => string }).toString();
  }
  return '';
};

const recordResult = (
  results: DatabaseSyncCollectionResult[],
  result: DatabaseSyncCollectionResult
): void => {
  results.push(result);
};

const listMongoCollections = async (): Promise<string[]> => {
  const mongo = await getMongoDb();
  const collections = await mongo.listCollections().toArray();
  return collections.map((entry: { name: string }) => entry.name);
};

const requireDatabases = (): void => {
  if (!process.env.MONGODB_URI) {
    throw operationFailedError('MongoDB is not configured.');
  }
  if (!process.env.DATABASE_URL) {
    throw operationFailedError('Prisma database is not configured.');
  }
};

export async function runDatabaseSync(direction: DatabaseSyncDirection): Promise<DatabaseSyncResult> {
  requireDatabases();
  const startedAt = new Date();
  
  try {
    const backups = await createFullDatabaseBackup();
    const collections: DatabaseSyncCollectionResult[] = [];

    if (direction === 'mongo_to_prisma') {
      await syncMongoToPrisma(collections);
    } else {
      await syncPrismaToMongo(collections);
    }

    return {
      direction,
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      backups,
      collections,
    };
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'database-sync',
      direction,
    });
    throw error;
  }
}

async function syncMongoToPrisma(results: DatabaseSyncCollectionResult[]): Promise<void> {
  const mongo = await getMongoDb();

  const handledCollections = new Set<string>();
  const noteWarnings: string[] = [];

  const syncCollection = async (
    name: string,
    handler: () => Promise<{ sourceCount: number; targetDeleted: number; targetInserted: number; warnings?: string[] }>
  ): Promise<void> => {
    try {
      const { sourceCount, targetDeleted, targetInserted, warnings } = await handler();
      recordResult(results, {
        name,
        status: 'completed',
        sourceCount,
        targetDeleted,
        targetInserted,
        ...(warnings?.length ? { warnings } : null),
      });
    } catch (error) {
      recordResult(results, {
        name,
        status: 'failed',
        sourceCount: 0,
        targetDeleted: 0,
        targetInserted: 0,
        error: error instanceof Error ? error.message : 'Sync failed.',
      });
      throw error;
    }
  };

  await syncCollection('settings', async () => {
    handledCollections.add('settings');
    const docs = await mongo.collection('settings').find({}).toArray();
    const byKey = new Map<string, { key: string; value: string; createdAt: Date; updatedAt: Date }>();
    docs.forEach((doc: MongoSettingDoc) => {
      const key =
        doc.key ??
        doc._id?.toString() ??
        '';
      if (!key) return;
      const value = doc.value;
      const entry = {
        key,
        value: typeof value === 'string' ? value : JSON.stringify(value ?? ''),
        createdAt: toDate(doc.createdAt) ?? new Date(),
        updatedAt: toDate(doc.updatedAt) ?? new Date(),
      };
      const existing = byKey.get(key);
      if (!existing || entry.updatedAt > existing.updatedAt) {
        byKey.set(key, entry);
      }
    });
    const data = Array.from(byKey.values());
    const deleted = await prisma.setting.deleteMany();
    const created = data.length ? await prisma.setting.createMany({ data, skipDuplicates: true }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection('users', async () => {
    handledCollections.add('users');
    const docs = await mongo.collection('users').find({}).toArray();
    const data: Prisma.UserCreateManyInput[] = docs
      .map((doc: MongoUserDoc) => {
        const id = normalizeId(doc);
        if (!id) return null;
        return {
          id,
          name: doc.name ?? null,
          email: doc.email ?? null,
          emailVerified: toDate(doc.emailVerified) ?? null,
          image: doc.image ?? null,
          passwordHash: doc.passwordHash ?? null,
        };
      })
      .filter(Boolean) as Prisma.UserCreateManyInput[];
    const deleted = await prisma.user.deleteMany();
    const created = data.length ? await prisma.user.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection('accounts', async () => {
    handledCollections.add('accounts');
    const docs = await mongo.collection('accounts').find({}).toArray();
    const data: Prisma.AccountCreateManyInput[] = docs
      .map((doc: MongoAccountDoc) => {
        const id = normalizeId(doc);
        const userIdRaw = doc.userId;
        const userId = userIdRaw instanceof ObjectId ? userIdRaw.toString() : String(userIdRaw ?? '');
        if (!id || !userId) return null;
        return {
          id,
          userId,
          type: doc.type ?? 'oauth',
          provider: doc.provider ?? '',
          providerAccountId: doc.providerAccountId ?? '',
          refresh_token: doc.refresh_token ?? null,
          access_token: doc.access_token ?? null,
          expires_at: doc.expires_at ?? null,
          token_type: doc.token_type ?? null,
          scope: doc.scope ?? null,
          id_token: doc.id_token ?? null,
          session_state: doc.session_state ?? null,
        };
      })
      .filter(Boolean) as Prisma.AccountCreateManyInput[];
    const deleted = await prisma.account.deleteMany();
    const created = data.length ? await prisma.account.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection('sessions', async () => {
    handledCollections.add('sessions');
    const docs = (await mongo.collection('sessions').find({}).toArray()) as unknown as MongoSessionDoc[];
    const data = docs
      .map((doc: MongoSessionDoc): Prisma.SessionCreateManyInput | null => {
        const id = normalizeId(doc as unknown as Record<string, unknown>);
        const userIdRaw = doc.userId;
        const userId = userIdRaw instanceof ObjectId ? userIdRaw.toString() : String(userIdRaw ?? '');
        const sessionToken = doc.sessionToken;
        const expires = toDate(doc.expires);
        if (!id || !userId || !sessionToken || !expires) return null;
        return {
          id,
          sessionToken,
          userId,
          expires,
        };
      })
      .filter((item): item is Prisma.SessionCreateManyInput => item !== null);
    const deleted = await prisma.session.deleteMany();
    const created = data.length ? await prisma.session.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection('verification_tokens', async () => {
    handledCollections.add('verification_tokens');
    const docs = (await mongo.collection('verification_tokens').find({}).toArray()) as unknown as MongoVerificationTokenDoc[];
    const data = docs
      .map((doc: MongoVerificationTokenDoc): Prisma.VerificationTokenCreateManyInput | null => {
        const identifier = doc.identifier;
        const token = doc.token;
        const expires = toDate(doc.expires);
        if (!identifier || !token || !expires) return null;
        return { identifier, token, expires };
      })
      .filter((item): item is Prisma.VerificationTokenCreateManyInput => item !== null);
    const deleted = await prisma.verificationToken.deleteMany();
    const created = data.length ? await prisma.verificationToken.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });


  await syncCollection('auth_security_profiles', async () => {
    handledCollections.add('auth_security_profiles');
    const docs = await mongo.collection('auth_security_profiles').find({}).toArray();
    const data = docs
      .map((doc: MongoAuthSecurityProfileDoc): Prisma.AuthSecurityProfileCreateManyInput | null => {
        const id = normalizeId(doc);
        const userId = doc.userId ?? id;
        if (!userId) return null;
        return {
          id,
          userId,
          mfaEnabled: Boolean(doc.mfaEnabled),
          mfaSecret: doc.mfaSecret ?? null,
          recoveryCodes: doc.recoveryCodes ?? [],
          allowedIps: doc.allowedIps ?? [],
          disabledAt: toDate(doc.disabledAt),
          bannedAt: toDate(doc.bannedAt),
          createdAt: toDate(doc.createdAt) ?? new Date(),
          updatedAt: toDate(doc.updatedAt) ?? new Date(),
        };
      })
      .filter((item): item is Prisma.AuthSecurityProfileCreateManyInput => item !== null);
    const deleted = await prisma.authSecurityProfile.deleteMany();
    const created = data.length ? await prisma.authSecurityProfile.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection('auth_login_challenges', async () => {
    handledCollections.add('auth_login_challenges');
    const docs = await mongo.collection('auth_login_challenges').find({}).toArray();
    const data = docs
      .map((doc: Record<string, unknown>) => {
        const id = normalizeId(doc as Record<string, unknown>);
        if (!id) return null;
        return {
          id,
          data: toJsonValue(doc),
          createdAt: toDate((doc as { createdAt?: Date | string }).createdAt) ?? new Date(),
          updatedAt: toDate((doc as { updatedAt?: Date | string }).updatedAt) ?? new Date(),
        };
      })
      .filter(Boolean) as Prisma.AuthLoginChallengeCreateManyInput[];
    const deleted = await prisma.authLoginChallenge.deleteMany();
    const created = data.length ? await prisma.authLoginChallenge.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection('auth_security_attempts', async () => {
    handledCollections.add('auth_security_attempts');
    const docs = await mongo.collection('auth_security_attempts').find({}).toArray();
    const data = docs
      .map((doc: Record<string, unknown>) => {
        const id = normalizeId(doc as Record<string, unknown>);
        if (!id) return null;
        return {
          id,
          data: toJsonValue(doc),
          createdAt: toDate((doc as { createdAt?: Date | string }).createdAt) ?? new Date(),
          updatedAt: toDate((doc as { updatedAt?: Date | string }).updatedAt) ?? new Date(),
        };
      })
      .filter(Boolean) as Prisma.AuthSecurityAttemptCreateManyInput[];
    const deleted = await prisma.authSecurityAttempt.deleteMany();
    const created = data.length ? await prisma.authSecurityAttempt.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection('user_preferences', async () => {
    handledCollections.add('user_preferences');
    const existingUserIds = new Set<string>(
      (await prisma.user.findMany({ select: { id: true } }))
        .map((entry: { id: string }) => entry.id)
    );
    const docs: MongoUserPreferencesDoc[] = (await mongo.collection('user_preferences').find({}).toArray());
    const data = docs
      .map((doc): Prisma.UserPreferencesCreateManyInput | null => {
        const id = normalizeId(doc as unknown as Record<string, unknown>);
        const userId = doc.userId;
        if (!userId || !existingUserIds.has(userId)) return null;
        return {
          id: id || userId,
          userId,
          productListNameLocale: doc.productListNameLocale ?? null,
          productListCatalogFilter: doc.productListCatalogFilter ?? null,
          productListCurrencyCode: doc.productListCurrencyCode ?? null,
          productListPageSize: doc.productListPageSize ?? null,
          productListThumbnailSource: doc.productListThumbnailSource ?? null,
          aiPathsActivePathId: doc.aiPathsActivePathId ?? null,
          aiPathsExpandedGroups: doc.aiPathsExpandedGroups ?? [],
          aiPathsPaletteCollapsed: doc.aiPathsPaletteCollapsed ?? null,
          aiPathsPathIndex: toJsonValue(doc.aiPathsPathIndex ?? null),
          aiPathsPathConfigs: toJsonValue(doc.aiPathsPathConfigs ?? null),
          createdAt: toDate(doc.createdAt) ?? new Date(),
          updatedAt: toDate(doc.updatedAt) ?? new Date(),
        };
      })
      .filter((item): item is Prisma.UserPreferencesCreateManyInput => item !== null);
    const deleted = await prisma.userPreferences.deleteMany();
    const created = data.length ? await prisma.userPreferences.createMany({ data }) : { count: 0 };
    return {
      sourceCount: data.length,
      targetDeleted: deleted.count,
      targetInserted: created.count,
      warnings: [
        'Mongo-only user preference fields (adminMenuCollapsed, adminMenuFavorites, adminMenuSectionColors, adminMenuCustomEnabled, adminMenuCustomNav, cms*) are not stored in Prisma.',
      ],
    };
  });

  await syncCollection('system_logs', async () => {
    handledCollections.add('system_logs');
    const docs: MongoSystemLogDoc[] = (await mongo.collection('system_logs').find({}).toArray());
    const data = docs
      .map((doc): Prisma.SystemLogCreateManyInput | null => {
        const id = normalizeId(doc as unknown as Record<string, unknown>);
        return {
          ...(id ? { id } : null),
          level: doc.level ?? 'error',
          message: doc.message ?? '',
          source: doc.source ?? null,
          context: toJsonValue(doc.context ?? null),
          stack: doc.stack ?? null,
          path: doc.path ?? null,
          method: doc.method ?? null,
          statusCode: doc.statusCode ?? null,
          requestId: doc.requestId ?? null,
          userId: doc.userId ?? null,
          createdAt: toDate(doc.createdAt) ?? new Date(),
        };
      })
      .filter((item): item is Prisma.SystemLogCreateManyInput => item !== null);
    const deleted = await prisma.systemLog.deleteMany();
    const created = data.length ? await prisma.systemLog.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection('file_upload_events', async () => {
    handledCollections.add('file_upload_events');
    const docs: MongoFileUploadEventDoc[] = (await mongo.collection('file_upload_events').find({}).toArray());
    const warnings: string[] = [];
    const data = docs
      .map((doc): Prisma.FileUploadEventCreateManyInput | null => {
        const id = normalizeId(doc as unknown as Record<string, unknown>);
        if (!id) return null;
        const status = doc.status;
        const resolvedStatus = status === 'error' || status === 'success' ? status : 'success';
        if (status && resolvedStatus !== status) {
          warnings.push(`File upload event ${id}: invalid status ${status}`);
        }
        return {
          id,
          status: resolvedStatus,
          category: doc.category ?? null,
          projectId: doc.projectId ?? null,
          folder: doc.folder ?? null,
          filename: doc.filename ?? null,
          filepath: doc.filepath ?? null,
          mimetype: doc.mimetype ?? null,
          size: typeof doc.size === 'number' ? doc.size : null,
          source: doc.source ?? null,
          errorMessage: doc.errorMessage ?? null,
          requestId: doc.requestId ?? null,
          userId: doc.userId ?? null,
          meta: toJsonValue(doc.meta ?? null),
          createdAt: toDate(doc.createdAt) ?? new Date(),
        };
      })
      .filter((item): item is Prisma.FileUploadEventCreateManyInput => item !== null);
    const deleted = await prisma.fileUploadEvent.deleteMany();
    const created = data.length ? await prisma.fileUploadEvent.createMany({ data }) : { count: 0 };
    return {
      sourceCount: data.length,
      targetDeleted: deleted.count,
      targetInserted: created.count,
      ...(warnings.length ? { warnings } : null),
    };
  });

  await syncCollection('ai_configurations', async () => {
    handledCollections.add('ai_configurations');
    const docs: MongoAiConfigurationDoc[] = (await mongo.collection('ai_configurations').find({}).toArray());
    const data = docs
      .map((doc): Prisma.AiConfigurationCreateManyInput | null => {
        const id = normalizeId(doc as unknown as Record<string, unknown>);
        if (!id) return null;
        return {
          id,
          type: doc.type ?? null,
          descriptionGenerationModel: doc.descriptionGenerationModel ?? null,
          generationInputPrompt: doc.generationInputPrompt ?? null,
          generationOutputEnabled: Boolean(doc.generationOutputEnabled),
          generationOutputPrompt: doc.generationOutputPrompt ?? null,
          imageAnalysisModel: doc.imageAnalysisModel ?? null,
          visionInputPrompt: doc.visionInputPrompt ?? null,
          visionOutputEnabled: Boolean(doc.visionOutputEnabled),
          visionOutputPrompt: doc.visionOutputPrompt ?? null,
          testProductId: doc.testProductId ?? null,
          createdAt: toDate(doc.createdAt) ?? new Date(),
          updatedAt: toDate(doc.updatedAt) ?? new Date(),
        };
      })
      .filter((item): item is Prisma.AiConfigurationCreateManyInput => item !== null);
    const deleted = await prisma.aiConfiguration.deleteMany();
    const created = data.length ? await prisma.aiConfiguration.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection('chatbot_sessions', async () => {
    handledCollections.add('chatbot_sessions');
    const docs: MongoChatbotSessionDoc[] = (await mongo.collection('chatbot_sessions').find({}).toArray());
    const sessions = docs
      .map((doc): Prisma.ChatbotSessionCreateManyInput & { messages: MongoChatbotMessageDoc[] } | null => {
        const id = normalizeId(doc as unknown as Record<string, unknown>);
        if (!id) return null;
        return {
          id,
          title: doc.title ?? null,
          createdAt: toDate(doc.createdAt) ?? new Date(),
          updatedAt: toDate(doc.updatedAt) ?? new Date(),
          messages: Array.isArray(doc.messages)
            ? doc.messages.map((message) => ({
              role: message.role,
              content: message.content,
              createdAt: toDate(message.createdAt) ?? new Date(),
            }))
            : [],
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    await prisma.chatbotMessage.deleteMany();
    const deletedSessions = await prisma.chatbotSession.deleteMany();

    const sessionData = sessions.map((session) => ({
      id: session.id,
      title: session.title,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    })) as Prisma.ChatbotSessionCreateManyInput[];
    const createdSessions = sessionData.length
      ? await prisma.chatbotSession.createMany({ data: sessionData })
      : { count: 0 };

    const messageData = sessions.flatMap((session) =>
      session.messages.map((message, index) => ({
        id: `${session.id}-${index}`,
        sessionId: session.id,
        role: message.role,
        content: message.content,
        createdAt: message.createdAt ?? session.createdAt,
      }))
    ) as Prisma.ChatbotMessageCreateManyInput[];
    if (messageData.length) {
      await prisma.chatbotMessage.createMany({ data: messageData });
    }

    return {
      sourceCount: sessions.length,
      targetDeleted: deletedSessions.count,
      targetInserted: createdSessions.count,
    };
  });

  await syncCollection('chatbot_jobs', async () => {
    handledCollections.add('chatbot_jobs');
    const docs: MongoChatbotJobDoc[] = (await mongo.collection('chatbot_jobs').find({}).toArray());
    const data = docs
      .map((doc): Prisma.ChatbotJobCreateManyInput | null => {
        const id = normalizeId(doc as unknown as Record<string, unknown>);
        const sessionId = doc.sessionId;
        if (!id || !sessionId) return null;
        return {
          id,
          sessionId,
          status: (doc.status as ChatbotJobStatus) ?? 'pending',
          model: doc.model ?? null,
          payload: toJsonValue(doc.payload ?? null),
          resultText: doc.resultText ?? null,
          errorMessage: doc.errorMessage ?? null,
          createdAt: toDate(doc.createdAt) ?? new Date(),
          startedAt: toDate(doc.startedAt),
          finishedAt: toDate(doc.finishedAt),
        };
      })
      .filter((item): item is Prisma.ChatbotJobCreateManyInput => item !== null);
    const deleted = await prisma.chatbotJob.deleteMany();
    const created = data.length ? await prisma.chatbotJob.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection('currencies', async () => {
    handledCollections.add('currencies');
    // Clear dependent data so currency deletes don't fail on FK constraints.
    await prisma.product.deleteMany();
    await prisma.priceGroup.deleteMany();
    const docs = (await mongo.collection('currencies').find({}).toArray()) as unknown as MongoCurrencyDoc[];
    const warnings: string[] = [];
    const data = docs
      .map((doc: MongoCurrencyDoc): Prisma.CurrencyCreateManyInput | null => {
        const code = String(doc.code ?? '').toUpperCase();
        if (!currencyCodes.has(code)) {
          warnings.push(`Skipped currency code: ${code || 'unknown'}`);
          return null;
        }
        const id = doc.id ?? code;
        return {
          id,
          code: code as CurrencyCode,
          name: doc.name ?? code,
          symbol: doc.symbol ?? null,
          createdAt: doc.createdAt ?? new Date(),
          updatedAt: doc.updatedAt ?? new Date(),
        };
      })
      .filter((item): item is Prisma.CurrencyCreateManyInput => item !== null);
    const deleted = await prisma.currency.deleteMany();
    const created = data.length ? await prisma.currency.createMany({ data }) : { count: 0 };
    return {
      sourceCount: data.length,
      targetDeleted: deleted.count,
      targetInserted: created.count,
      ...(warnings.length ? { warnings } : null),
    };
  });

  await syncCollection('countries', async () => {
    handledCollections.add('countries');
    const docs = (await mongo.collection('countries').find({}).toArray()) as unknown as MongoCountryDoc[];
    const warnings: string[] = [];
    const data = docs
      .map((doc: MongoCountryDoc) => {
        const code = String(doc.code ?? '').toUpperCase();
        if (!countryCodes.has(code)) {
          warnings.push(`Skipped country code: ${code || 'unknown'}`);
          return null;
        }
        const id = doc.id ?? code;
        return {
          id,
          code,
          name: doc.name ?? code,
          createdAt: doc.createdAt ?? new Date(),
          updatedAt: doc.updatedAt ?? new Date(),
          currencyIds: Array.isArray(doc.currencyIds)
            ? doc.currencyIds ?? []
            : [],
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const deleted = await prisma.country.deleteMany();
    const created = data.length
      ? await prisma.country.createMany({
        data: data.map(({ currencyIds: _, ...rest }) => rest) as Prisma.CountryCreateManyInput[],
      })
      : { count: 0 };

    const joinRows = data.flatMap((country) =>
      country.currencyIds.map((currencyId) => ({
        countryId: country.id,
        currencyId,
      }))
    ) as Prisma.CountryCurrencyCreateManyInput[];
    await prisma.countryCurrency.deleteMany();
    if (joinRows.length) {
      await prisma.countryCurrency.createMany({ data: joinRows });
    }

    return {
      sourceCount: data.length,
      targetDeleted: deleted.count,
      targetInserted: created.count,
      ...(warnings.length ? { warnings } : null),
    };
  });

  await syncCollection('languages', async () => {
    handledCollections.add('languages');
    // Clear catalogs so defaultLanguage FK doesn't block language deletes.
    await prisma.catalog.deleteMany();
    const docs = (await mongo.collection('languages').find({}).toArray()) as unknown as MongoLanguageDoc[];
    const data = docs
      .map((doc: MongoLanguageDoc) => {
        const code = String(doc.code ?? '').toUpperCase();
        if (!code) return null;
        return {
          id: doc.id ?? code,
          code,
          name: doc.name ?? code,
          nativeName: doc.nativeName ?? null,
          createdAt: doc.createdAt ?? new Date(),
          updatedAt: doc.updatedAt ?? new Date(),
          countries: Array.isArray(doc.countries)
            ? doc.countries ?? []
            : [],
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const deleted = await prisma.language.deleteMany();
    const created = data.length
      ? await prisma.language.createMany({
        data: data.map(({ countries: _, ...rest }) => rest) as Prisma.LanguageCreateManyInput[],
      })
      : { count: 0 };

    const joinRows = data.flatMap((lang) =>
      lang.countries.map((entry) => ({
        languageId: lang.id,
        countryId: entry.countryId,
      }))
    ) as Prisma.LanguageCountryCreateManyInput[];
    await prisma.languageCountry.deleteMany();
    if (joinRows.length) {
      await prisma.languageCountry.createMany({ data: joinRows });
    }

    return {
      sourceCount: data.length,
      targetDeleted: deleted.count,
      targetInserted: created.count,
    };
  });

  await syncCollection('price_groups', async () => {
    handledCollections.add('price_groups');
    const availableCurrencyIds = new Set<string>(
      (await prisma.currency.findMany({ select: { id: true } }))
        .map((entry: { id: string }) => entry.id)
    );
    const warnings: string[] = [];
    const docs = (await mongo.collection('price_groups').find({}).toArray()) as unknown as MongoPriceGroupDoc[];
    const availableGroupIds = new Set<string>(
      docs
        .map((doc: MongoPriceGroupDoc) => normalizeId(doc as unknown as Record<string, unknown>))
        .filter((id: string | null): id is string => Boolean(id))
    );
    const data = docs
      .map((doc: MongoPriceGroupDoc): Prisma.PriceGroupCreateManyInput | null => {
        const id = normalizeId(doc as unknown as Record<string, unknown>);
        if (!id) return null;
        const rawCurrencyId = doc.currencyId ?? 'PLN';
        const resolvedCurrencyId = availableCurrencyIds.has(rawCurrencyId)
          ? rawCurrencyId
          : availableCurrencyIds.has('PLN')
            ? 'PLN'
            : null;
        if (!resolvedCurrencyId) {
          warnings.push(`Skipped price group ${id}: missing currency ${rawCurrencyId}`);
          return null;
        }
        const rawSourceGroupId = doc.sourceGroupId ?? null;
        const resolvedSourceGroupId =
          rawSourceGroupId && availableGroupIds.has(rawSourceGroupId) ? rawSourceGroupId : null;
        if (rawSourceGroupId && !resolvedSourceGroupId) {
          warnings.push(`Price group ${id}: missing source group ${rawSourceGroupId}`);
        }
        return {
          id,
          groupId: doc.groupId ?? id,
          isDefault: Boolean(doc.isDefault),
          name: doc.name ?? id,
          description: doc.description ?? null,
          currencyId: resolvedCurrencyId,
          type: doc.type ?? 'standard',
          basePriceField: doc.basePriceField ?? 'price',
          sourceGroupId: resolvedSourceGroupId,
          priceMultiplier: doc.priceMultiplier ?? 1,
          addToPrice: doc.addToPrice ?? 0,
          createdAt: doc.createdAt ?? new Date(),
          updatedAt: doc.updatedAt ?? new Date(),
        };
      })
      .filter((item): item is Prisma.PriceGroupCreateManyInput => item !== null);
    const deleted = await prisma.priceGroup.deleteMany();
    const created = data.length ? await prisma.priceGroup.createMany({ data }) : { count: 0 };
    return {
      sourceCount: data.length,
      targetDeleted: deleted.count,
      targetInserted: created.count,
      ...(warnings.length ? { warnings } : null),
    };
  });

  await syncCollection('catalogs', async () => {
    handledCollections.add('catalogs');
    const availableLanguageIds = new Set<string>(
      (await prisma.language.findMany({ select: { id: true } }))
        .map((entry: { id: string }) => entry.id)
    );
    const availablePriceGroupIds = new Set<string>(
      (await prisma.priceGroup.findMany({ select: { id: true } }))
        .map((entry: { id: string }) => entry.id)
    );
    const warnings: string[] = [];
    const docs = (await mongo.collection('catalogs').find({}).toArray()) as unknown as MongoCatalogDoc[];
    const data = docs
      .map((doc: MongoCatalogDoc) => {
        const id = normalizeId(doc as unknown as Record<string, unknown>);
        if (!id) return null;
        const rawDefaultLanguageId = doc.defaultLanguageId ?? null;
        const resolvedDefaultLanguageId =
          rawDefaultLanguageId && availableLanguageIds.has(rawDefaultLanguageId) ? rawDefaultLanguageId : null;
        if (rawDefaultLanguageId && !resolvedDefaultLanguageId) {
          warnings.push(`Catalog ${id}: missing default language ${rawDefaultLanguageId}`);
        }
        const rawDefaultPriceGroupId = doc.defaultPriceGroupId ?? null;
        const resolvedDefaultPriceGroupId =
          rawDefaultPriceGroupId && availablePriceGroupIds.has(rawDefaultPriceGroupId) ? rawDefaultPriceGroupId : null;
        if (rawDefaultPriceGroupId && !resolvedDefaultPriceGroupId) {
          warnings.push(`Catalog ${id}: missing default price group ${rawDefaultPriceGroupId}`);
        }
        const rawLanguageIds = doc.languageIds ?? [];
        const languageIds = rawLanguageIds.filter((languageId) => availableLanguageIds.has(languageId));
        if (rawLanguageIds.length !== languageIds.length) {
          warnings.push(`Catalog ${id}: filtered ${rawLanguageIds.length - languageIds.length} missing languages`);
        }
        const rawPriceGroupIds = doc.priceGroupIds ?? [];
        const priceGroupIds = rawPriceGroupIds.filter((priceGroupId) => availablePriceGroupIds.has(priceGroupId));
        if (rawPriceGroupIds.length !== priceGroupIds.length) {
          warnings.push(`Catalog ${id}: filtered ${rawPriceGroupIds.length - priceGroupIds.length} missing price groups`);
        }
        return {
          id,
          name: doc.name ?? id,
          description: doc.description ?? null,
          isDefault: Boolean(doc.isDefault),
          defaultLanguageId: resolvedDefaultLanguageId,
          defaultPriceGroupId: resolvedDefaultPriceGroupId,
          priceGroupIds,
          createdAt: doc.createdAt ?? new Date(),
          updatedAt: doc.updatedAt ?? new Date(),
          languageIds,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
    const deleted = await prisma.catalog.deleteMany();
    const created = data.length
      ? await prisma.catalog.createMany({
        data: data.map(({ languageIds: _, ...rest }) => rest) as Prisma.CatalogCreateManyInput[],
      })
      : { count: 0 };

    const catalogLanguages = data.flatMap((catalog) =>
      catalog.languageIds.map((languageId, index) => ({
        catalogId: catalog.id,
        languageId,
        position: index,
      }))
    ) as Prisma.CatalogLanguageCreateManyInput[];
    await prisma.catalogLanguage.deleteMany();
    if (catalogLanguages.length) {
      await prisma.catalogLanguage.createMany({ data: catalogLanguages });
    }

    return {
      sourceCount: data.length,
      targetDeleted: deleted.count,
      targetInserted: created.count,
      ...(warnings.length ? { warnings } : null),
    };
  });

  await syncCollection('product_categories', async () => {
    handledCollections.add('product_categories');
    const docs = (await mongo.collection('product_categories').find({}).toArray()) as unknown as MongoCategoryDoc[];
    const data = docs
      .map((doc: MongoCategoryDoc): Prisma.ProductCategoryCreateManyInput | null => {
        const id = normalizeId(doc as unknown as Record<string, unknown>);
        if (!id) return null;
        return {
          id,
          name: doc.name_en ?? id,
          description: doc.description_en ?? null,
          color: null,
          parentId: doc.parentId ?? null,
          catalogId: doc.catalogId ?? '',
          createdAt: doc.createdAt ?? new Date(),
          updatedAt: doc.updatedAt ?? new Date(),
        };
      })
      .filter((item): item is Prisma.ProductCategoryCreateManyInput => item !== null);
    const deleted = await prisma.productCategory.deleteMany();
    const created = data.length ? await prisma.productCategory.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection('product_tags', async () => {
    handledCollections.add('product_tags');
    const docs = (await mongo.collection('product_tags').find({}).toArray()) as unknown as MongoTagDoc[];
    const data = docs
      .map((doc: MongoTagDoc): Prisma.ProductTagCreateManyInput | null => {
        const id = normalizeId(doc as unknown as Record<string, unknown>);
        if (!id) return null;
        return {
          id,
          name: doc.name ?? id,
          color: null,
          catalogId: '',
          createdAt: doc.createdAt ?? new Date(),
          updatedAt: doc.updatedAt ?? new Date(),
        };
      })
      .filter((item): item is Prisma.ProductTagCreateManyInput => item !== null);
    const deleted = await prisma.productTag.deleteMany();
    const created = data.length ? await prisma.productTag.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection('product_parameters', async () => {
    handledCollections.add('product_parameters');
    const docs = (await mongo.collection('product_parameters').find({}).toArray()) as unknown as MongoProductParameterDoc[];
    const data = docs
      .map((doc: MongoProductParameterDoc): Prisma.ProductParameterCreateManyInput | null => {
        const id = normalizeId(doc as unknown as Record<string, unknown>);
        if (!id) return null;
        return {
          id,
          catalogId: doc.catalogId ?? '',
          name_en: doc.name_en ?? '',
          name_pl: doc.name_pl ?? null,
          name_de: doc.name_de ?? null,
          createdAt: doc.createdAt ?? new Date(),
          updatedAt: doc.updatedAt ?? new Date(),
        };
      })
      .filter((item): item is Prisma.ProductParameterCreateManyInput => item !== null);
    const deleted = await prisma.productParameter.deleteMany();
    const created = data.length ? await prisma.productParameter.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection('product_producers', async () => {
    handledCollections.add('product_producers');
    const docs = (await mongo.collection('product_producers').find({}).toArray()) as unknown as MongoProducerDoc[];
    const warnings: string[] = [];
    const seenNames = new Set<string>();
    const data = docs
      .map((doc: MongoProducerDoc): Prisma.ProducerCreateManyInput | null => {
        const id = normalizeId(doc as unknown as Record<string, unknown>);
        if (!id) return null;
        const rawName = typeof doc.name === 'string' ? doc.name?.trim() ?? '' : '';
        const name = rawName || id;
        const nameKey = name.toLowerCase();
        if (seenNames.has(nameKey)) {
          warnings.push(`Skipped duplicate producer name: ${name}`);
          return null;
        }
        seenNames.add(nameKey);
        return {
          id,
          name,
          website: doc.website ?? null,
          createdAt: toDate(doc.createdAt) ?? new Date(),
          updatedAt: toDate(doc.updatedAt) ?? new Date(),
        };
      })
      .filter((item): item is Prisma.ProducerCreateManyInput => item !== null);
    await prisma.productProducerAssignment.deleteMany();
    const deleted = await prisma.producer.deleteMany();
    const created = data.length ? await prisma.producer.createMany({ data }) : { count: 0 };
    return {
      sourceCount: data.length,
      targetDeleted: deleted.count,
      targetInserted: created.count,
      ...(warnings.length ? { warnings } : null),
    };
  });

  await syncCollection('image_files', async () => {
    handledCollections.add('image_files');
    const docs = (await mongo.collection('image_files').find({}).toArray()) as unknown as MongoImageFileDoc[];
    const data = docs
      .map((doc: MongoImageFileDoc): Prisma.ImageFileCreateManyInput | null => {
        const id = normalizeId(doc as unknown as Record<string, unknown>);
        if (!id) return null;
        return {
          id,
          filename: doc.filename ?? '',
          filepath: doc.filepath ?? '',
          mimetype: doc.mimetype ?? '',
          size: doc.size ?? 0,
          width: doc.width ?? null,
          height: doc.height ?? null,
          tags: doc.tags ?? [],
          createdAt: doc.createdAt ?? new Date(),
          updatedAt: doc.updatedAt ?? new Date(),
        };
      })
      .filter((item): item is Prisma.ImageFileCreateManyInput => item !== null);
    const deleted = await prisma.imageFile.deleteMany();
    const created = data.length ? await prisma.imageFile.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection('image_studio_slots', async () => {
    handledCollections.add('image_studio_slots');
    const availableImageFileIds = new Set<string>(
      (await prisma.imageFile.findMany({ select: { id: true } }))
        .map((entry: { id: string }) => entry.id)
    );
    const availableAssetIds = new Set<string>(
      (await prisma.asset3D.findMany({ select: { id: true } }))
        .map((entry: { id: string }) => entry.id)
    );
    const docs = (await mongo.collection('image_studio_slots').find({}).toArray()) as unknown as MongoImageStudioSlotDoc[];
    const warnings: string[] = [];
    const data = docs
      .map((doc: MongoImageStudioSlotDoc): Prisma.ImageStudioSlotCreateManyInput | null => {
        const id = normalizeId(doc as unknown as Record<string, unknown>);
        if (!id) return null;
        const projectId = doc.projectId ?? '';
        if (!projectId) {
          warnings.push(`Image studio slot ${id}: missing projectId`);
          return null;
        }
        const imageFileId = doc.imageFileId ?? null;
        const screenshotFileId = doc.screenshotFileId ?? null;
        const asset3dId = doc.asset3dId ?? null;
        const resolvedImageFileId = imageFileId && availableImageFileIds.has(imageFileId) ? imageFileId : null;
        const resolvedScreenshotFileId =
          screenshotFileId && availableImageFileIds.has(screenshotFileId) ? screenshotFileId : null;
        const resolvedAsset3dId = asset3dId && availableAssetIds.has(asset3dId) ? asset3dId : null;
        if (imageFileId && !resolvedImageFileId) {
          warnings.push(`Image studio slot ${id}: missing imageFile ${imageFileId}`);
        }
        if (screenshotFileId && !resolvedScreenshotFileId) {
          warnings.push(`Image studio slot ${id}: missing screenshotFile ${screenshotFileId}`);
        }
        if (asset3dId && !resolvedAsset3dId) {
          warnings.push(`Image studio slot ${id}: missing asset3d ${asset3dId}`);
        }
        return {
          id,
          projectId,
          name: doc.name ?? '',
          folderPath: doc.folderPath ?? '',
          position: doc.position ?? null,
          imageFileId: resolvedImageFileId,
          imageUrl: doc.imageUrl ?? null,
          imageBase64: doc.imageBase64 ?? null,
          asset3dId: resolvedAsset3dId,
          screenshotFileId: resolvedScreenshotFileId,
          metadata: toJsonValue(doc.metadata ?? null),
          createdAt: toDate(doc.createdAt) ?? new Date(),
          updatedAt: toDate(doc.updatedAt) ?? new Date(),
        };
      })
      .filter((item): item is Prisma.ImageStudioSlotCreateManyInput => item !== null);
    const deleted = await prisma.imageStudioSlot.deleteMany();
    const created = data.length ? await prisma.imageStudioSlot.createMany({ data }) : { count: 0 };
    return {
      sourceCount: data.length,
      targetDeleted: deleted.count,
      targetInserted: created.count,
      ...(warnings.length ? { warnings } : null),
    };
  });

  await syncCollection('products', async () => {
    handledCollections.add('products');
    const availableProducerIds = new Set<string>(
      (await prisma.producer.findMany({ select: { id: true } }))
        .map((entry: { id: string }) => entry.id)
    );
    const warnings: string[] = [];
    const docs = (await mongo.collection('products').find({}).toArray()) as unknown as MongoProductDoc[];
    const data = docs
      .map((doc: MongoProductDoc) => {
        const id = normalizeId(doc as unknown as Record<string, unknown>);
        if (!id) return null;
        const producers = Array.isArray(doc.producers)
          ? doc.producers ?? []
          : [];
        const filteredProducers = producers.filter((producer) => availableProducerIds.has(producer.producerId));
        if (filteredProducers.length !== producers.length) {
          warnings.push(`Product ${id}: filtered ${producers.length - filteredProducers.length} missing producers`);
        }
        return {
          id,
          sku: doc.sku ?? null,
          baseProductId: doc.baseProductId ?? null,
          defaultPriceGroupId: doc.defaultPriceGroupId ?? null,
          ean: doc.ean ?? null,
          gtin: doc.gtin ?? null,
          asin: doc.asin ?? null,
          name_en: doc.name_en ?? null,
          name_pl: doc.name_pl ?? null,
          name_de: doc.name_de ?? null,
          description_en: doc.description_en ?? null,
          description_pl: doc.description_pl ?? null,
          description_de: doc.description_de ?? null,
          supplierName: doc.supplierName ?? null,
          supplierLink: doc.supplierLink ?? null,
          priceComment: doc.priceComment ?? null,
          stock: doc.stock ?? null,
          price: doc.price ?? null,
          sizeLength: doc.sizeLength ?? null,
          sizeWidth: doc.sizeWidth ?? null,
          weight: doc.weight ?? null,
          length: doc.length ?? null,
          parameters: doc.parameters ?? [],
          imageLinks: doc.imageLinks ?? [],
          imageBase64s: doc.imageBase64s ?? [],
          createdAt: doc.createdAt ?? new Date(),
          updatedAt: doc.updatedAt ?? new Date(),
          images: Array.isArray(doc.images)
            ? doc.images ?? []
            : [],
          catalogs: Array.isArray(doc.catalogs)
            ? doc.catalogs ?? []
            : [],
          categories: ((): Array<{ categoryId: string; assignedAt: Date }> => {
            const categoryId =
              doc.categoryId ??
              (doc.categories ?? [])[0]?.categoryId ??
              null;
            return categoryId ? [{ categoryId, assignedAt: new Date() }] : [];
          })(),
          tags: Array.isArray(doc.tags)
            ? doc.tags ?? []
            : [],
          producers: filteredProducers,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    await prisma.productImage.deleteMany();
    await prisma.productCatalog.deleteMany();
    await prisma.productCategoryAssignment.deleteMany();
    await prisma.productTagAssignment.deleteMany();
    await prisma.productProducerAssignment.deleteMany();

    const deleted = await prisma.product.deleteMany();
    let created = { count: 0 };
    if (data.length > 0) {
      created = await prisma.product.createMany({
        data: data.map(({ images: _images, catalogs: _catalogs, categories: _categories, tags: _tags, producers: _producers, ...rest }) => rest) as Prisma.ProductCreateManyInput[],
      });
    }

    const imageRows = data.flatMap((product) =>
      product.images.map((image) => ({
        productId: product.id,
        imageFileId: image.imageFileId,
        assignedAt: image.assignedAt ?? new Date(),
      }))
    ) as Prisma.ProductImageCreateManyInput[];
    if (imageRows.length) {
      await prisma.productImage.createMany({ data: imageRows });
    }

    const catalogRows = data.flatMap((product) =>
      product.catalogs.map((catalog) => ({
        productId: product.id,
        catalogId: catalog.catalogId,
        assignedAt: catalog.assignedAt ?? new Date(),
      }))
    ) as Prisma.ProductCatalogCreateManyInput[];
    if (catalogRows.length) {
      await prisma.productCatalog.createMany({ data: catalogRows });
    }

    const categoryRows = data.flatMap((product) =>
      product.categories.map((category) => ({
        productId: product.id,
        categoryId: category.categoryId,
        assignedAt: category.assignedAt ?? new Date(),
      }))
    ) as Prisma.ProductCategoryAssignmentCreateManyInput[];
    if (categoryRows.length) {
      await prisma.productCategoryAssignment.createMany({ data: categoryRows });
    }

    const tagRows = data.flatMap((product) =>
      product.tags.map((tag) => ({
        productId: product.id,
        tagId: tag.tagId,
        assignedAt: tag.assignedAt ?? new Date(),
      }))
    ) as Prisma.ProductTagAssignmentCreateManyInput[];
    if (tagRows.length) {
      await prisma.productTagAssignment.createMany({ data: tagRows });
    }

    const producerRows: Prisma.ProductProducerAssignmentCreateManyInput[] = [];
    const producerKeys = new Set<string>();
    data.forEach((product) => {
      product.producers.forEach((producer) => {
        const key = `${product.id}::${producer.producerId}`;
        if (producerKeys.has(key)) return;
        producerKeys.add(key);
        producerRows.push({
          productId: product.id,
          producerId: producer.producerId,
          assignedAt: producer.assignedAt ?? new Date(),
        });
      });
    });
    if (producerRows.length) {
      await prisma.productProducerAssignment.createMany({ data: producerRows });
    }

    return {
      sourceCount: data.length,
      targetDeleted: deleted.count,
      targetInserted: created.count,
      ...(warnings.length ? { warnings } : null),
    };
  });

  await syncCollection('integrations', async () => {
    handledCollections.add('integrations');
    const docs = await mongo.collection('integrations').find({}).toArray();
    const warnings: string[] = [];
    const seenSlugs = new Set<string>();
    const data = docs
      .map((doc: Record<string, unknown>): Prisma.IntegrationCreateManyInput | null => {
        const id = normalizeId(doc as Record<string, unknown>);
        if (!id) return null;
        const rawName = typeof (doc as { name?: string }).name === 'string' ? (doc as { name?: string }).name?.trim() ?? '' : '';
        const name = rawName || id;
        const rawSlug = typeof (doc as { slug?: string }).slug === 'string' ? (doc as { slug?: string }).slug?.trim() ?? '' : '';
        const fallbackSlug = name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        const slug = rawSlug || fallbackSlug || id;
        if (!slug) {
          warnings.push(`Integration ${id}: missing slug`);
          return null;
        }
        const slugKey = slug.toLowerCase();
        if (seenSlugs.has(slugKey)) {
          warnings.push(`Skipped duplicate integration slug: ${slug}`);
          return null;
        }
        seenSlugs.add(slugKey);
        return {
          id,
          name,
          slug,
          createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
          updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
        };
      })
      .filter((item): item is Prisma.IntegrationCreateManyInput => item !== null);
    await prisma.productListing.deleteMany();
    await prisma.integrationConnection.deleteMany();
    const deleted = await prisma.integration.deleteMany();
    const created = data.length ? await prisma.integration.createMany({ data }) : { count: 0 };
    return {
      sourceCount: data.length,
      targetDeleted: deleted.count,
      targetInserted: created.count,
      ...(warnings.length ? { warnings } : null),
    };
  });

  await syncCollection('integration_connections', async () => {
    handledCollections.add('integration_connections');
    const availableIntegrationIds = new Set<string>(
      (await prisma.integration.findMany({ select: { id: true } }))
        .map((entry: { id: string }) => entry.id)
    );
    const docs = await mongo.collection('integration_connections').find({}).toArray();
    const warnings: string[] = [];
    const byIntegration = new Map<string, { doc: any; updatedAt: Date }>();
    docs.forEach((doc: Record<string, unknown>) => {
      const id = normalizeId(doc as Record<string, unknown>);
      const integrationId = (doc as { integrationId?: string }).integrationId ?? '';
      if (!id || !integrationId) {
        warnings.push('Skipped integration connection with missing id/integrationId');
        return;
      }
      if (!availableIntegrationIds.has(integrationId)) {
        warnings.push(`Integration connection ${id}: missing integration ${integrationId}`);
        return;
      }
      const updatedAt = toDate((doc as { updatedAt?: Date | string }).updatedAt) ?? new Date();
      const existing = byIntegration.get(integrationId);
      if (existing && existing.updatedAt >= updatedAt) {
        warnings.push(`Skipped duplicate connection for integration ${integrationId}`);
        return;
      }
      if (existing) {
        warnings.push(`Replaced older connection for integration ${integrationId}`);
      }
      byIntegration.set(integrationId, { doc, updatedAt });
    });
    const data = Array.from(byIntegration.values()).map(({ doc }) => ({
      id: normalizeId(doc as Record<string, unknown>),
      integrationId: (doc as { integrationId?: string }).integrationId ?? '',
      name: (doc as { name?: string }).name ?? 'Connection',
      username: (doc as { username?: string }).username ?? '',
      password: (doc as { password?: string }).password ?? '',
      playwrightStorageState: (doc as { playwrightStorageState?: string | null }).playwrightStorageState ?? null,
      playwrightStorageStateUpdatedAt: toDate((doc as { playwrightStorageStateUpdatedAt?: Date | string | null }).playwrightStorageStateUpdatedAt),
      playwrightHeadless: (doc as { playwrightHeadless?: boolean | null }).playwrightHeadless ?? true,
      playwrightSlowMo: (doc as { playwrightSlowMo?: number | null }).playwrightSlowMo ?? 50,
      playwrightTimeout: (doc as { playwrightTimeout?: number | null }).playwrightTimeout ?? 15000,
      playwrightNavigationTimeout: (doc as { playwrightNavigationTimeout?: number | null }).playwrightNavigationTimeout ?? 30000,
      playwrightHumanizeMouse: (doc as { playwrightHumanizeMouse?: boolean | null }).playwrightHumanizeMouse ?? false,
      playwrightMouseJitter: (doc as { playwrightMouseJitter?: number | null }).playwrightMouseJitter ?? 6,
      playwrightClickDelayMin: (doc as { playwrightClickDelayMin?: number | null }).playwrightClickDelayMin ?? 30,
      playwrightClickDelayMax: (doc as { playwrightClickDelayMax?: number | null }).playwrightClickDelayMax ?? 120,
      playwrightInputDelayMin: (doc as { playwrightInputDelayMin?: number | null }).playwrightInputDelayMin ?? 20,
      playwrightInputDelayMax: (doc as { playwrightInputDelayMax?: number | null }).playwrightInputDelayMax ?? 120,
      playwrightActionDelayMin: (doc as { playwrightActionDelayMin?: number | null }).playwrightActionDelayMin ?? 200,
      playwrightActionDelayMax: (doc as { playwrightActionDelayMax?: number | null }).playwrightActionDelayMax ?? 900,
      playwrightProxyEnabled: (doc as { playwrightProxyEnabled?: boolean | null }).playwrightProxyEnabled ?? false,
      playwrightProxyServer: (doc as { playwrightProxyServer?: string | null }).playwrightProxyServer ?? null,
      playwrightProxyUsername: (doc as { playwrightProxyUsername?: string | null }).playwrightProxyUsername ?? null,
      playwrightProxyPassword: (doc as { playwrightProxyPassword?: string | null }).playwrightProxyPassword ?? null,
      playwrightEmulateDevice: (doc as { playwrightEmulateDevice?: boolean | null }).playwrightEmulateDevice ?? false,
      playwrightDeviceName: (doc as { playwrightDeviceName?: string | null }).playwrightDeviceName ?? null,
      allegroAccessToken: (doc as { allegroAccessToken?: string | null }).allegroAccessToken ?? null,
      allegroRefreshToken: (doc as { allegroRefreshToken?: string | null }).allegroRefreshToken ?? null,
      allegroTokenType: (doc as { allegroTokenType?: string | null }).allegroTokenType ?? null,
      allegroScope: (doc as { allegroScope?: string | null }).allegroScope ?? null,
      allegroExpiresAt: toDate((doc as { allegroExpiresAt?: Date | string | null }).allegroExpiresAt),
      allegroTokenUpdatedAt: toDate((doc as { allegroTokenUpdatedAt?: Date | string | null }).allegroTokenUpdatedAt),
      allegroUseSandbox: (doc as { allegroUseSandbox?: boolean | null }).allegroUseSandbox ?? false,
      baseApiToken: (doc as { baseApiToken?: string | null }).baseApiToken ?? null,
      baseTokenUpdatedAt: toDate((doc as { baseTokenUpdatedAt?: Date | string | null }).baseTokenUpdatedAt),
      baseLastInventoryId: (doc as { baseLastInventoryId?: string | null }).baseLastInventoryId ?? null,
      createdAt: toDate((doc as { createdAt?: Date | string }).createdAt) ?? new Date(),
      updatedAt: toDate((doc as { updatedAt?: Date | string }).updatedAt) ?? new Date(),
    }));
    const deleted = await prisma.integrationConnection.deleteMany();
    const created = data.length ? await prisma.integrationConnection.createMany({ data }) : { count: 0 };
    return {
      sourceCount: data.length,
      targetDeleted: deleted.count,
      targetInserted: created.count,
      ...(warnings.length ? { warnings } : null),
    };
  });

  await syncCollection('product_listings', async () => {
    handledCollections.add('product_listings');
    const productIds = new Set<string>(
      (await prisma.product.findMany({ select: { id: true } }))
        .map((entry: { id: string }) => entry.id)
    );
    const connections = await prisma.integrationConnection.findMany({
      select: { id: true, integrationId: true },
    });
    const connectionMap = new Map<string, string>(
      connections.map((entry: { id: string; integrationId: string }) => [entry.id, entry.integrationId])
    );
    const docs = await mongo.collection('product_listings').find({}).toArray();
    const warnings: string[] = [];
    const byKey = new Map<string, { doc: any; updatedAt: Date }>();
    docs.forEach((doc: Record<string, unknown>) => {
      const id = normalizeId(doc as Record<string, unknown>);
      const productId = (doc as { productId?: string }).productId ?? '';
      const connectionId = (doc as { connectionId?: string }).connectionId ?? '';
      if (!id || !productId || !connectionId) {
        warnings.push('Skipped product listing with missing id/product/connection');
        return;
      }
      if (!productIds.has(productId)) {
        warnings.push(`Product listing ${id}: missing product ${productId}`);
        return;
      }
      const integrationId = connectionMap.get(connectionId);
      if (!integrationId) {
        warnings.push(`Product listing ${id}: missing connection ${connectionId}`);
        return;
      }
      const updatedAt = toDate((doc as { updatedAt?: Date | string }).updatedAt) ?? new Date();
      const key = `${productId}::${connectionId}`;
      const existing = byKey.get(key);
      if (existing && existing.updatedAt >= updatedAt) {
        warnings.push(`Skipped duplicate listing for product ${productId} connection ${connectionId}`);
        return;
      }
      if (existing) {
        warnings.push(`Replaced older listing for product ${productId} connection ${connectionId}`);
      }
      byKey.set(key, { doc, updatedAt });
    });
    const data = Array.from(byKey.values()).map(({ doc }) => {
      const connectionId = (doc as { connectionId?: string }).connectionId ?? '';
      const resolvedIntegrationId = connectionMap.get(connectionId) ?? (doc as { integrationId?: string }).integrationId ?? '';
      if ((doc as { integrationId?: string }).integrationId && (doc as { integrationId?: string }).integrationId !== resolvedIntegrationId) {
        warnings.push(`Product listing ${normalizeId(doc as Record<string, unknown>)}: corrected integrationId to match connection`);
      }
      return {
        id: normalizeId(doc as Record<string, unknown>),
        productId: (doc as { productId?: string }).productId ?? '',
        integrationId: resolvedIntegrationId,
        connectionId,
        externalListingId: (doc as { externalListingId?: string | null }).externalListingId ?? null,
        inventoryId: (doc as { inventoryId?: string | null }).inventoryId ?? null,
        status: (doc as { status?: string }).status ?? 'pending',
        listedAt: toDate((doc as { listedAt?: Date | string | null }).listedAt),
        exportHistory: toJsonValue((doc as { exportHistory?: unknown }).exportHistory ?? null),
        createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
        updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
      };
    });
    const deleted = await prisma.productListing.deleteMany();
    const created = data.length ? await prisma.productListing.createMany({ data }) : { count: 0 };
    return {
      sourceCount: data.length,
      targetDeleted: deleted.count,
      targetInserted: created.count,
      ...(warnings.length ? { warnings } : null),
    };
  });

  await syncCollection('product_drafts', async () => {
    handledCollections.add('product_drafts');
    const docs = await mongo.collection('product_drafts').find({}).toArray();
    const data = docs
      .map((doc: Record<string, unknown>): Prisma.ProductDraftCreateManyInput | null => {
        const id = normalizeId(doc as Record<string, unknown>);
        if (!id) return null;
        return {
          id,
          name: (doc as { name?: string }).name ?? '',
          description: (doc as { description?: string | null }).description ?? null,
          sku: (doc as { sku?: string | null }).sku ?? null,
          ean: (doc as { ean?: string | null }).ean ?? null,
          gtin: (doc as { gtin?: string | null }).gtin ?? null,
          asin: (doc as { asin?: string | null }).asin ?? null,
          name_en: (doc as { name_en?: string | null }).name_en ?? null,
          name_pl: (doc as { name_pl?: string | null }).name_pl ?? null,
          name_de: (doc as { name_de?: string | null }).name_de ?? null,
          description_en: (doc as { description_en?: string | null }).description_en ?? null,
          description_pl: (doc as { description_pl?: string | null }).description_pl ?? null,
          description_de: (doc as { description_de?: string | null }).description_de ?? null,
          weight: (doc as { weight?: number | null }).weight ?? null,
          sizeLength: (doc as { sizeLength?: number | null }).sizeLength ?? null,
          sizeWidth: (doc as { sizeWidth?: number | null }).sizeWidth ?? null,
          length: (doc as { length?: number | null }).length ?? null,
          price: (doc as { price?: number | null }).price ?? null,
          supplierName: (doc as { supplierName?: string | null }).supplierName ?? null,
          supplierLink: (doc as { supplierLink?: string | null }).supplierLink ?? null,
          priceComment: (doc as { priceComment?: string | null }).priceComment ?? null,
          stock: (doc as { stock?: number | null }).stock ?? null,
          catalogIds: (doc as { catalogIds?: any[] }).catalogIds ?? [],
          categoryId:
            (doc as { categoryId?: string | null }).categoryId ??
            ((doc as { categoryIds?: any[] }).categoryIds ?? [])[0] ??
            null,
          tagIds: (doc as { tagIds?: any[] }).tagIds ?? [],
          parameters: (doc as { parameters?: any[] }).parameters ?? [],
          defaultPriceGroupId: (doc as { defaultPriceGroupId?: string | null }).defaultPriceGroupId ?? null,
          active: (doc as { active?: boolean | null }).active ?? true,
          imageLinks: (doc as { imageLinks?: any[] }).imageLinks ?? [],
          baseProductId: (doc as { baseProductId?: string | null }).baseProductId ?? null,
          createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
          updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
        };
      })
      .filter((item): item is Prisma.ProductDraftCreateManyInput => item !== null);
    const deleted = await prisma.productDraft.deleteMany();
    const created = data.length ? await prisma.productDraft.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection('cms_slugs', async () => {
    handledCollections.add('cms_slugs');
    const docs = await mongo.collection('cms_slugs').find({}).toArray();
    const data = docs
      .map((doc: Record<string, unknown>): Prisma.SlugCreateManyInput | null => {
        const id = normalizeId(doc as Record<string, unknown>);
        if (!id) return null;
        return {
          id,
          slug: (doc as { slug?: string }).slug ?? '',
          isDefault: Boolean((doc as { isDefault?: boolean }).isDefault),
          createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
          updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
        };
      })
      .filter((item): item is Prisma.SlugCreateManyInput => item !== null);
    const deleted = await prisma.slug.deleteMany();
    const created = data.length ? await prisma.slug.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection('cms_themes', async () => {
    handledCollections.add('cms_themes');
    const docs = await mongo.collection('cms_themes').find({}).toArray();
    const data = docs
      .map((doc: Record<string, unknown>): Prisma.CmsThemeCreateManyInput | null => {
        const id = normalizeId(doc as Record<string, unknown>);
        if (!id) return null;
        return {
          id,
          name: (doc as { name?: string }).name ?? id,
          colors: (doc as { colors?: any }).colors ?? {},
          typography: (doc as { typography?: any }).typography ?? {},
          spacing: (doc as { spacing?: any }).spacing ?? {},
          customCss: (doc as { customCss?: string | null }).customCss ?? null,
          createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
          updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
        };
      })
      .filter((item): item is Prisma.CmsThemeCreateManyInput => item !== null);
    const deleted = await prisma.cmsTheme.deleteMany();
    const created = data.length ? await prisma.cmsTheme.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection('cms_pages', async () => {
    handledCollections.add('cms_pages');
    const docs = await mongo.collection('cms_pages').find({}).toArray();
    const data = docs
      .map((doc: Record<string, unknown>) => {
        const id = normalizeId(doc as Record<string, unknown>);
        if (!id) return null;
        return {
          id,
          name: (doc as { name?: string }).name ?? id,
          status: (doc as { status?: string }).status ?? 'draft',
          publishedAt: toDate((doc as { publishedAt?: Date | string | null }).publishedAt),
          seoTitle: (doc as { seoTitle?: string | null }).seoTitle ?? null,
          seoDescription: (doc as { seoDescription?: string | null }).seoDescription ?? null,
          seoOgImage: (doc as { seoOgImage?: string | null }).seoOgImage ?? null,
          seoCanonical: (doc as { seoCanonical?: string | null }).seoCanonical ?? null,
          robotsMeta: (doc as { robotsMeta?: string | null }).robotsMeta ?? null,
          themeId: (doc as { themeId?: string | null }).themeId ?? null,
          showMenu: (doc as { showMenu?: boolean | null }).showMenu ?? true,
          components: Array.isArray((doc as { components?: unknown[] }).components)
            ? (doc as { components?: Array<{ type: string; content: Record<string, unknown> }> }).components ?? []
            : [],
          createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
          updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
        };
      })
      .filter(Boolean) as Array<{ id: string; name: string; status: string; publishedAt: Date | null; seoTitle: string | null; seoDescription: string | null; seoOgImage: string | null; seoCanonical: string | null; robotsMeta: string | null; themeId: string | null; showMenu: boolean | null; components: Array<{ type: string; content: Record<string, unknown> }>; createdAt: Date; updatedAt: Date }>;

    await prisma.pageComponent.deleteMany();
    const deleted = await prisma.page.deleteMany();
    const created = data.length
      ? await prisma.page.createMany({
        data: data.map(({ components: _components, ...rest }) => rest) as Prisma.PageCreateManyInput[],
      })
      : { count: 0 };

    const componentRows = data.flatMap((page) =>
      page.components.map((component, index) => ({
        id: `${page.id}-${index}`,
        pageId: page.id,
        type: component.type,
        order: index,
        content: component.content ?? {},
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
      }))
    ) as Prisma.PageComponentCreateManyInput[];
    if (componentRows.length) {
      await prisma.pageComponent.createMany({ data: componentRows });
    }

    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection('cms_page_slugs', async () => {
    handledCollections.add('cms_page_slugs');
    const docs = await mongo.collection('cms_page_slugs').find({}).toArray();
    const data = docs
      .map((doc: Record<string, unknown>): Prisma.PageSlugCreateManyInput | null => {
        const pageId = (doc as { pageId?: string }).pageId;
        const slugId = (doc as { slugId?: string }).slugId;
        if (!pageId || !slugId) return null;
        return {
          pageId,
          slugId,
          assignedAt: (doc as { assignedAt?: Date }).assignedAt ?? new Date(),
        };
      })
      .filter((item): item is Prisma.PageSlugCreateManyInput => item !== null);
    const deleted = await prisma.pageSlug.deleteMany();
    const created = data.length ? await prisma.pageSlug.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection('cms_domains', async () => {
    handledCollections.add('cms_domains');
    const docs = await mongo.collection('cms_domains').find({}).toArray();
    const data = docs
      .map((doc: Record<string, unknown>): Prisma.CmsDomainCreateManyInput | null => {
        const id = normalizeId(doc as Record<string, unknown>);
        if (!id) return null;
        return {
          id,
          domain: (doc as { domain?: string }).domain ?? '',
          aliasOf: (doc as { aliasOf?: string | null }).aliasOf ?? null,
          createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
          updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
        };
      })
      .filter((item): item is Prisma.CmsDomainCreateManyInput => item !== null);
    const deleted = await prisma.cmsDomain.deleteMany();
    const created = data.length ? await prisma.cmsDomain.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection('cms_domain_slugs', async () => {
    handledCollections.add('cms_domain_slugs');
    const docs = await mongo.collection('cms_domain_slugs').find({}).toArray();
    const data = docs
      .map((doc: Record<string, unknown>): Prisma.CmsDomainSlugCreateManyInput | null => {
        const domainId = (doc as { domainId?: string }).domainId;
        const slugId = (doc as { slugId?: string }).slugId;
        if (!domainId || !slugId) return null;
        return {
          domainId,
          slugId,
          assignedAt: (doc as { assignedAt?: Date }).assignedAt ?? new Date(),
          isDefault: Boolean((doc as { isDefault?: boolean }).isDefault),
          updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
        };
      })
      .filter((item): item is Prisma.CmsDomainSlugCreateManyInput => item !== null);
    const deleted = await prisma.cmsDomainSlug.deleteMany();
    const created = data.length ? await prisma.cmsDomainSlug.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection('notebooks', async () => {
    handledCollections.add('notebooks');
    const docs = await mongo.collection('notebooks').find({}).toArray();
    const warnings: string[] = [];
    const seenNames = new Set<string>();
    const data = docs
      .map((doc: Record<string, unknown>): Prisma.NotebookCreateManyInput | null => {
        const id = normalizeId(doc as Record<string, unknown>);
        if (!id) return null;
        const name = (doc as { name?: string }).name ?? id;
        if (seenNames.has(name)) {
          warnings.push(`Skipped duplicate notebook name: ${name}`);
          return null;
        }
        seenNames.add(name);
        return {
          id,
          name,
          color: (doc as { color?: string | null }).color ?? null,
          defaultThemeId: (doc as { defaultThemeId?: string | null }).defaultThemeId ?? null,
          createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
          updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
        };
      })
      .filter((item): item is Prisma.NotebookCreateManyInput => item !== null);
    const deleted = await prisma.notebook.deleteMany();
    const created = data.length ? await prisma.notebook.createMany({ data }) : { count: 0 };
    return {
      sourceCount: data.length,
      targetDeleted: deleted.count,
      targetInserted: created.count,
      ...(warnings.length ? { warnings } : null),
    };
  });

  await syncCollection('themes', async () => {
    handledCollections.add('themes');
    const availableNotebookIds = new Set<string>(
      (await prisma.notebook.findMany({ select: { id: true } }))
        .map((entry: { id: string }) => entry.id)
    );
    const warnings: string[] = [];
    const docs = await mongo.collection('themes').find({}).toArray();
    const data = docs
      .map((doc: Record<string, unknown>): Prisma.ThemeCreateManyInput | null => {
        const id = normalizeId(doc as Record<string, unknown>);
        if (!id) return null;
        const rawNotebookId = (doc as { notebookId?: string | null }).notebookId ?? null;
        const resolvedNotebookId =
          rawNotebookId && availableNotebookIds.has(rawNotebookId) ? rawNotebookId : null;
        if (rawNotebookId && !resolvedNotebookId) {
          warnings.push(`Theme ${id}: missing notebook ${rawNotebookId}`);
        }
        return {
          id,
          name: (doc as { name?: string }).name ?? id,
          notebookId: resolvedNotebookId,
          textColor: (doc as { textColor?: string }).textColor ?? '#e5e7eb',
          backgroundColor: (doc as { backgroundColor?: string }).backgroundColor ?? '#111827',
          markdownHeadingColor: (doc as { markdownHeadingColor?: string }).markdownHeadingColor ?? '#ffffff',
          markdownLinkColor: (doc as { markdownLinkColor?: string }).markdownLinkColor ?? '#60a5fa',
          markdownCodeBackground: (doc as { markdownCodeBackground?: string }).markdownCodeBackground ?? '#1f2937',
          markdownCodeText: (doc as { markdownCodeText?: string }).markdownCodeText ?? '#e5e7eb',
          relatedNoteBorderWidth: (doc as { relatedNoteBorderWidth?: number }).relatedNoteBorderWidth ?? 1,
          relatedNoteBorderColor: (doc as { relatedNoteBorderColor?: string }).relatedNoteBorderColor ?? '#374151',
          relatedNoteBackgroundColor: (doc as { relatedNoteBackgroundColor?: string }).relatedNoteBackgroundColor ?? '#1f2937',
          relatedNoteTextColor: (doc as { relatedNoteTextColor?: string }).relatedNoteTextColor ?? '#e5e7eb',
          createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
          updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
        };
      })
      .filter((item): item is Prisma.ThemeCreateManyInput => item !== null);
    const deleted = await prisma.theme.deleteMany();
    const created = data.length ? await prisma.theme.createMany({ data }) : { count: 0 };
    return {
      sourceCount: data.length,
      targetDeleted: deleted.count,
      targetInserted: created.count,
      ...(warnings.length ? { warnings } : null),
    };
  });

  await syncCollection('tags', async () => {
    handledCollections.add('tags');
    const availableNotebookIds = new Set<string>(
      (await prisma.notebook.findMany({ select: { id: true } }))
        .map((entry: { id: string }) => entry.id)
    );
    const docs = await mongo.collection('tags').find({}).toArray();
    const warnings: string[] = [];
    const seenTags = new Set<string>();
    const data = docs
      .map((doc: Record<string, unknown>): Prisma.TagCreateManyInput | null => {
        const id = normalizeId(doc as Record<string, unknown>);
        if (!id) return null;
        const name = (doc as { name?: string }).name ?? id;
        const rawNotebookId = (doc as { notebookId?: string | null }).notebookId ?? null;
        const resolvedNotebookId =
          rawNotebookId && availableNotebookIds.has(rawNotebookId) ? rawNotebookId : null;
        if (rawNotebookId && !resolvedNotebookId) {
          warnings.push(`Tag ${id}: missing notebook ${rawNotebookId}`);
        }
        const key = `${resolvedNotebookId ?? 'none'}::${name}`;
        if (seenTags.has(key)) {
          warnings.push(`Skipped duplicate tag: ${name} (${resolvedNotebookId ?? 'no-notebook'})`);
          return null;
        }
        seenTags.add(key);
        return {
          id,
          name,
          color: (doc as { color?: string | null }).color ?? null,
          notebookId: resolvedNotebookId,
          createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
          updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
        };
      })
      .filter((item): item is Prisma.TagCreateManyInput => item !== null);
    const deleted = await prisma.tag.deleteMany();
    const created = data.length ? await prisma.tag.createMany({ data }) : { count: 0 };
    return {
      sourceCount: data.length,
      targetDeleted: deleted.count,
      targetInserted: created.count,
      ...(warnings.length ? { warnings } : null),
    };
  });

  await syncCollection('categories', async () => {
    handledCollections.add('categories');
    const docs = await mongo.collection('categories').find({}).toArray();
    const warnings: string[] = [];
    const availableNotebookIds = new Set<string>(
      (await prisma.notebook.findMany({ select: { id: true } }))
        .map((entry: { id: string }) => entry.id)
    );
    const availableThemeIds = new Set<string>(
      (await prisma.theme.findMany({ select: { id: true } }))
        .map((entry: { id: string }) => entry.id)
    );
    const raw = docs
      .map((doc: Record<string, unknown>): Prisma.CategoryCreateManyInput | null => {
        const id = normalizeId(doc as Record<string, unknown>);
        if (!id) return null;
        return {
          id,
          name: (doc as { name?: string }).name ?? id,
          description: (doc as { description?: string | null }).description ?? null,
          color: (doc as { color?: string | null }).color ?? null,
          parentId: (doc as { parentId?: string | null }).parentId ?? null,
          themeId: (doc as { themeId?: string | null }).themeId ?? null,
          notebookId: (doc as { notebookId?: string | null }).notebookId ?? null,
          sortIndex: (doc as { sortIndex?: number | null }).sortIndex ?? 0,
          createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
          updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
        };
      })
      .filter((item): item is Prisma.CategoryCreateManyInput => item !== null);
    const seenCategories = new Set<string>();
    const deduped = raw.filter((entry) => {
      const key = `${entry.notebookId ?? 'none'}::${entry.name}`;
      if (seenCategories.has(key)) {
        warnings.push(`Skipped duplicate category: ${entry.name} (${entry.notebookId ?? 'no-notebook'})`);
        return false;
      }
      seenCategories.add(key);
      return true;
    });
    const availableCategoryIds = new Set(deduped.map((entry) => entry.id));
    const data = deduped.map((entry): Prisma.CategoryCreateManyInput => {
      const resolvedParentId =
        entry.parentId && availableCategoryIds.has(entry.parentId) ? entry.parentId : null;
      if (entry.parentId && !resolvedParentId) {
        warnings.push(`Category ${entry.id}: missing parent ${entry.parentId}`);
      }
      const resolvedNotebookId =
        entry.notebookId && availableNotebookIds.has(entry.notebookId) ? entry.notebookId : null;
      if (entry.notebookId && !resolvedNotebookId) {
        warnings.push(`Category ${entry.id}: missing notebook ${entry.notebookId}`);
      }
      const resolvedThemeId =
        entry.themeId && availableThemeIds.has(entry.themeId) ? entry.themeId : null;
      if (entry.themeId && !resolvedThemeId) {
        warnings.push(`Category ${entry.id}: missing theme ${entry.themeId}`);
      }
      return {
        ...entry,
        parentId: resolvedParentId,
        notebookId: resolvedNotebookId,
        themeId: resolvedThemeId,
      };
    });
    const deleted = await prisma.category.deleteMany();
    const created = data.length ? await prisma.category.createMany({ data }) : { count: 0 };
    return {
      sourceCount: data.length,
      targetDeleted: deleted.count,
      targetInserted: created.count,
      ...(warnings.length ? { warnings } : null),
    };
  });

  await syncCollection('notes', async () => {
    handledCollections.add('notes');
    const notes = await prisma.note.findMany({
      include: {
        tags: true,
        categories: true,
        relationsFrom: true,
        files: true,
      },
    });
    const tags = await prisma.tag.findMany();
    const categories = await prisma.category.findMany();

    const tagMap = new Map(tags.map((tag) => [tag.id, tag]));
    const categoryMap = new Map(categories.map((category) => [category.id, category]));
    const noteMap = new Map(notes.map((note) => [note.id, note]));

    const docs = notes.map((note) => {
      const tagEntries = note.tags.map((entry: Prisma.NoteTagGetPayload<object>) => {
        const tag = tagMap.get(entry.tagId);
        return {
          noteId: entry.noteId,
          tagId: entry.tagId,
          assignedAt: entry.assignedAt,
          tag: tag
            ? {
              id: tag.id,
              name: tag.name,
              color: tag.color ?? null,
              notebookId: tag.notebookId ?? null,
              createdAt: tag.createdAt,
              updatedAt: tag.updatedAt,
            }
            : { id: entry.tagId, name: '', color: null, notebookId: null, createdAt: note.createdAt, updatedAt: note.updatedAt },
        };
      });
      const categoryEntries = note.categories.map((entry: Prisma.NoteCategoryGetPayload<object>) => {
        const category = categoryMap.get(entry.categoryId);
        return {
          noteId: entry.noteId,
          categoryId: entry.categoryId,
          assignedAt: entry.assignedAt,
          category: category
            ? {
              id: category.id,
              name: category.name,
              description: category.description ?? null,
              color: category.color ?? null,
              parentId: category.parentId ?? null,
              themeId: category.themeId ?? null,
              notebookId: category.notebookId ?? null,
              sortIndex: category.sortIndex,
              createdAt: category.createdAt,
              updatedAt: category.updatedAt,
            }
            : { id: entry.categoryId, name: '', description: null, color: null, parentId: null, themeId: null, notebookId: null, sortIndex: 0, createdAt: note.createdAt, updatedAt: note.updatedAt },
        };
      });
      const relationsFromEntries = note.relationsFrom.map((entry: Prisma.NoteRelationGetPayload<object>) => {
        const targetNote = noteMap.get(entry.targetNoteId);
        return {
          sourceNoteId: entry.sourceNoteId,
          targetNoteId: entry.targetNoteId,
          assignedAt: entry.assignedAt,
          targetNote: targetNote
            ? { id: targetNote.id, title: targetNote.title, color: targetNote.color ?? null }
            : { id: entry.targetNoteId, title: '', color: null },
        };
      });

      return {
        _id: note.id,
        id: note.id,
        title: note.title,
        content: note.content,
        editorType: note.editorType,
        color: note.color ?? null,
        isPinned: note.isPinned,
        isArchived: note.isArchived,
        isFavorite: note.isFavorite,
        notebookId: note.notebookId ?? null,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        tags: tagEntries,
        categories: categoryEntries,
        relationsFrom: relationsFromEntries,
        files: note.files.map((file) => ({
          noteId: file.noteId,
          slotIndex: file.slotIndex,
          filename: file.filename,
          filepath: file.filepath,
          mimetype: file.mimetype,
          size: file.size,
          width: file.width ?? null,
          height: file.height ?? null,
          createdAt: file.createdAt,
          updatedAt: file.updatedAt,
        })),
      };
    });

    const collection = mongo.collection('notes');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: notes.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection('note_files', async () => {
    handledCollections.add('noteFiles');
    const docs = await mongo.collection('noteFiles').find({}).toArray();
    const availableNoteIds = new Set<string>(
      (await prisma.note.findMany({ select: { id: true } }))
        .map((entry: { id: string }) => entry.id)
    );
    const data = docs
      .map((doc: Record<string, unknown>): Prisma.NoteFileCreateManyInput | null => {
        const id = normalizeId(doc as Record<string, unknown>);
        const noteId = (doc as { noteId?: string }).noteId;
        if (!id || !noteId || !availableNoteIds.has(noteId)) return null;
        return {
          id,
          noteId,
          slotIndex: (doc as { slotIndex?: number }).slotIndex ?? 0,
          filename: (doc as { filename?: string }).filename ?? '',
          filepath: (doc as { filepath?: string }).filepath ?? '',
          mimetype: (doc as { mimetype?: string }).mimetype ?? '',
          size: (doc as { size?: number }).size ?? 0,
          width: (doc as { width?: number | null }).width ?? null,
          height: (doc as { height?: number | null }).height ?? null,
          createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
          updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
        };
      })
      .filter((item): item is Prisma.NoteFileCreateManyInput => item !== null);
    const deleted = await prisma.noteFile.deleteMany();
    const created = data.length ? await prisma.noteFile.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection('product_ai_jobs', async () => {
    handledCollections.add('product_ai_jobs');
    const docs = await mongo.collection('product_ai_jobs').find({}).toArray();
    const data = docs
      .map((doc: Record<string, unknown>): Prisma.ProductAiJobCreateManyInput | null => {
        const id = normalizeId(doc as Record<string, unknown>);
        const productId = (doc as { productId?: string }).productId;
        if (!id || !productId) return null;
        return {
          id,
          productId,
          status: ((doc as { status?: string }).status as ProductAiJobStatus) ?? 'pending',
          type: (doc as { type?: string }).type ?? 'description_generation',
          payload: (doc as { payload?: any }).payload ?? {},
          result: (doc as { result?: any }).result ?? null,
          errorMessage: (doc as { errorMessage?: string | null }).errorMessage ?? null,
          createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
          startedAt: toDate((doc as { startedAt?: Date | string | null }).startedAt),
          finishedAt: toDate((doc as { finishedAt?: Date | string | null }).finishedAt),
        };
      })
      .filter((item): item is Prisma.ProductAiJobCreateManyInput => item !== null);
    const deleted = await prisma.productAiJob.deleteMany();
    const created = data.length ? await prisma.productAiJob.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection('ai_path_runs', async () => {
    handledCollections.add('ai_path_runs');
    const docs = await mongo.collection('ai_path_runs').find({}).toArray();
    const data = docs
      .map((doc: Record<string, unknown>): Prisma.AiPathRunCreateManyInput | null => {
        const id = normalizeId(doc as Record<string, unknown>);
        if (!id) return null;
        return {
          id,
          userId: (doc as { userId?: string | null }).userId ?? null,
          pathId: (doc as { pathId?: string }).pathId ?? '',
          pathName: (doc as { pathName?: string | null }).pathName ?? null,
          status: ((doc as { status?: string }).status as AiPathRunStatus) ?? 'queued',
          triggerEvent: (doc as { triggerEvent?: string | null }).triggerEvent ?? null,
          triggerNodeId: (doc as { triggerNodeId?: string | null }).triggerNodeId ?? null,
          triggerContext: (doc as { triggerContext?: any | null }).triggerContext ?? null,
          graph: (doc as { graph?: any | null }).graph ?? null,
          runtimeState: (doc as { runtimeState?: any | null }).runtimeState ?? null,
          meta: (doc as { meta?: any | null }).meta ?? null,
          entityId: (doc as { entityId?: string | null }).entityId ?? null,
          entityType: (doc as { entityType?: string | null }).entityType ?? null,
          errorMessage: (doc as { errorMessage?: string | null }).errorMessage ?? null,
          retryCount: (doc as { retryCount?: number | null }).retryCount ?? 0,
          maxAttempts: (doc as { maxAttempts?: number | null }).maxAttempts ?? 3,
          nextRetryAt: toDate((doc as { nextRetryAt?: Date | string | null }).nextRetryAt),
          deadLetteredAt: toDate((doc as { deadLetteredAt?: Date | string | null }).deadLetteredAt),
          startedAt: toDate((doc as { startedAt?: Date | string | null }).startedAt),
          finishedAt: toDate((doc as { finishedAt?: Date | string | null }).finishedAt),
          createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
          updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
        };
      })
      .filter((item): item is Prisma.AiPathRunCreateManyInput => item !== null);
    await prisma.aiPathRunNode.deleteMany();
    await prisma.aiPathRunEvent.deleteMany();
    const deleted = await prisma.aiPathRun.deleteMany();
    const created = data.length ? await prisma.aiPathRun.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection('ai_path_run_nodes', async () => {
    handledCollections.add('ai_path_run_nodes');
    const docs = await mongo.collection('ai_path_run_nodes').find({}).toArray();
    const data = docs
      .map((doc: Record<string, unknown>): Prisma.AiPathRunNodeCreateManyInput | null => {
        const id = normalizeId(doc as Record<string, unknown>);
        const runId = (doc as { runId?: string }).runId;
        if (!id || !runId) return null;
        return {
          id,
          runId,
          nodeId: (doc as { nodeId?: string }).nodeId ?? '',
          nodeType: (doc as { nodeType?: string }).nodeType ?? '',
          nodeTitle: (doc as { nodeTitle?: string | null }).nodeTitle ?? null,
          status: ((doc as { status?: string }).status as AiPathNodeStatus) ?? 'pending',
          attempt: (doc as { attempt?: number }).attempt ?? 0,
          inputs: (doc as { inputs?: any | null }).inputs ?? null,
          outputs: (doc as { outputs?: any | null }).outputs ?? null,
          errorMessage: (doc as { errorMessage?: string | null }).errorMessage ?? null,
          createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
          updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
          startedAt: toDate((doc as { startedAt?: Date | string | null }).startedAt),
          finishedAt: toDate((doc as { finishedAt?: Date | string | null }).finishedAt),
        };
      })
      .filter((item): item is Prisma.AiPathRunNodeCreateManyInput => item !== null);
    const deleted = await prisma.aiPathRunNode.deleteMany();
    const created = data.length ? await prisma.aiPathRunNode.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection('ai_path_run_events', async () => {
    handledCollections.add('ai_path_run_events');
    const docs = await mongo.collection('ai_path_run_events').find({}).toArray();
    const data = docs
      .map((doc: Record<string, unknown>): Prisma.AiPathRunEventCreateManyInput | null => {
        const id = normalizeId(doc as Record<string, unknown>);
        const runId = (doc as { runId?: string }).runId;
        if (!id || !runId) return null;
        return {
          id,
          runId,
          level: ((doc as { level?: string }).level as AiPathRunEventLevel) ?? 'info',
          message: (doc as { message?: string }).message ?? '',
          metadata: (doc as { metadata?: any | null }).metadata ?? null,
          createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
        };
      })
      .filter((item): item is Prisma.AiPathRunEventCreateManyInput => item !== null);
    const deleted = await prisma.aiPathRunEvent.deleteMany();
    const created = data.length ? await prisma.aiPathRunEvent.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  const existingCollections = await listMongoCollections();
  for (const collection of existingCollections) {
    if (handledCollections.has(collection)) continue;
    noteWarnings.push(collection);
  }
  if (noteWarnings.length > 0) {
    recordResult(results, {
      name: 'unmapped_collections',
      status: 'skipped',
      sourceCount: noteWarnings.length,
      targetDeleted: 0,
      targetInserted: 0,
      warnings: noteWarnings.map((name) => `No Prisma mapping for ${name}`),
    });
  }
}

async function syncPrismaToMongo(results: DatabaseSyncCollectionResult[]): Promise<void> {
  const mongo = await getMongoDb();

  const syncCollection = async (
    name: string,
    handler: () => Promise<{ sourceCount: number; targetDeleted: number; targetInserted: number; warnings?: string[] }>
  ): Promise<void> => {
    try {
      const { sourceCount, targetDeleted, targetInserted, warnings } = await handler();
      recordResult(results, {
        name,
        status: 'completed',
        sourceCount,
        targetDeleted,
        targetInserted,
        ...(warnings?.length ? { warnings } : null),
      });
    } catch (error) {
      recordResult(results, {
        name,
        status: 'failed',
        sourceCount: 0,
        targetDeleted: 0,
        targetInserted: 0,
        error: error instanceof Error ? error.message : 'Sync failed.',
      });
      throw error;
    }
  };

  await syncCollection('settings', async () => {
    const rows = await prisma.setting.findMany();
    const docs = rows.map((row) => ({
      _id: row.key,
      key: row.key,
      value: row.value,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    const collection = mongo.collection('settings');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection('users', async () => {
    const rows = await prisma.user.findMany();
    const docs = rows.map((row) => ({
      _id: toObjectIdMaybe(row.id),
      id: row.id,
      name: row.name ?? null,
      email: row.email ?? null,
      emailVerified: row.emailVerified ?? null,
      image: row.image ?? null,
      passwordHash: row.passwordHash ?? null,
    }));
    const collection = mongo.collection('users');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    const result: {
      sourceCount: number;
      targetDeleted: number;
      targetInserted: number;
      warnings?: string[];
    } = {
      sourceCount: rows.length,
      targetDeleted: deleted.deletedCount ?? 0,
      targetInserted: docs.length,
    };
    if (rows.some((row) => !isObjectIdString(row.id))) {
      result.warnings = ['Some user IDs are not ObjectId strings; Mongo auth adapters may not accept them.'];
    }
    return result;
  });

  await syncCollection('accounts', async () => {
    const rows = await prisma.account.findMany();
    const docs = rows.map((row) => ({
      _id: toObjectIdMaybe(row.id),
      id: row.id,
      userId: toObjectIdMaybe(row.userId),
      type: row.type,
      provider: row.provider,
      providerAccountId: row.providerAccountId,
      refresh_token: row.refresh_token ?? null,
      access_token: row.access_token ?? null,
      expires_at: row.expires_at ?? null,
      token_type: row.token_type ?? null,
      scope: row.scope ?? null,
      id_token: row.id_token ?? null,
      session_state: row.session_state ?? null,
    }));
    const collection = mongo.collection('accounts');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection('sessions', async () => {
    const rows = await prisma.session.findMany();
    const docs = rows.map((row) => ({
      _id: toObjectIdMaybe(row.id),
      id: row.id,
      sessionToken: row.sessionToken,
      userId: toObjectIdMaybe(row.userId),
      expires: row.expires,
    }));
    const collection = mongo.collection('sessions');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection('verification_tokens', async () => {
    const rows = await prisma.verificationToken.findMany();
    const docs = rows.map((row) => ({
      identifier: row.identifier,
      token: row.token,
      expires: row.expires,
    }));
    const collection = mongo.collection('verification_tokens');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection('auth_security_profiles', async () => {
    const rows = await prisma.authSecurityProfile.findMany();
    const docs = rows.map((row) => ({
      _id: row.id,
      id: row.id,
      userId: row.userId,
      mfaEnabled: row.mfaEnabled,
      mfaSecret: row.mfaSecret,
      recoveryCodes: row.recoveryCodes ?? [],
      allowedIps: row.allowedIps ?? [],
      disabledAt: row.disabledAt,
      bannedAt: row.bannedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    const collection = mongo.collection('auth_security_profiles');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection('auth_login_challenges', async () => {
    const rows = await prisma.authLoginChallenge.findMany();
    const docs = rows.map((row) => {
      const data = row.data && typeof row.data === 'object' ? (row.data as Record<string, unknown>) : {};
      const { _id: _ignored, ...rest } = data;
      return {
        _id: toObjectIdMaybe(row.id),
        ...rest,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    });
    const collection = mongo.collection('auth_login_challenges');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection('auth_security_attempts', async () => {
    const rows = await prisma.authSecurityAttempt.findMany();
    const docs = rows.map((row) => {
      const data = row.data && typeof row.data === 'object' ? (row.data as Record<string, unknown>) : {};
      const { _id: _ignored, ...rest } = data;
      return {
        _id: toObjectIdMaybe(row.id),
        ...rest,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    });
    const collection = mongo.collection('auth_security_attempts');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection('user_preferences', async () => {
    const rows = await prisma.userPreferences.findMany();
    const docs = rows.map((row) => ({
      _id: row.id,
      userId: row.userId,
      productListNameLocale: row.productListNameLocale,
      productListCatalogFilter: row.productListCatalogFilter,
      productListCurrencyCode: row.productListCurrencyCode,
      productListPageSize: row.productListPageSize,
      aiPathsActivePathId: row.aiPathsActivePathId,
      aiPathsExpandedGroups: row.aiPathsExpandedGroups ?? [],
      aiPathsPaletteCollapsed: row.aiPathsPaletteCollapsed ?? null,
      aiPathsPathIndex: row.aiPathsPathIndex ?? null,
      aiPathsPathConfigs: row.aiPathsPathConfigs ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    const collection = mongo.collection('user_preferences');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return {
      sourceCount: rows.length,
      targetDeleted: deleted.deletedCount ?? 0,
      targetInserted: docs.length,
      warnings: ['Mongo-only user preference fields (adminMenuCollapsed, adminMenuFavorites, adminMenuSectionColors, adminMenuCustomEnabled, adminMenuCustomNav, cms*) are not restored from Prisma.'],
    };
  });

  await syncCollection('system_logs', async () => {
    const rows = await prisma.systemLog.findMany();
    const docs = rows.map((row) => ({
      _id: toObjectIdMaybe(row.id),
      id: row.id,
      level: row.level,
      message: row.message,
      source: row.source ?? null,
      context: row.context ?? null,
      stack: row.stack ?? null,
      path: row.path ?? null,
      method: row.method ?? null,
      statusCode: row.statusCode ?? null,
      requestId: row.requestId ?? null,
      userId: row.userId ?? null,
      createdAt: row.createdAt,
    }));
    const collection = mongo.collection('system_logs');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection('file_upload_events', async () => {
    const rows = await prisma.fileUploadEvent.findMany();
    const docs = rows.map((row) => ({
      _id: toObjectIdMaybe(row.id),
      id: row.id,
      status: row.status,
      category: row.category ?? null,
      projectId: row.projectId ?? null,
      folder: row.folder ?? null,
      filename: row.filename ?? null,
      filepath: row.filepath ?? null,
      mimetype: row.mimetype ?? null,
      size: row.size ?? null,
      source: row.source ?? null,
      errorMessage: row.errorMessage ?? null,
      requestId: row.requestId ?? null,
      userId: row.userId ?? null,
      meta: row.meta ?? null,
      createdAt: row.createdAt,
    }));
    const collection = mongo.collection('file_upload_events');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection('ai_configurations', async () => {
    const rows = await prisma.aiConfiguration.findMany();
    const docs = rows.map((row) => ({
      _id: toObjectIdMaybe(row.id),
      id: row.id,
      type: row.type ?? null,
      descriptionGenerationModel: row.descriptionGenerationModel ?? null,
      generationInputPrompt: row.generationInputPrompt ?? null,
      generationOutputEnabled: row.generationOutputEnabled,
      generationOutputPrompt: row.generationOutputPrompt ?? null,
      imageAnalysisModel: row.imageAnalysisModel ?? null,
      visionInputPrompt: row.visionInputPrompt ?? null,
      visionOutputEnabled: row.visionOutputEnabled,
      visionOutputPrompt: row.visionOutputPrompt ?? null,
      testProductId: row.testProductId ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    const collection = mongo.collection('ai_configurations');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection('chatbot_sessions', async () => {
    const sessions = await prisma.chatbotSession.findMany({
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    const docs = sessions.map((session) => ({
      _id: toObjectIdMaybe(session.id),
      title: session.title ?? null,
      messages: session.messages.map((message) => ({
        role: message.role,
        content: message.content,
        createdAt: message.createdAt,
      })),
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      settings: null,
    }));
    const collection = mongo.collection('chatbot_sessions');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: sessions.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection('chatbot_jobs', async () => {
    const rows = await prisma.chatbotJob.findMany();
    const docs = rows.map((row) => ({
      _id: toObjectIdMaybe(row.id),
      sessionId: row.sessionId,
      status: row.status,
      model: row.model ?? null,
      payload: row.payload ?? null,
      resultText: row.resultText ?? null,
      errorMessage: row.errorMessage ?? null,
      createdAt: row.createdAt,
      startedAt: row.startedAt ?? null,
      finishedAt: row.finishedAt ?? null,
    }));
    const collection = mongo.collection('chatbot_jobs');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection('currencies', async () => {
    const rows = await prisma.currency.findMany();
    const docs = rows.map((row) => ({
      _id: row.id,
      id: row.id,
      code: row.code,
      name: row.name,
      symbol: row.symbol ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    const collection = mongo.collection('currencies');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection('countries', async () => {
    const rows = await prisma.country.findMany({ include: { currencies: true } });
    const docs = rows.map((row) => ({
      _id: row.id,
      id: row.id,
      code: row.code,
      name: row.name,
      currencyIds: row.currencies.map((entry: { currencyId: string }) => entry.currencyId),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    const collection = mongo.collection('countries');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection('languages', async () => {
    const rows = await prisma.language.findMany({ include: { countries: { include: { country: true } } } });
    const docs = rows.map((row) => ({
      _id: row.id,
      id: row.id,
      code: row.code,
      name: row.name,
      nativeName: row.nativeName ?? null,
      countries: row.countries.map((entry: { countryId: string; country: { id: string; code: any; name: string } }) => ({
        countryId: entry.countryId,
        country: {
          id: entry.country.id,
          code: entry.country.code,
          name: entry.country.name,
        },
      })),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    const collection = mongo.collection('languages');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection('price_groups', async () => {
    const rows = await prisma.priceGroup.findMany();
    const docs = rows.map((row) => ({
      _id: row.id,
      id: row.id,
      groupId: row.groupId,
      isDefault: row.isDefault,
      name: row.name,
      description: row.description ?? null,
      currencyId: row.currencyId,
      type: row.type,
      basePriceField: row.basePriceField,
      sourceGroupId: row.sourceGroupId ?? null,
      priceMultiplier: row.priceMultiplier,
      addToPrice: row.addToPrice,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    const collection = mongo.collection('price_groups');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection('catalogs', async () => {
    const rows = await prisma.catalog.findMany({ include: { languages: true } });
    const docs = rows.map((row) => ({
      _id: row.id,
      id: row.id,
      name: row.name,
      description: row.description ?? null,
      isDefault: row.isDefault,
      defaultLanguageId: row.defaultLanguageId ?? null,
      defaultPriceGroupId: row.defaultPriceGroupId ?? null,
      priceGroupIds: row.priceGroupIds ?? [],
      languageIds: row.languages
        .sort((a: { position: number }, b: { position: number }) => a.position - b.position)
        .map((entry: { languageId: string }) => entry.languageId),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    const collection = mongo.collection('catalogs');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection('product_categories', async () => {
    const rows = await prisma.productCategory.findMany();
    const docs = rows.map((row) => ({
      _id: row.id,
      id: row.id,
      name: row.name,
      description: row.description ?? null,
      color: row.color ?? null,
      parentId: row.parentId ?? null,
      catalogId: row.catalogId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    const collection = mongo.collection('product_categories');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection('product_tags', async () => {
    const rows = await prisma.productTag.findMany();
    const docs = rows.map((row) => ({
      _id: row.id,
      id: row.id,
      name: row.name,
      color: row.color ?? null,
      catalogId: row.catalogId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    const collection = mongo.collection('product_tags');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection('product_producers', async () => {
    const rows = await prisma.producer.findMany();
    const docs = rows.map((row) => ({
      _id: row.id,
      id: row.id,
      name: row.name,
      website: row.website ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    const collection = mongo.collection('product_producers');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection('product_parameters', async () => {
    const rows = await prisma.productParameter.findMany();
    const docs = rows.map((row) => ({
      _id: row.id,
      id: row.id,
      catalogId: row.catalogId,
      name_en: row.name_en,
      name_pl: row.name_pl ?? null,
      name_de: row.name_de ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    const collection = mongo.collection('product_parameters');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection('image_files', async () => {
    const rows = await prisma.imageFile.findMany();
    const docs = rows.map((row) => ({
      _id: row.id,
      id: row.id,
      filename: row.filename,
      filepath: row.filepath,
      mimetype: row.mimetype,
      size: row.size,
      width: row.width ?? null,
      height: row.height ?? null,
      tags: row.tags ?? [],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    const collection = mongo.collection('image_files');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection('image_studio_slots', async () => {
    const rows = await prisma.imageStudioSlot.findMany();
    const docs = rows.map((row) => ({
      _id: row.id,
      id: row.id,
      projectId: row.projectId,
      name: row.name ?? '',
      folderPath: row.folderPath ?? '',
      position: row.position ?? null,
      imageFileId: row.imageFileId ?? null,
      imageUrl: row.imageUrl ?? null,
      imageBase64: row.imageBase64 ?? null,
      asset3dId: row.asset3dId ?? null,
      screenshotFileId: row.screenshotFileId ?? null,
      metadata: row.metadata ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));
    const collection = mongo.collection('image_studio_slots');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection('products', async () => {
    const [rows, catalogRows] = await Promise.all([
      prisma.product.findMany({
        include: {
          images: { include: { imageFile: true } },
          catalogs: { include: { catalog: true } },
          categories: true,
          tags: true,
          producers: true,
        },
      }),
      prisma.catalog.findMany({ include: { languages: true } }),
    ]);
    const catalogLanguageMap = new Map(
      catalogRows.map((catalog: any) => [
        catalog.id,
        catalog.languages
          .sort((a: any, b: any) => a.position - b.position)
          .map((entry: { languageId: string }) => entry.languageId),
      ])
    );
    const docs = rows.map((product) => {
      const categoryId = product.categories?.categoryId ?? null;
      return {
        _id: product.id,
        id: product.id,
        sku: product.sku ?? null,
        baseProductId: product.baseProductId ?? null,
        defaultPriceGroupId: product.defaultPriceGroupId ?? null,
        ean: product.ean ?? null,
        gtin: product.gtin ?? null,
        asin: product.asin ?? null,
        name_en: product.name_en ?? null,
        name_pl: product.name_pl ?? null,
        name_de: product.name_de ?? null,
        description_en: product.description_en ?? null,
        description_pl: product.description_pl ?? null,
        description_de: product.description_de ?? null,
        supplierName: product.supplierName ?? null,
        supplierLink: product.supplierLink ?? null,
        priceComment: product.priceComment ?? null,
        stock: product.stock ?? null,
        price: product.price ?? null,
        sizeLength: product.sizeLength ?? null,
        sizeWidth: product.sizeWidth ?? null,
        weight: product.weight ?? null,
        length: product.length ?? null,
        parameters: product.parameters ?? [],
        imageLinks: product.imageLinks ?? [],
        imageBase64s: product.imageBase64s ?? [],
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        images: product.images.map((image) => ({
          productId: image.productId,
          imageFileId: image.imageFileId,
          assignedAt: image.assignedAt,
          imageFile: {
            id: image.imageFile.id,
            filename: image.imageFile.filename,
            filepath: image.imageFile.filepath,
            mimetype: image.imageFile.mimetype,
            size: image.imageFile.size,
            width: image.imageFile.width ?? null,
            height: image.imageFile.height ?? null,
            tags: image.imageFile.tags ?? [],
            createdAt: image.imageFile.createdAt,
            updatedAt: image.imageFile.updatedAt,
          },
        })),
        catalogs: product.catalogs.map((entry: any) => ({
          productId: entry.productId,
          catalogId: entry.catalogId,
          assignedAt: entry.assignedAt,
          catalog: {
            id: entry.catalog.id,
            name: entry.catalog.name,
            description: entry.catalog.description ?? null,
            isDefault: entry.catalog.isDefault,
            defaultLanguageId: entry.catalog.defaultLanguageId ?? null,
            defaultPriceGroupId: entry.catalog.defaultPriceGroupId ?? null,
            priceGroupIds: entry.catalog.priceGroupIds ?? [],
            createdAt: entry.catalog.createdAt,
            updatedAt: entry.catalog.updatedAt,
            languageIds: catalogLanguageMap.get(entry.catalog.id) ?? [],
          },
        })),
        categoryId,
        categories: categoryId
          ? [
            {
              productId: product.id,
              categoryId,
              assignedAt: new Date(),
            },
          ]
          : [],
        tags: product.tags.map((entry: any) => ({
          productId: entry.productId,
          tagId: entry.tagId,
          assignedAt: entry.assignedAt,
        })),
        producers: product.producers.map((entry: any) => ({
          productId: entry.productId,
          producerId: entry.producerId,
          assignedAt: entry.assignedAt,
        })),
      };
    });

    const collection = mongo.collection('products');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection('integrations', async () => {
    const rows = await prisma.integration.findMany();
    const docs = rows.map((row) => ({
      _id: row.id,
      id: row.id,
      name: row.name,
      slug: row.slug,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    const collection = mongo.collection('integrations');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection('integration_connections', async () => {
    const rows = await prisma.integrationConnection.findMany();
    const docs = rows.map((row) => ({
      _id: row.id,
      id: row.id,
      integrationId: row.integrationId,
      name: row.name,
      username: row.username,
      password: row.password,
      playwrightStorageState: row.playwrightStorageState ?? null,
      playwrightStorageStateUpdatedAt: row.playwrightStorageStateUpdatedAt ?? null,
      playwrightHeadless: row.playwrightHeadless,
      playwrightSlowMo: row.playwrightSlowMo,
      playwrightTimeout: row.playwrightTimeout,
      playwrightNavigationTimeout: row.playwrightNavigationTimeout,
      playwrightHumanizeMouse: row.playwrightHumanizeMouse,
      playwrightMouseJitter: row.playwrightMouseJitter,
      playwrightClickDelayMin: row.playwrightClickDelayMin,
      playwrightClickDelayMax: row.playwrightClickDelayMax,
      playwrightInputDelayMin: row.playwrightInputDelayMin,
      playwrightInputDelayMax: row.playwrightInputDelayMax,
      playwrightActionDelayMin: row.playwrightActionDelayMin,
      playwrightActionDelayMax: row.playwrightActionDelayMax,
      playwrightProxyEnabled: row.playwrightProxyEnabled,
      playwrightProxyServer: row.playwrightProxyServer ?? null,
      playwrightProxyUsername: row.playwrightProxyUsername ?? null,
      playwrightProxyPassword: row.playwrightProxyPassword ?? null,
      playwrightEmulateDevice: row.playwrightEmulateDevice,
      playwrightDeviceName: row.playwrightDeviceName ?? null,
      allegroAccessToken: row.allegroAccessToken ?? null,
      allegroRefreshToken: row.allegroRefreshToken ?? null,
      allegroTokenType: row.allegroTokenType ?? null,
      allegroScope: row.allegroScope ?? null,
      allegroExpiresAt: row.allegroExpiresAt ?? null,
      allegroTokenUpdatedAt: row.allegroTokenUpdatedAt ?? null,
      allegroUseSandbox: row.allegroUseSandbox ?? false,
      baseApiToken: row.baseApiToken ?? null,
      baseTokenUpdatedAt: row.baseTokenUpdatedAt ?? null,
      baseLastInventoryId: row.baseLastInventoryId ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    const collection = mongo.collection('integration_connections');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection('product_listings', async () => {
    const rows = await prisma.productListing.findMany();
    const docs = rows.map((row) => ({
      _id: row.id,
      id: row.id,
      productId: row.productId,
      integrationId: row.integrationId,
      connectionId: row.connectionId,
      externalListingId: row.externalListingId ?? null,
      inventoryId: row.inventoryId ?? null,
      status: row.status,
      listedAt: row.listedAt ?? null,
      exportHistory: row.exportHistory ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    const collection = mongo.collection('product_listings');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection('product_drafts', async () => {
    const rows = await prisma.productDraft.findMany();
    const docs = rows.map((row) => ({
      _id: row.id,
      id: row.id,
      name: row.name,
      description: row.description ?? null,
      sku: row.sku ?? null,
      ean: row.ean ?? null,
      gtin: row.gtin ?? null,
      asin: row.asin ?? null,
      name_en: row.name_en ?? null,
      name_pl: row.name_pl ?? null,
      name_de: row.name_de ?? null,
      description_en: row.description_en ?? null,
      description_pl: row.description_pl ?? null,
      description_de: row.description_de ?? null,
      weight: row.weight ?? null,
      sizeLength: row.sizeLength ?? null,
      sizeWidth: row.sizeWidth ?? null,
      length: row.length ?? null,
      price: row.price ?? null,
      supplierName: row.supplierName ?? null,
      supplierLink: row.supplierLink ?? null,
      priceComment: row.priceComment ?? null,
      stock: row.stock ?? null,
      catalogIds: row.catalogIds ?? [],
      categoryId: row.categoryId ?? null,
      categoryIds: row.categoryId ? [row.categoryId] : [],
      tagIds: row.tagIds ?? [],
      parameters: row.parameters ?? [],
      defaultPriceGroupId: row.defaultPriceGroupId ?? null,
      active: row.active ?? true,
      imageLinks: row.imageLinks ?? [],
      baseProductId: row.baseProductId ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    const collection = mongo.collection('product_drafts');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection('cms_slugs', async () => {
    const rows = await prisma.slug.findMany();
    const docs = rows.map((row) => ({
      _id: row.id,
      id: row.id,
      slug: row.slug,
      isDefault: row.isDefault,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    const collection = mongo.collection('cms_slugs');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection('cms_themes', async () => {
    const rows = await prisma.cmsTheme.findMany();
    const docs = rows.map((row) => ({
      _id: row.id,
      id: row.id,
      name: row.name,
      colors: row.colors ?? {},
      typography: row.typography ?? {},
      spacing: row.spacing ?? {},
      customCss: row.customCss ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    const collection = mongo.collection('cms_themes');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection('cms_pages', async () => {
    const rows = await prisma.page.findMany({ include: { components: true } });
    const docs = rows.map((row) => ({
      _id: row.id,
      id: row.id,
      name: row.name,
      status: row.status,
      publishedAt: row.publishedAt ?? null,
      seoTitle: row.seoTitle ?? null,
      seoDescription: row.seoDescription ?? null,
      seoOgImage: row.seoOgImage ?? null,
      seoCanonical: row.seoCanonical ?? null,
      robotsMeta: row.robotsMeta ?? null,
      themeId: row.themeId ?? null,
      showMenu: row.showMenu ?? true,
      components: row.components
        .sort((a: { order: number }, b: { order: number }) => a.order - b.order)
        .map((component: { type: string; content: any }) => ({
          type: component.type,
          content: component.content ?? {},
        })),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    const collection = mongo.collection('cms_pages');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection('cms_page_slugs', async () => {
    const rows = await prisma.pageSlug.findMany();
    const docs = rows.map((row) => ({
      pageId: row.pageId,
      slugId: row.slugId,
      assignedAt: row.assignedAt,
    }));
    const collection = mongo.collection('cms_page_slugs');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection('cms_domains', async () => {
    const rows = await prisma.cmsDomain.findMany();
    const docs = rows.map((row) => ({
      _id: toObjectIdMaybe(row.id),
      id: row.id,
      domain: row.domain,
      aliasOf: row.aliasOf ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    const collection = mongo.collection('cms_domains');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection('cms_domain_slugs', async () => {
    const rows = await prisma.cmsDomainSlug.findMany();
    const docs = rows.map((row) => ({
      _id: new ObjectId(),
      domainId: row.domainId,
      slugId: row.slugId,
      assignedAt: row.assignedAt,
      isDefault: row.isDefault,
      updatedAt: row.updatedAt,
    }));
    const collection = mongo.collection('cms_domain_slugs');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection('notes', async () => {
    const [notes, tags, categories] = await Promise.all([
      prisma.note.findMany({
        include: {
          tags: true,
          categories: true,
          relationsFrom: true,
          files: true,
        },
      }),
      prisma.tag.findMany(),
      prisma.category.findMany(),
    ]);
    const tagMap = new Map(tags.map((tag) => [tag.id, tag]));
    const categoryMap = new Map(categories.map((category) => [category.id, category]));
    const noteMap = new Map(notes.map((note) => [note.id, note]));

    const docs = notes.map((note) => {
      const tagEntries = note.tags.map((entry: any) => {
        const tag = tagMap.get(entry.tagId);
        return {
          noteId: entry.noteId,
          tagId: entry.tagId,
          assignedAt: entry.assignedAt,
          tag: tag
            ? {
              id: tag.id,
              name: tag.name,
              color: tag.color ?? null,
              notebookId: tag.notebookId ?? null,
              createdAt: tag.createdAt,
              updatedAt: tag.updatedAt,
            }
            : { id: entry.tagId, name: '', color: null, notebookId: null, createdAt: note.createdAt, updatedAt: note.updatedAt },
        };
      });
      const categoryEntries = note.categories.map((entry: any) => {
        const category = categoryMap.get(entry.categoryId);
        return {
          noteId: entry.noteId,
          categoryId: entry.categoryId,
          assignedAt: entry.assignedAt,
          category: category
            ? {
              id: category.id,
              name: category.name,
              description: category.description ?? null,
              color: category.color ?? null,
              parentId: category.parentId ?? null,
              themeId: category.themeId ?? null,
              notebookId: category.notebookId ?? null,
              sortIndex: category.sortIndex,
              createdAt: category.createdAt,
              updatedAt: category.updatedAt,
            }
            : { id: entry.categoryId, name: '', description: null, color: null, parentId: null, themeId: null, notebookId: null, sortIndex: 0, createdAt: note.createdAt, updatedAt: note.updatedAt },
        };
      });
      const relationsFrom = note.relationsFrom.map((entry: any) => {
        const target = noteMap.get(entry.targetNoteId);
        return {
          sourceNoteId: entry.sourceNoteId,
          targetNoteId: entry.targetNoteId,
          assignedAt: entry.assignedAt,
          targetNote: target
            ? { id: target.id, title: target.title, color: target.color ?? null }
            : { id: entry.targetNoteId, title: '', color: null },
        };
      });

      return {
        _id: note.id,
        id: note.id,
        title: note.title,
        content: note.content,
        editorType: note.editorType,
        color: note.color ?? null,
        isPinned: note.isPinned,
        isArchived: note.isArchived,
        isFavorite: note.isFavorite,
        notebookId: note.notebookId ?? null,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        tags: tagEntries,
        categories: categoryEntries,
        relationsFrom,
        files: note.files.map((file) => ({
          noteId: file.noteId,
          slotIndex: file.slotIndex,
          filename: file.filename,
          filepath: file.filepath,
          mimetype: file.mimetype,
          size: file.size,
          width: file.width ?? null,
          height: file.height ?? null,
          createdAt: file.createdAt,
          updatedAt: file.updatedAt,
        })),
      };
    });


    const collection = mongo.collection('notes');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: notes.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection('noteFiles', async () => {
    const files = await prisma.noteFile.findMany();
    const docs = files.map((file) => ({
      _id: file.id,
      id: file.id,
      noteId: file.noteId,
      slotIndex: file.slotIndex,
      filename: file.filename,
      filepath: file.filepath,
      mimetype: file.mimetype,
      size: file.size,
      width: file.width ?? null,
      height: file.height ?? null,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    }));
    const collection = mongo.collection('noteFiles');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: files.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection('tags', async () => {
    const rows = await prisma.tag.findMany();
    const docs = rows.map((row) => ({
      _id: row.id,
      id: row.id,
      name: row.name,
      color: row.color ?? null,
      notebookId: row.notebookId ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    const collection = mongo.collection('tags');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection('categories', async () => {
    const rows = await prisma.category.findMany();
    const docs = rows.map((row) => ({
      _id: row.id,
      id: row.id,
      name: row.name,
      description: row.description ?? null,
      color: row.color ?? null,
      parentId: row.parentId ?? null,
      themeId: row.themeId ?? null,
      notebookId: row.notebookId ?? null,
      sortIndex: row.sortIndex,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    const collection = mongo.collection('categories');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection('notebooks', async () => {
    const rows = await prisma.notebook.findMany();
    const docs = rows.map((row) => ({
      _id: row.id,
      id: row.id,
      name: row.name,
      color: row.color ?? null,
      defaultThemeId: row.defaultThemeId ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    const collection = mongo.collection('notebooks');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection('themes', async () => {
    const rows = await prisma.theme.findMany();
    const docs = rows.map((row) => ({
      _id: row.id,
      id: row.id,
      name: row.name,
      notebookId: row.notebookId ?? null,
      textColor: row.textColor,
      backgroundColor: row.backgroundColor,
      markdownHeadingColor: row.markdownHeadingColor,
      markdownLinkColor: row.markdownLinkColor,
      markdownCodeBackground: row.markdownCodeBackground,
      markdownCodeText: row.markdownCodeText,
      relatedNoteBorderWidth: row.relatedNoteBorderWidth,
      relatedNoteBorderColor: row.relatedNoteBorderColor,
      relatedNoteBackgroundColor: row.relatedNoteBackgroundColor,
      relatedNoteTextColor: row.relatedNoteTextColor,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    const collection = mongo.collection('themes');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection('product_ai_jobs', async () => {
    const rows = await prisma.productAiJob.findMany();
    const docs = rows.map((row) => ({
      _id: row.id,
      id: row.id,
      productId: row.productId,
      status: row.status,
      type: row.type,
      payload: row.payload,
      result: row.result ?? null,
      errorMessage: row.errorMessage ?? null,
      createdAt: row.createdAt,
      startedAt: row.startedAt ?? null,
      finishedAt: row.finishedAt ?? null,
    }));
    const collection = mongo.collection('product_ai_jobs');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection('ai_path_runs', async () => {
    const rows = await prisma.aiPathRun.findMany();
    const docs = rows.map((row) => ({
      _id: row.id,
      id: row.id,
      userId: row.userId ?? null,
      pathId: row.pathId,
      pathName: row.pathName ?? null,
      status: row.status,
      triggerEvent: row.triggerEvent ?? null,
      triggerNodeId: row.triggerNodeId ?? null,
      triggerContext: row.triggerContext ?? null,
      graph: row.graph ?? null,
      runtimeState: row.runtimeState ?? null,
      meta: row.meta ?? null,
      entityId: row.entityId ?? null,
      entityType: row.entityType ?? null,
      errorMessage: row.errorMessage ?? null,
      retryCount: row.retryCount ?? 0,
      maxAttempts: row.maxAttempts ?? 3,
      nextRetryAt: row.nextRetryAt ?? null,
      deadLetteredAt: row.deadLetteredAt ?? null,
      startedAt: row.startedAt ?? null,
      finishedAt: row.finishedAt ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    const collection = mongo.collection('ai_path_runs');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection('ai_path_run_nodes', async () => {
    const rows = await prisma.aiPathRunNode.findMany();
    const docs = rows.map((row) => ({
      _id: row.id,
      id: row.id,
      runId: row.runId,
      nodeId: row.nodeId,
      nodeType: row.nodeType,
      nodeTitle: row.nodeTitle ?? null,
      status: row.status,
      attempt: row.attempt ?? 0,
      inputs: row.inputs ?? null,
      outputs: row.outputs ?? null,
      errorMessage: row.errorMessage ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      startedAt: row.startedAt ?? null,
      finishedAt: row.finishedAt ?? null,
    }));
    const collection = mongo.collection('ai_path_run_nodes');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection('ai_path_run_events', async () => {
    const rows = await prisma.aiPathRunEvent.findMany();
    const docs = rows.map((row) => ({
      _id: row.id,
      id: row.id,
      runId: row.runId,
      level: row.level,
      message: row.message,
      metadata: row.metadata ?? null,
      createdAt: row.createdAt,
    }));
    const collection = mongo.collection('ai_path_run_events');
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });
}
