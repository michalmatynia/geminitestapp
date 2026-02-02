/* eslint-disable @typescript-eslint/typedef */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
import "server-only";

import { ObjectId } from "mongodb";
import { Prisma } from "@prisma/client";
import prisma from "@/shared/lib/db/prisma";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import { createFullDatabaseBackup } from "@/features/database/services/database-backup";
import { operationFailedError } from "@/shared/errors/app-error";

export type DatabaseSyncDirection = "mongo_to_prisma" | "prisma_to_mongo";

export type DatabaseSyncCollectionResult = {
  name: string;
  status: "completed" | "skipped" | "failed";
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

const currencyCodes = new Set(["USD", "EUR", "PLN", "GBP", "SEK"]);
const countryCodes = new Set(["PL", "DE", "GB", "US", "SE"]);

const isObjectIdString = (value: string): boolean =>
  /^[a-fA-F0-9]{24}$/.test(value);

const toObjectIdMaybe = (value: string): ObjectId | string =>
  isObjectIdString(value) ? new ObjectId(value) : value;

const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.valueOf()) ? null : parsed;
  }
  return null;
};

const toJsonValue = (value: unknown): Prisma.JsonValue => {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof ObjectId) return value.toString();
  if (Array.isArray(value)) {
    return value.map((entry: any) => toJsonValue(entry)) as Prisma.JsonValue;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const entries = Object.entries(record).map(([key, entry]) => [
      key,
      toJsonValue(entry),
    ]);
    return Object.fromEntries(entries) as Prisma.JsonValue;
  }
  return value as Prisma.JsonValue;
};

const normalizeId = (doc: Record<string, unknown>): string => {
  const direct = doc.id;
  if (typeof direct === "string" && direct.trim()) return direct;
  const raw = doc._id;
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object" && "toString" in raw) {
    return (raw as { toString: () => string }).toString();
  }
  return "";
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
    throw operationFailedError("MongoDB is not configured.");
  }
  if (!process.env.DATABASE_URL) {
    throw operationFailedError("Prisma database is not configured.");
  }
};

export async function runDatabaseSync(direction: DatabaseSyncDirection): Promise<DatabaseSyncResult> {
  requireDatabases();
  const startedAt = new Date();
  const backups = await createFullDatabaseBackup();
  const collections: DatabaseSyncCollectionResult[] = [];

  if (direction === "mongo_to_prisma") {
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
        status: "completed",
        sourceCount,
        targetDeleted,
        targetInserted,
        ...(warnings?.length ? { warnings } : null),
      });
    } catch (error) {
      recordResult(results, {
        name,
        status: "failed",
        sourceCount: 0,
        targetDeleted: 0,
        targetInserted: 0,
        error: error instanceof Error ? error.message : "Sync failed.",
      });
      throw error;
    }
  };

  await syncCollection("settings", async () => {
    handledCollections.add("settings");
    const docs = await mongo.collection("settings").find({}).toArray();
    const data = docs
      .map((doc: any) => {
        const key =
          (doc as { key?: string }).key ??
          (doc as unknown as { _id?: ObjectId | string })._id?.toString() ??
          "";
        if (!key) return null;
        const value = (doc as { value?: string }).value;
        return {
          key,
          value: typeof value === "string" ? value : JSON.stringify(value ?? ""),
          createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
          updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
        };
      })
      .filter(Boolean) as Array<{ key: string; value: string; createdAt: Date; updatedAt: Date }>;
    const deleted = await prisma.setting.deleteMany();
    const created = data.length ? await prisma.setting.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection("users", async () => {
    handledCollections.add("users");
    const docs = await mongo.collection("users").find({}).toArray();
    const data = docs
      .map((doc: any) => {
        const id = normalizeId(doc as Record<string, unknown>);
        if (!id) return null;
        return {
          id,
          name: (doc as { name?: string | null }).name ?? null,
          email: (doc as { email?: string | null }).email ?? null,
          emailVerified: toDate((doc as { emailVerified?: Date | string | null }).emailVerified) ?? null,
          image: (doc as { image?: string | null }).image ?? null,
          passwordHash: (doc as { passwordHash?: string | null }).passwordHash ?? null,
        };
      })
      .filter(Boolean) as any;
    const deleted = await prisma.user.deleteMany();
    const created = data.length ? await prisma.user.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection("accounts", async () => {
    handledCollections.add("accounts");
    const docs = await mongo.collection("accounts").find({}).toArray();
    const data = docs
      .map((doc: any) => {
        const id = normalizeId(doc as Record<string, unknown>);
        const userIdRaw = (doc as { userId?: string | ObjectId }).userId;
        const userId = userIdRaw instanceof ObjectId ? userIdRaw.toString() : String(userIdRaw ?? "");
        if (!id || !userId) return null;
        return {
          id,
          userId,
          type: (doc as { type?: string }).type ?? "oauth",
          provider: (doc as { provider?: string }).provider ?? "",
          providerAccountId: (doc as { providerAccountId?: string }).providerAccountId ?? "",
          refresh_token: (doc as { refresh_token?: string | null }).refresh_token ?? null,
          access_token: (doc as { access_token?: string | null }).access_token ?? null,
          expires_at: (doc as { expires_at?: number | null }).expires_at ?? null,
          token_type: (doc as { token_type?: string | null }).token_type ?? null,
          scope: (doc as { scope?: string | null }).scope ?? null,
          id_token: (doc as { id_token?: string | null }).id_token ?? null,
          session_state: (doc as { session_state?: string | null }).session_state ?? null,
        };
      })
      .filter(Boolean) as any;
    const deleted = await prisma.account.deleteMany();
    const created = data.length ? await prisma.account.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection("sessions", async () => {
    handledCollections.add("sessions");
    const docs = await mongo.collection("sessions").find({}).toArray();
    const data = docs
      .map((doc: any) => {
        const id = normalizeId(doc as Record<string, unknown>);
        const userIdRaw = (doc as { userId?: string | ObjectId }).userId;
        const userId = userIdRaw instanceof ObjectId ? userIdRaw.toString() : String(userIdRaw ?? "");
        const sessionToken = (doc as { sessionToken?: string }).sessionToken;
        const expires = toDate((doc as { expires?: Date | string }).expires);
        if (!id || !userId || !sessionToken || !expires) return null;
        return {
          id,
          sessionToken,
          userId,
          expires,
        };
      })
      .filter(Boolean) as any;
    const deleted = await prisma.session.deleteMany();
    const created = data.length ? await prisma.session.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection("verification_tokens", async () => {
    handledCollections.add("verification_tokens");
    const docs = await mongo.collection("verification_tokens").find({}).toArray();
    const data = docs
      .map((doc: any) => {
        const identifier = (doc as { identifier?: string }).identifier;
        const token = (doc as { token?: string }).token;
        const expires = toDate((doc as { expires?: Date | string }).expires);
        if (!identifier || !token || !expires) return null;
        return { identifier, token, expires };
      })
      .filter(Boolean) as any;
    const deleted = await prisma.verificationToken.deleteMany();
    const created = data.length ? await prisma.verificationToken.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection("auth_security_profiles", async () => {
    handledCollections.add("auth_security_profiles");
    const docs = await mongo.collection("auth_security_profiles").find({}).toArray();
    const data = docs
      .map((doc: any) => {
        const id = normalizeId(doc as Record<string, unknown>);
        const userId = (doc as { userId?: string }).userId ?? id;
        if (!userId) return null;
        return {
          id,
          userId,
          mfaEnabled: Boolean((doc as { mfaEnabled?: boolean }).mfaEnabled),
          mfaSecret: (doc as { mfaSecret?: string | null }).mfaSecret ?? null,
          recoveryCodes: (doc as { recoveryCodes?: string[] }).recoveryCodes ?? [],
          allowedIps: (doc as { allowedIps?: string[] }).allowedIps ?? [],
          disabledAt: toDate((doc as { disabledAt?: Date | string | null }).disabledAt),
          bannedAt: toDate((doc as { bannedAt?: Date | string | null }).bannedAt),
          createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
          updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
        };
      })
      .filter(Boolean) as any;
    const deleted = await prisma.authSecurityProfile.deleteMany();
    const created = data.length ? await prisma.authSecurityProfile.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection("auth_login_challenges", async () => {
    handledCollections.add("auth_login_challenges");
    const docs = await mongo.collection("auth_login_challenges").find({}).toArray();
    const data = docs
      .map((doc: any) => {
        const id = normalizeId(doc as Record<string, unknown>);
        if (!id) return null;
        return {
          id,
          data: toJsonValue(doc),
          createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
          updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
        };
      })
      .filter(Boolean) as any;
    const deleted = await prisma.authLoginChallenge.deleteMany();
    const created = data.length ? await prisma.authLoginChallenge.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection("auth_security_attempts", async () => {
    handledCollections.add("auth_security_attempts");
    const docs = await mongo.collection("auth_security_attempts").find({}).toArray();
    const data = docs
      .map((doc: any) => {
        const id = normalizeId(doc as Record<string, unknown>);
        if (!id) return null;
        return {
          id,
          data: toJsonValue(doc),
          createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
          updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
        };
      })
      .filter(Boolean) as any;
    const deleted = await prisma.authSecurityAttempt.deleteMany();
    const created = data.length ? await prisma.authSecurityAttempt.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection("user_preferences", async () => {
    handledCollections.add("user_preferences");
    const docs = await mongo.collection("user_preferences").find({}).toArray();
    const data = docs
      .map((doc: any) => {
        const id = normalizeId(doc as Record<string, unknown>);
        const userId = (doc as { userId?: string }).userId;
        if (!userId) return null;
        return {
          id: id || userId,
          userId,
          productListNameLocale: (doc as { productListNameLocale?: string | null }).productListNameLocale ?? null,
          productListCatalogFilter: (doc as { productListCatalogFilter?: string | null }).productListCatalogFilter ?? null,
          productListCurrencyCode: (doc as { productListCurrencyCode?: string | null }).productListCurrencyCode ?? null,
          productListPageSize: (doc as { productListPageSize?: number | null }).productListPageSize ?? null,
          productListThumbnailSource: (doc as { productListThumbnailSource?: string | null }).productListThumbnailSource ?? null,
          aiPathsActivePathId: (doc as { aiPathsActivePathId?: string | null }).aiPathsActivePathId ?? null,
          aiPathsExpandedGroups: (doc as { aiPathsExpandedGroups?: string[] }).aiPathsExpandedGroups ?? [],
          aiPathsPaletteCollapsed: (doc as { aiPathsPaletteCollapsed?: boolean | null }).aiPathsPaletteCollapsed ?? null,
          aiPathsPathIndex: (doc as { aiPathsPathIndex?: any | null }).aiPathsPathIndex ?? null,
          aiPathsPathConfigs: (doc as { aiPathsPathConfigs?: any | null }).aiPathsPathConfigs ?? null,
          createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
          updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
        };
      })
      .filter(Boolean) as any;
    const deleted = await prisma.userPreferences.deleteMany();
    const created = data.length ? await prisma.userPreferences.createMany({ data }) : { count: 0 };
    return {
      sourceCount: data.length,
      targetDeleted: deleted.count,
      targetInserted: created.count,
      warnings: [
        "Mongo-only user preference fields (adminMenuCollapsed, cms*) are not stored in Prisma.",
      ],
    };
  });

  await syncCollection("system_logs", async () => {
    handledCollections.add("system_logs");
    const docs = await mongo.collection("system_logs").find({}).toArray();
    const data = docs
      .map((doc: any) => {
        const id = normalizeId(doc as Record<string, unknown>);
        return {
          ...(id ? { id } : null),
          level: (doc as { level?: string }).level ?? "error",
          message: (doc as { message?: string }).message ?? "",
          source: (doc as { source?: string | null }).source ?? null,
          context: (doc as { context?: unknown }).context ?? null,
          stack: (doc as { stack?: string | null }).stack ?? null,
          path: (doc as { path?: string | null }).path ?? null,
          method: (doc as { method?: string | null }).method ?? null,
          statusCode: (doc as { statusCode?: number | null }).statusCode ?? null,
          requestId: (doc as { requestId?: string | null }).requestId ?? null,
          userId: (doc as { userId?: string | null }).userId ?? null,
          createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
        };
      })
      .filter(Boolean) as any;
    const deleted = await prisma.systemLog.deleteMany();
    const created = data.length ? await prisma.systemLog.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection("ai_configurations", async () => {
    handledCollections.add("ai_configurations");
    const docs = await mongo.collection("ai_configurations").find({}).toArray();
    const data = docs
      .map((doc: any) => {
        const id = normalizeId(doc as Record<string, unknown>);
        if (!id) return null;
        return {
          id,
          type: (doc as { type?: string | null }).type ?? null,
          descriptionGenerationModel: (doc as { descriptionGenerationModel?: string | null }).descriptionGenerationModel ?? null,
          generationInputPrompt: (doc as { generationInputPrompt?: string | null }).generationInputPrompt ?? null,
          generationOutputEnabled: Boolean((doc as { generationOutputEnabled?: boolean }).generationOutputEnabled),
          generationOutputPrompt: (doc as { generationOutputPrompt?: string | null }).generationOutputPrompt ?? null,
          imageAnalysisModel: (doc as { imageAnalysisModel?: string | null }).imageAnalysisModel ?? null,
          visionInputPrompt: (doc as { visionInputPrompt?: string | null }).visionInputPrompt ?? null,
          visionOutputEnabled: Boolean((doc as { visionOutputEnabled?: boolean }).visionOutputEnabled),
          visionOutputPrompt: (doc as { visionOutputPrompt?: string | null }).visionOutputPrompt ?? null,
          testProductId: (doc as { testProductId?: string | null }).testProductId ?? null,
          createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
          updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
        };
      })
      .filter(Boolean) as any;
    const deleted = await prisma.aiConfiguration.deleteMany();
    const created = data.length ? await prisma.aiConfiguration.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection("chatbot_sessions", async () => {
    handledCollections.add("chatbot_sessions");
    const docs = await mongo.collection("chatbot_sessions").find({}).toArray();
    const sessions = docs
      .map((doc: any) => {
        const id = normalizeId(doc as Record<string, unknown>);
        if (!id) return null;
        return {
          id,
          title: (doc as { title?: string | null }).title ?? null,
          createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
          updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
          messages: Array.isArray((doc as { messages?: unknown[] }).messages)
            ? (doc as { messages?: Array<{ role: string; content: string; createdAt?: Date }> }).messages ?? []
            : [],
        };
      })
      .filter(Boolean) as Array<{ id: string; title: string | null; createdAt: Date; updatedAt: Date; messages: Array<{ role: string; content: string; createdAt?: Date }> }>;

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

  await syncCollection("chatbot_jobs", async () => {
    handledCollections.add("chatbot_jobs");
    const docs = await mongo.collection("chatbot_jobs").find({}).toArray();
    const data = docs
      .map((doc: any) => {
        const id = normalizeId(doc as Record<string, unknown>);
        const sessionId = (doc as { sessionId?: string }).sessionId;
        if (!id || !sessionId) return null;
        return {
          id,
          sessionId,
          status: (doc as { status?: string }).status ?? "pending",
          model: (doc as { model?: string | null }).model ?? null,
          payload: (doc as { payload?: any }).payload ?? null,
          resultText: (doc as { resultText?: string | null }).resultText ?? null,
          errorMessage: (doc as { errorMessage?: string | null }).errorMessage ?? null,
          createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
          startedAt: toDate((doc as { startedAt?: Date | string | null }).startedAt),
          finishedAt: toDate((doc as { finishedAt?: Date | string | null }).finishedAt),
        };
      })
      .filter(Boolean) as any;
    const deleted = await prisma.chatbotJob.deleteMany();
    const created = data.length ? await prisma.chatbotJob.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection("currencies", async () => {
    handledCollections.add("currencies");
    const docs = await mongo.collection("currencies").find({}).toArray();
    const warnings: string[] = [];
    const data = docs
      .map((doc: any) => {
        const code = String((doc as { code?: string }).code ?? "").toUpperCase();
        if (!currencyCodes.has(code)) {
          warnings.push(`Skipped currency code: ${code || "unknown"}`);
          return null;
        }
        const id = (doc as { id?: string }).id ?? code;
        return {
          id,
          code,
          name: (doc as { name?: string }).name ?? code,
          symbol: (doc as { symbol?: string | null }).symbol ?? null,
          createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
          updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
        };
      })
      .filter(Boolean) as any;
    const deleted = await prisma.currency.deleteMany();
    const created = data.length ? await prisma.currency.createMany({ data }) : { count: 0 };
    return {
      sourceCount: data.length,
      targetDeleted: deleted.count,
      targetInserted: created.count,
      ...(warnings.length ? { warnings } : null),
    };
  });

  await syncCollection("countries", async () => {
    handledCollections.add("countries");
    const docs = await mongo.collection("countries").find({}).toArray();
    const warnings: string[] = [];
    const data = docs
      .map((doc: any) => {
        const code = String((doc as { code?: string }).code ?? "").toUpperCase();
        if (!countryCodes.has(code)) {
          warnings.push(`Skipped country code: ${code || "unknown"}`);
          return null;
        }
        const id = (doc as { id?: string }).id ?? code;
        return {
          id,
          code,
          name: (doc as { name?: string }).name ?? code,
          createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
          updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
          currencyIds: Array.isArray((doc as { currencyIds?: string[] }).currencyIds)
            ? (doc as { currencyIds?: string[] }).currencyIds ?? []
            : [],
        };
      })
      .filter(Boolean) as Array<{ id: string; code: string; name: string; createdAt: Date; updatedAt: Date; currencyIds: string[] }>;

    const deleted = await prisma.country.deleteMany();
    const created = data.length
      ? await prisma.country.createMany({
          data: data.map(({ currencyIds, ...rest }) => rest) as Prisma.CountryCreateManyInput[],
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

  await syncCollection("languages", async () => {
    handledCollections.add("languages");
    const docs = await mongo.collection("languages").find({}).toArray();
    const data = docs
      .map((doc: any) => {
        const code = String((doc as { code?: string }).code ?? "").toUpperCase();
        if (!code) return null;
        return {
          id: (doc as { id?: string }).id ?? code,
          code,
          name: (doc as { name?: string }).name ?? code,
          nativeName: (doc as { nativeName?: string | null }).nativeName ?? null,
          createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
          updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
          countries: Array.isArray((doc as { countries?: unknown[] }).countries)
            ? (doc as { countries?: Array<{ countryId: string }> }).countries ?? []
            : [],
        };
      })
      .filter(Boolean) as Array<{ id: string; code: string; name: string; nativeName: string | null; createdAt: Date; updatedAt: Date; countries: Array<{ countryId: string }> }>;

    const deleted = await prisma.language.deleteMany();
    const created = data.length
      ? await prisma.language.createMany({
          data: data.map(({ countries, ...rest }) => rest) as Prisma.LanguageCreateManyInput[],
        })
      : { count: 0 };

    const joinRows = data.flatMap((lang) =>
      lang.countries.map((entry: any) => ({
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

  await syncCollection("price_groups", async () => {
    handledCollections.add("price_groups");
    const docs = await mongo.collection("price_groups").find({}).toArray();
    const data = docs
      .map((doc: any) => {
        const id = normalizeId(doc as Record<string, unknown>);
        if (!id) return null;
        return {
          id,
          groupId: (doc as { groupId?: string }).groupId ?? id,
          isDefault: Boolean((doc as { isDefault?: boolean }).isDefault),
          name: (doc as { name?: string }).name ?? id,
          description: (doc as { description?: string | null }).description ?? null,
          currencyId: (doc as { currencyId?: string }).currencyId ?? "PLN",
          type: (doc as { type?: string }).type ?? "standard",
          basePriceField: (doc as { basePriceField?: string }).basePriceField ?? "price",
          sourceGroupId: (doc as { sourceGroupId?: string | null }).sourceGroupId ?? null,
          priceMultiplier: (doc as { priceMultiplier?: number }).priceMultiplier ?? 1,
          addToPrice: (doc as { addToPrice?: number }).addToPrice ?? 0,
          createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
          updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
        };
      })
      .filter(Boolean) as any;
    const deleted = await prisma.priceGroup.deleteMany();
    const created = data.length ? await prisma.priceGroup.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection("catalogs", async () => {
    handledCollections.add("catalogs");
    const docs = await mongo.collection("catalogs").find({}).toArray();
    const data = docs
      .map((doc: any) => {
        const id = normalizeId(doc as Record<string, unknown>);
        if (!id) return null;
        return {
          id,
          name: (doc as { name?: string }).name ?? id,
          description: (doc as { description?: string | null }).description ?? null,
          isDefault: Boolean((doc as { isDefault?: boolean }).isDefault),
          defaultLanguageId: (doc as { defaultLanguageId?: string | null }).defaultLanguageId ?? null,
          defaultPriceGroupId: (doc as { defaultPriceGroupId?: string | null }).defaultPriceGroupId ?? null,
          priceGroupIds: (doc as { priceGroupIds?: string[] }).priceGroupIds ?? [],
          createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
          updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
          languageIds: (doc as { languageIds?: string[] }).languageIds ?? [],
        };
      })
      .filter(Boolean) as Array<{ id: string; name: string; description: string | null; isDefault: boolean; defaultLanguageId: string | null; defaultPriceGroupId: string | null; priceGroupIds: string[]; createdAt: Date; updatedAt: Date; languageIds: string[] }>;
    const deleted = await prisma.catalog.deleteMany();
    const created = data.length
      ? await prisma.catalog.createMany({
          data: data.map(({ languageIds, ...rest }) => rest) as Prisma.CatalogCreateManyInput[],
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

    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection("product_categories", async () => {
    handledCollections.add("product_categories");
    const docs = await mongo.collection("product_categories").find({}).toArray();
    const data = docs
      .map((doc: any) => {
        const id = normalizeId(doc as Record<string, unknown>);
        if (!id) return null;
        return {
          id,
          name: (doc as { name?: string }).name ?? id,
          description: (doc as { description?: string | null }).description ?? null,
          color: (doc as { color?: string | null }).color ?? null,
          parentId: (doc as { parentId?: string | null }).parentId ?? null,
          catalogId: (doc as { catalogId?: string }).catalogId ?? "",
          createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
          updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
        };
      })
      .filter(Boolean) as any;
    const deleted = await prisma.productCategory.deleteMany();
    const created = data.length ? await prisma.productCategory.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection("product_tags", async () => {
    handledCollections.add("product_tags");
    const docs = await mongo.collection("product_tags").find({}).toArray();
    const data = docs
      .map((doc: any) => {
        const id = normalizeId(doc as Record<string, unknown>);
        if (!id) return null;
        return {
          id,
          name: (doc as { name?: string }).name ?? id,
          color: (doc as { color?: string | null }).color ?? null,
          catalogId: (doc as { catalogId?: string }).catalogId ?? "",
          createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
          updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
        };
      })
      .filter(Boolean) as any;
    const deleted = await prisma.productTag.deleteMany();
    const created = data.length ? await prisma.productTag.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection("product_parameters", async () => {
    handledCollections.add("product_parameters");
    const docs = await mongo.collection("product_parameters").find({}).toArray();
    const data = docs
      .map((doc: any) => {
        const id = normalizeId(doc as Record<string, unknown>);
        if (!id) return null;
        return {
          id,
          catalogId: (doc as { catalogId?: string }).catalogId ?? "",
          name_en: (doc as { name_en?: string }).name_en ?? "",
          name_pl: (doc as { name_pl?: string | null }).name_pl ?? null,
          name_de: (doc as { name_de?: string | null }).name_de ?? null,
          createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
          updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
        };
      })
      .filter(Boolean) as any;
    const deleted = await prisma.productParameter.deleteMany();
    const created = data.length ? await prisma.productParameter.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection("image_files", async () => {
    handledCollections.add("image_files");
    const docs = await mongo.collection("image_files").find({}).toArray();
    const data = docs
      .map((doc: any) => {
        const id = normalizeId(doc as Record<string, unknown>);
        if (!id) return null;
        return {
          id,
          filename: (doc as { filename?: string }).filename ?? "",
          filepath: (doc as { filepath?: string }).filepath ?? "",
          mimetype: (doc as { mimetype?: string }).mimetype ?? "",
          size: (doc as { size?: number }).size ?? 0,
          width: (doc as { width?: number | null }).width ?? null,
          height: (doc as { height?: number | null }).height ?? null,
          tags: (doc as { tags?: string[] }).tags ?? [],
          createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
          updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
        };
      })
      .filter(Boolean) as any;
    const deleted = await prisma.imageFile.deleteMany();
    const created = data.length ? await prisma.imageFile.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection("products", async () => {
    handledCollections.add("products");
    const docs = await mongo.collection("products").find({}).toArray();
    const data = docs
      .map((doc: any) => {
        const id = normalizeId(doc as Record<string, unknown>);
        if (!id) return null;
        return {
          id,
          sku: (doc as { sku?: string | null }).sku ?? null,
          baseProductId: (doc as { baseProductId?: string | null }).baseProductId ?? null,
          defaultPriceGroupId: (doc as { defaultPriceGroupId?: string | null }).defaultPriceGroupId ?? null,
          ean: (doc as { ean?: string | null }).ean ?? null,
          gtin: (doc as { gtin?: string | null }).gtin ?? null,
          asin: (doc as { asin?: string | null }).asin ?? null,
          name_en: (doc as { name_en?: string | null }).name_en ?? null,
          name_pl: (doc as { name_pl?: string | null }).name_pl ?? null,
          name_de: (doc as { name_de?: string | null }).name_de ?? null,
          description_en: (doc as { description_en?: string | null }).description_en ?? null,
          description_pl: (doc as { description_pl?: string | null }).description_pl ?? null,
          description_de: (doc as { description_de?: string | null }).description_de ?? null,
          supplierName: (doc as { supplierName?: string | null }).supplierName ?? null,
          supplierLink: (doc as { supplierLink?: string | null }).supplierLink ?? null,
          priceComment: (doc as { priceComment?: string | null }).priceComment ?? null,
          stock: (doc as { stock?: number | null }).stock ?? null,
          price: (doc as { price?: number | null }).price ?? null,
          sizeLength: (doc as { sizeLength?: number | null }).sizeLength ?? null,
          sizeWidth: (doc as { sizeWidth?: number | null }).sizeWidth ?? null,
          weight: (doc as { weight?: number | null }).weight ?? null,
          length: (doc as { length?: number | null }).length ?? null,
          parameters: (doc as { parameters?: any[] }).parameters ?? [],
          imageLinks: (doc as { imageLinks?: string[] }).imageLinks ?? [],
          imageBase64s: (doc as { imageBase64s?: string[] }).imageBase64s ?? [],
          createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
          updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
          images: Array.isArray((doc as { images?: unknown[] }).images)
            ? (doc as { images?: Array<{ imageFileId: string; assignedAt?: Date }> }).images ?? []
            : [],
          catalogs: Array.isArray((doc as { catalogs?: unknown[] }).catalogs)
            ? (doc as { catalogs?: Array<{ catalogId: string; assignedAt?: Date }> }).catalogs ?? []
            : [],
          categories: Array.isArray((doc as { categories?: unknown[] }).categories)
            ? (doc as { categories?: Array<{ categoryId: string; assignedAt?: Date }> }).categories ?? []
            : [],
          tags: Array.isArray((doc as { tags?: unknown[] }).tags)
            ? (doc as { tags?: Array<{ tagId: string; assignedAt?: Date }> }).tags ?? []
            : [],
        };
      })
      .filter(Boolean) as Array<{
        id: string;
        sku: string | null;
        baseProductId: string | null;
        defaultPriceGroupId: string | null;
        ean: string | null;
        gtin: string | null;
        asin: string | null;
        name_en: string | null;
        name_pl: string | null;
        name_de: string | null;
        description_en: string | null;
        description_pl: string | null;
        description_de: string | null;
        supplierName: string | null;
        supplierLink: string | null;
        priceComment: string | null;
        stock: number | null;
        price: number | null;
        sizeLength: number | null;
        sizeWidth: number | null;
        weight: number | null;
        length: number | null;
        parameters: any[];
        imageLinks: string[];
        imageBase64s: string[];
        createdAt: Date;
        updatedAt: Date;
        images: Array<{ imageFileId: string; assignedAt?: Date }>;
        catalogs: Array<{ catalogId: string; assignedAt?: Date }>;
        categories: Array<{ categoryId: string; assignedAt?: Date }>;
        tags: Array<{ tagId: string; assignedAt?: Date }>;
      }>;

    await prisma.productImage.deleteMany();
    await prisma.productCatalog.deleteMany();
    await prisma.productCategoryAssignment.deleteMany();
    await prisma.productTagAssignment.deleteMany();

    const deleted = await prisma.product.deleteMany();
    const created = data.length
      ? await prisma.product.createMany({
          data: data.map(({ images, catalogs, categories, tags, ...rest }) => rest) as Prisma.ProductCreateManyInput[],
        })
      : { count: 0 };

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

    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection("product_drafts", async () => {
    handledCollections.add("product_drafts");
    const docs = await mongo.collection("product_drafts").find({}).toArray();
    const data = docs
      .map((doc: any) => {
        const id = normalizeId(doc as Record<string, unknown>);
        if (!id) return null;
        return {
          id,
          name: (doc as { name?: string }).name ?? "",
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
          categoryIds: (doc as { categoryIds?: any[] }).categoryIds ?? [],
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
      .filter(Boolean) as any;
    const deleted = await prisma.productDraft.deleteMany();
    const created = data.length ? await prisma.productDraft.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection("cms_slugs", async () => {
    handledCollections.add("cms_slugs");
    const docs = await mongo.collection("cms_slugs").find({}).toArray();
    const data = docs
      .map((doc: any) => {
        const id = normalizeId(doc as Record<string, unknown>);
        if (!id) return null;
        return {
          id,
          slug: (doc as { slug?: string }).slug ?? "",
          isDefault: Boolean((doc as { isDefault?: boolean }).isDefault),
          createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
          updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
        };
      })
      .filter(Boolean) as any;
    const deleted = await prisma.slug.deleteMany();
    const created = data.length ? await prisma.slug.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection("cms_themes", async () => {
    handledCollections.add("cms_themes");
    const docs = await mongo.collection("cms_themes").find({}).toArray();
    const data = docs
      .map((doc: any) => {
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
      .filter(Boolean) as any;
    const deleted = await prisma.cmsTheme.deleteMany();
    const created = data.length ? await prisma.cmsTheme.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection("cms_pages", async () => {
    handledCollections.add("cms_pages");
    const docs = await mongo.collection("cms_pages").find({}).toArray();
    const data = docs
      .map((doc: any) => {
        const id = normalizeId(doc as Record<string, unknown>);
        if (!id) return null;
        return {
          id,
          name: (doc as { name?: string }).name ?? id,
          status: (doc as { status?: string }).status ?? "draft",
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
          data: data.map(({ components, ...rest }) => rest) as Prisma.PageCreateManyInput[],
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

  await syncCollection("cms_page_slugs", async () => {
    handledCollections.add("cms_page_slugs");
    const docs = await mongo.collection("cms_page_slugs").find({}).toArray();
    const data = docs
      .map((doc: any) => {
        const pageId = (doc as { pageId?: string }).pageId;
        const slugId = (doc as { slugId?: string }).slugId;
        if (!pageId || !slugId) return null;
        return {
          pageId,
          slugId,
          assignedAt: (doc as { assignedAt?: Date }).assignedAt ?? new Date(),
        };
      })
      .filter(Boolean) as any;
    const deleted = await prisma.pageSlug.deleteMany();
    const created = data.length ? await prisma.pageSlug.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection("cms_domains", async () => {
    handledCollections.add("cms_domains");
    const docs = await mongo.collection("cms_domains").find({}).toArray();
    const data = docs
      .map((doc: any) => {
        const id = normalizeId(doc as Record<string, unknown>);
        if (!id) return null;
        return {
          id,
          domain: (doc as { domain?: string }).domain ?? "",
          aliasOf: (doc as { aliasOf?: string | null }).aliasOf ?? null,
          createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
          updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
        };
      })
      .filter(Boolean) as any;
    const deleted = await prisma.cmsDomain.deleteMany();
    const created = data.length ? await prisma.cmsDomain.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection("cms_domain_slugs", async () => {
    handledCollections.add("cms_domain_slugs");
    const docs = await mongo.collection("cms_domain_slugs").find({}).toArray();
    const data = docs
      .map((doc: any) => {
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
      .filter(Boolean) as any;
    const deleted = await prisma.cmsDomainSlug.deleteMany();
    const created = data.length ? await prisma.cmsDomainSlug.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection("notebooks", async () => {
    handledCollections.add("notebooks");
    const docs = await mongo.collection("notebooks").find({}).toArray();
    const data = docs
      .map((doc: any) => {
        const id = normalizeId(doc as Record<string, unknown>);
        if (!id) return null;
        return {
          id,
          name: (doc as { name?: string }).name ?? id,
          color: (doc as { color?: string | null }).color ?? null,
          defaultThemeId: (doc as { defaultThemeId?: string | null }).defaultThemeId ?? null,
          createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
          updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
        };
      })
      .filter(Boolean) as any;
    const deleted = await prisma.notebook.deleteMany();
    const created = data.length ? await prisma.notebook.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection("themes", async () => {
    handledCollections.add("themes");
    const docs = await mongo.collection("themes").find({}).toArray();
    const data = docs
      .map((doc: any) => {
        const id = normalizeId(doc as Record<string, unknown>);
        if (!id) return null;
        return {
          id,
          name: (doc as { name?: string }).name ?? id,
          notebookId: (doc as { notebookId?: string | null }).notebookId ?? null,
          textColor: (doc as { textColor?: string }).textColor ?? "#e5e7eb",
          backgroundColor: (doc as { backgroundColor?: string }).backgroundColor ?? "#111827",
          markdownHeadingColor: (doc as { markdownHeadingColor?: string }).markdownHeadingColor ?? "#ffffff",
          markdownLinkColor: (doc as { markdownLinkColor?: string }).markdownLinkColor ?? "#60a5fa",
          markdownCodeBackground: (doc as { markdownCodeBackground?: string }).markdownCodeBackground ?? "#1f2937",
          markdownCodeText: (doc as { markdownCodeText?: string }).markdownCodeText ?? "#e5e7eb",
          relatedNoteBorderWidth: (doc as { relatedNoteBorderWidth?: number }).relatedNoteBorderWidth ?? 1,
          relatedNoteBorderColor: (doc as { relatedNoteBorderColor?: string }).relatedNoteBorderColor ?? "#374151",
          relatedNoteBackgroundColor: (doc as { relatedNoteBackgroundColor?: string }).relatedNoteBackgroundColor ?? "#1f2937",
          relatedNoteTextColor: (doc as { relatedNoteTextColor?: string }).relatedNoteTextColor ?? "#e5e7eb",
          createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
          updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
        };
      })
      .filter(Boolean) as any;
    const deleted = await prisma.theme.deleteMany();
    const created = data.length ? await prisma.theme.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection("tags", async () => {
    handledCollections.add("tags");
    const docs = await mongo.collection("tags").find({}).toArray();
    const data = docs
      .map((doc: any) => {
        const id = normalizeId(doc as Record<string, unknown>);
        if (!id) return null;
        return {
          id,
          name: (doc as { name?: string }).name ?? id,
          color: (doc as { color?: string | null }).color ?? null,
          notebookId: (doc as { notebookId?: string | null }).notebookId ?? null,
          createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
          updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
        };
      })
      .filter(Boolean) as any;
    const deleted = await prisma.tag.deleteMany();
    const created = data.length ? await prisma.tag.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection("categories", async () => {
    handledCollections.add("categories");
    const docs = await mongo.collection("categories").find({}).toArray();
    const data = docs
      .map((doc: any) => {
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
      .filter(Boolean) as any;
    const deleted = await prisma.category.deleteMany();
    const created = data.length ? await prisma.category.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection("notes", async () => {
    handledCollections.add("notes");
    const docs = await mongo.collection("notes").find({}).toArray();
    const notes = docs
      .map((doc: any) => {
        const id = normalizeId(doc as Record<string, unknown>);
        if (!id) return null;
        return {
          id,
          title: (doc as { title?: string }).title ?? "",
          content: (doc as { content?: string }).content ?? "",
          editorType: (doc as { editorType?: string }).editorType ?? "markdown",
          color: (doc as { color?: string | null }).color ?? null,
          isPinned: Boolean((doc as { isPinned?: boolean }).isPinned),
          isArchived: Boolean((doc as { isArchived?: boolean }).isArchived),
          isFavorite: Boolean((doc as { isFavorite?: boolean }).isFavorite),
          notebookId: (doc as { notebookId?: string | null }).notebookId ?? null,
          createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
          updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
          tags: Array.isArray((doc as { tags?: unknown[] }).tags)
            ? (doc as { tags?: Array<{ tagId: string; assignedAt?: Date }> }).tags ?? []
            : [],
          categories: Array.isArray((doc as { categories?: unknown[] }).categories)
            ? (doc as { categories?: Array<{ categoryId: string; assignedAt?: Date }> }).categories ?? []
            : [],
          relationsFrom: Array.isArray((doc as { relationsFrom?: unknown[] }).relationsFrom)
            ? (doc as { relationsFrom?: Array<{ targetNoteId: string; assignedAt?: Date }> }).relationsFrom ?? []
            : [],
        };
      })
      .filter(Boolean) as Array<{
        id: string;
        title: string;
        content: string;
        editorType: string;
        color: string | null;
        isPinned: boolean;
        isArchived: boolean;
        isFavorite: boolean;
        notebookId: string | null;
        createdAt: Date;
        updatedAt: Date;
        tags: Array<{ tagId: string; assignedAt?: Date }>;
        categories: Array<{ categoryId: string; assignedAt?: Date }>;
        relationsFrom: Array<{ targetNoteId: string; assignedAt?: Date }>;
      }>;

    await prisma.noteRelation.deleteMany();
    await prisma.noteTag.deleteMany();
    await prisma.noteCategory.deleteMany();
    await prisma.noteFile.deleteMany();
    const deleted = await prisma.note.deleteMany();
    const created = notes.length
      ? await prisma.note.createMany({
          data: notes.map(({ tags, categories, relationsFrom, ...rest }) => rest) as Prisma.NoteCreateManyInput[],
        })
      : { count: 0 };

    const noteTags = notes.flatMap((note) =>
      note.tags.map((tag) => ({
        noteId: note.id,
        tagId: tag.tagId,
        assignedAt: tag.assignedAt ?? note.createdAt,
      }))
    ) as Prisma.NoteTagCreateManyInput[];
    if (noteTags.length) {
      await prisma.noteTag.createMany({ data: noteTags });
    }

    const noteCategories = notes.flatMap((note) =>
      note.categories.map((category) => ({
        noteId: note.id,
        categoryId: category.categoryId,
        assignedAt: category.assignedAt ?? note.createdAt,
      }))
    ) as Prisma.NoteCategoryCreateManyInput[];
    if (noteCategories.length) {
      await prisma.noteCategory.createMany({ data: noteCategories });
    }

    const noteRelations = notes.flatMap((note) =>
      note.relationsFrom.map((relation) => ({
        sourceNoteId: note.id,
        targetNoteId: relation.targetNoteId,
        assignedAt: relation.assignedAt ?? note.createdAt,
      }))
    ) as Prisma.NoteRelationCreateManyInput[];
    if (noteRelations.length) {
      await prisma.noteRelation.createMany({ data: noteRelations });
    }

    return { sourceCount: notes.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection("note_files", async () => {
    handledCollections.add("noteFiles");
    const docs = await mongo.collection("noteFiles").find({}).toArray();
    const data = docs
      .map((doc: any) => {
        const id = normalizeId(doc as Record<string, unknown>);
        const noteId = (doc as { noteId?: string }).noteId;
        if (!id || !noteId) return null;
        return {
          id,
          noteId,
          slotIndex: (doc as { slotIndex?: number }).slotIndex ?? 0,
          filename: (doc as { filename?: string }).filename ?? "",
          filepath: (doc as { filepath?: string }).filepath ?? "",
          mimetype: (doc as { mimetype?: string }).mimetype ?? "",
          size: (doc as { size?: number }).size ?? 0,
          width: (doc as { width?: number | null }).width ?? null,
          height: (doc as { height?: number | null }).height ?? null,
          createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
          updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
        };
      })
      .filter(Boolean) as any;
    const deleted = await prisma.noteFile.deleteMany();
    const created = data.length ? await prisma.noteFile.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection("product_ai_jobs", async () => {
    handledCollections.add("product_ai_jobs");
    const docs = await mongo.collection("product_ai_jobs").find({}).toArray();
    const data = docs
      .map((doc: any) => {
        const id = normalizeId(doc as Record<string, unknown>);
        const productId = (doc as { productId?: string }).productId;
        if (!id || !productId) return null;
        return {
          id,
          productId,
          status: (doc as { status?: string }).status ?? "pending",
          type: (doc as { type?: string }).type ?? "description_generation",
          payload: (doc as { payload?: any }).payload ?? {},
          result: (doc as { result?: any }).result ?? null,
          errorMessage: (doc as { errorMessage?: string | null }).errorMessage ?? null,
          createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
          startedAt: toDate((doc as { startedAt?: Date | string | null }).startedAt),
          finishedAt: toDate((doc as { finishedAt?: Date | string | null }).finishedAt),
        };
      })
      .filter(Boolean) as any;
    const deleted = await prisma.productAiJob.deleteMany();
    const created = data.length ? await prisma.productAiJob.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection("ai_path_runs", async () => {
    handledCollections.add("ai_path_runs");
    const docs = await mongo.collection("ai_path_runs").find({}).toArray();
    const data = docs
      .map((doc: any) => {
        const id = normalizeId(doc as Record<string, unknown>);
        if (!id) return null;
        return {
          id,
          userId: (doc as { userId?: string | null }).userId ?? null,
          pathId: (doc as { pathId?: string }).pathId ?? "",
          pathName: (doc as { pathName?: string | null }).pathName ?? null,
          status: (doc as { status?: string }).status ?? "queued",
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
      .filter(Boolean) as any;
    await prisma.aiPathRunNode.deleteMany();
    await prisma.aiPathRunEvent.deleteMany();
    const deleted = await prisma.aiPathRun.deleteMany();
    const created = data.length ? await prisma.aiPathRun.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection("ai_path_run_nodes", async () => {
    handledCollections.add("ai_path_run_nodes");
    const docs = await mongo.collection("ai_path_run_nodes").find({}).toArray();
    const data = docs
      .map((doc: any) => {
        const id = normalizeId(doc as Record<string, unknown>);
        const runId = (doc as { runId?: string }).runId;
        if (!id || !runId) return null;
        return {
          id,
          runId,
          nodeId: (doc as { nodeId?: string }).nodeId ?? "",
          nodeType: (doc as { nodeType?: string }).nodeType ?? "",
          nodeTitle: (doc as { nodeTitle?: string | null }).nodeTitle ?? null,
          status: (doc as { status?: string }).status ?? "pending",
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
      .filter(Boolean) as any;
    const deleted = await prisma.aiPathRunNode.deleteMany();
    const created = data.length ? await prisma.aiPathRunNode.createMany({ data }) : { count: 0 };
    return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
  });

  await syncCollection("ai_path_run_events", async () => {
    handledCollections.add("ai_path_run_events");
    const docs = await mongo.collection("ai_path_run_events").find({}).toArray();
    const data = docs
      .map((doc: any) => {
        const id = normalizeId(doc as Record<string, unknown>);
        const runId = (doc as { runId?: string }).runId;
        if (!id || !runId) return null;
        return {
          id,
          runId,
          level: (doc as { level?: string }).level ?? "info",
          message: (doc as { message?: string }).message ?? "",
          metadata: (doc as { metadata?: any | null }).metadata ?? null,
          createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
        };
      })
      .filter(Boolean) as any;
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
      name: "unmapped_collections",
      status: "skipped",
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
        status: "completed",
        sourceCount,
        targetDeleted,
        targetInserted,
        ...(warnings?.length ? { warnings } : null),
      });
    } catch (error) {
      recordResult(results, {
        name,
        status: "failed",
        sourceCount: 0,
        targetDeleted: 0,
        targetInserted: 0,
        error: error instanceof Error ? error.message : "Sync failed.",
      });
      throw error;
    }
  };

  await syncCollection("settings", async () => {
    const rows = await prisma.setting.findMany();
    const docs = rows.map((row: any) => ({
      _id: row.key,
      key: row.key,
      value: row.value,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    const collection = mongo.collection("settings");
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection("users", async () => {
    const rows = await prisma.user.findMany();
    const docs = rows.map((row: any) => ({
      _id: toObjectIdMaybe(row.id),
      id: row.id,
      name: row.name ?? null,
      email: row.email ?? null,
      emailVerified: row.emailVerified ?? null,
      image: row.image ?? null,
      passwordHash: row.passwordHash ?? null,
    }));
    const collection = mongo.collection("users");
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
      result.warnings = ["Some user IDs are not ObjectId strings; Mongo auth adapters may not accept them."];
    }
    return result;
  });

  await syncCollection("accounts", async () => {
    const rows = await prisma.account.findMany();
    const docs = rows.map((row: any) => ({
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
    const collection = mongo.collection("accounts");
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection("sessions", async () => {
    const rows = await prisma.session.findMany();
    const docs = rows.map((row: any) => ({
      _id: toObjectIdMaybe(row.id),
      id: row.id,
      sessionToken: row.sessionToken,
      userId: toObjectIdMaybe(row.userId),
      expires: row.expires,
    }));
    const collection = mongo.collection("sessions");
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection("verification_tokens", async () => {
    const rows = await prisma.verificationToken.findMany();
    const docs = rows.map((row: any) => ({
      identifier: row.identifier,
      token: row.token,
      expires: row.expires,
    }));
    const collection = mongo.collection("verification_tokens");
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection("auth_security_profiles", async () => {
    const rows = await prisma.authSecurityProfile.findMany();
    const docs = rows.map((row: any) => ({
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
    const collection = mongo.collection("auth_security_profiles");
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection("auth_login_challenges", async () => {
    const rows = await prisma.authLoginChallenge.findMany();
    const docs = rows.map((row) => {
      const data = row.data && typeof row.data === "object" ? (row.data as Record<string, unknown>) : {};
      const { _id: _ignored, ...rest } = data;
      return {
        _id: toObjectIdMaybe(row.id),
        ...rest,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    });
    const collection = mongo.collection("auth_login_challenges");
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection("auth_security_attempts", async () => {
    const rows = await prisma.authSecurityAttempt.findMany();
    const docs = rows.map((row) => {
      const data = row.data && typeof row.data === "object" ? (row.data as Record<string, unknown>) : {};
      const { _id: _ignored, ...rest } = data;
      return {
        _id: toObjectIdMaybe(row.id),
        ...rest,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    });
    const collection = mongo.collection("auth_security_attempts");
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection("user_preferences", async () => {
    const rows = await prisma.userPreferences.findMany();
    const docs = rows.map((row: any) => ({
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
    const collection = mongo.collection("user_preferences");
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return {
      sourceCount: rows.length,
      targetDeleted: deleted.deletedCount ?? 0,
      targetInserted: docs.length,
      warnings: ["Mongo-only user preference fields (adminMenuCollapsed, cms*) are not restored from Prisma."],
    };
  });

  await syncCollection("system_logs", async () => {
    const rows = await prisma.systemLog.findMany();
    const docs = rows.map((row: any) => ({
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
    const collection = mongo.collection("system_logs");
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection("ai_configurations", async () => {
    const rows = await prisma.aiConfiguration.findMany();
    const docs = rows.map((row: any) => ({
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
    const collection = mongo.collection("ai_configurations");
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection("chatbot_sessions", async () => {
    const sessions = await prisma.chatbotSession.findMany({
      include: { messages: { orderBy: { createdAt: "asc" } } },
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
    const collection = mongo.collection("chatbot_sessions");
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: sessions.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection("chatbot_jobs", async () => {
    const rows = await prisma.chatbotJob.findMany();
    const docs = rows.map((row: any) => ({
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
    const collection = mongo.collection("chatbot_jobs");
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection("currencies", async () => {
    const rows = await prisma.currency.findMany();
    const docs = rows.map((row: any) => ({
      _id: row.id,
      id: row.id,
      code: row.code,
      name: row.name,
      symbol: row.symbol ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    const collection = mongo.collection("currencies");
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection("countries", async () => {
    const rows = await prisma.country.findMany({ include: { currencies: true } });
    const docs = rows.map((row: any) => ({
      _id: row.id,
      id: row.id,
      code: row.code,
      name: row.name,
      currencyIds: row.currencies.map((entry: { currencyId: string }) => entry.currencyId),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    const collection = mongo.collection("countries");
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection("languages", async () => {
    const rows = await prisma.language.findMany({ include: { countries: { include: { country: true } } } });
    const docs = rows.map((row: any) => ({
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
    const collection = mongo.collection("languages");
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection("price_groups", async () => {
    const rows = await prisma.priceGroup.findMany();
    const docs = rows.map((row: any) => ({
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
    const collection = mongo.collection("price_groups");
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection("catalogs", async () => {
    const rows = await prisma.catalog.findMany({ include: { languages: true } });
    const docs = rows.map((row: any) => ({
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
    const collection = mongo.collection("catalogs");
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection("product_categories", async () => {
    const rows = await prisma.productCategory.findMany();
    const docs = rows.map((row: any) => ({
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
    const collection = mongo.collection("product_categories");
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection("product_tags", async () => {
    const rows = await prisma.productTag.findMany();
    const docs = rows.map((row: any) => ({
      _id: row.id,
      id: row.id,
      name: row.name,
      color: row.color ?? null,
      catalogId: row.catalogId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    const collection = mongo.collection("product_tags");
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection("product_parameters", async () => {
    const rows = await prisma.productParameter.findMany();
    const docs = rows.map((row: any) => ({
      _id: row.id,
      id: row.id,
      catalogId: row.catalogId,
      name_en: row.name_en,
      name_pl: row.name_pl ?? null,
      name_de: row.name_de ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    const collection = mongo.collection("product_parameters");
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection("image_files", async () => {
    const rows = await prisma.imageFile.findMany();
    const docs = rows.map((row: any) => ({
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
    const collection = mongo.collection("image_files");
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection("products", async () => {
    const [rows, catalogRows] = await Promise.all([
      prisma.product.findMany({
        include: {
          images: { include: { imageFile: true } },
          catalogs: { include: { catalog: true } },
          categories: true,
          tags: true,
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
    const docs = rows.map((product) => ({
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
      categories: product.categories.map((entry: any) => ({
        productId: entry.productId,
        categoryId: entry.categoryId,
        assignedAt: entry.assignedAt,
      })),
      tags: product.tags.map((entry: any) => ({
        productId: entry.productId,
        tagId: entry.tagId,
        assignedAt: entry.assignedAt,
      })),
    }));

    const collection = mongo.collection("products");
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection("product_drafts", async () => {
    const rows = await prisma.productDraft.findMany();
    const docs = rows.map((row: any) => ({
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
      categoryIds: row.categoryIds ?? [],
      tagIds: row.tagIds ?? [],
      parameters: row.parameters ?? [],
      defaultPriceGroupId: row.defaultPriceGroupId ?? null,
      active: row.active ?? true,
      imageLinks: row.imageLinks ?? [],
      baseProductId: row.baseProductId ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    const collection = mongo.collection("product_drafts");
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection("cms_slugs", async () => {
    const rows = await prisma.slug.findMany();
    const docs = rows.map((row: any) => ({
      _id: row.id,
      id: row.id,
      slug: row.slug,
      isDefault: row.isDefault,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    const collection = mongo.collection("cms_slugs");
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection("cms_themes", async () => {
    const rows = await prisma.cmsTheme.findMany();
    const docs = rows.map((row: any) => ({
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
    const collection = mongo.collection("cms_themes");
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection("cms_pages", async () => {
    const rows = await prisma.page.findMany({ include: { components: true } });
    const docs = rows.map((row: any) => ({
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
    const collection = mongo.collection("cms_pages");
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection("cms_page_slugs", async () => {
    const rows = await prisma.pageSlug.findMany();
    const docs = rows.map((row: any) => ({
      pageId: row.pageId,
      slugId: row.slugId,
      assignedAt: row.assignedAt,
    }));
    const collection = mongo.collection("cms_page_slugs");
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection("cms_domains", async () => {
    const rows = await prisma.cmsDomain.findMany();
    const docs = rows.map((row: any) => ({
      _id: toObjectIdMaybe(row.id),
      id: row.id,
      domain: row.domain,
      aliasOf: row.aliasOf ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    const collection = mongo.collection("cms_domains");
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection("cms_domain_slugs", async () => {
    const rows = await prisma.cmsDomainSlug.findMany();
    const docs = rows.map((row: any) => ({
      _id: new ObjectId(),
      domainId: row.domainId,
      slugId: row.slugId,
      assignedAt: row.assignedAt,
      isDefault: row.isDefault,
      updatedAt: row.updatedAt,
    }));
    const collection = mongo.collection("cms_domain_slugs");
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection("notes", async () => {
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
            : { id: entry.tagId, name: "", color: null, notebookId: null, createdAt: note.createdAt, updatedAt: note.updatedAt },
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
            : { id: entry.categoryId, name: "", description: null, color: null, parentId: null, themeId: null, notebookId: null, sortIndex: 0, createdAt: note.createdAt, updatedAt: note.updatedAt },
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
            : { id: entry.targetNoteId, title: "", color: null },
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


    const collection = mongo.collection("notes");
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: notes.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection("noteFiles", async () => {
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
    const collection = mongo.collection("noteFiles");
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: files.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection("tags", async () => {
    const rows = await prisma.tag.findMany();
    const docs = rows.map((row: any) => ({
      _id: row.id,
      id: row.id,
      name: row.name,
      color: row.color ?? null,
      notebookId: row.notebookId ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    const collection = mongo.collection("tags");
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection("categories", async () => {
    const rows = await prisma.category.findMany();
    const docs = rows.map((row: any) => ({
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
    const collection = mongo.collection("categories");
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection("notebooks", async () => {
    const rows = await prisma.notebook.findMany();
    const docs = rows.map((row: any) => ({
      _id: row.id,
      id: row.id,
      name: row.name,
      color: row.color ?? null,
      defaultThemeId: row.defaultThemeId ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    const collection = mongo.collection("notebooks");
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection("themes", async () => {
    const rows = await prisma.theme.findMany();
    const docs = rows.map((row: any) => ({
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
    const collection = mongo.collection("themes");
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection("product_ai_jobs", async () => {
    const rows = await prisma.productAiJob.findMany();
    const docs = rows.map((row: any) => ({
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
    const collection = mongo.collection("product_ai_jobs");
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection("ai_path_runs", async () => {
    const rows = await prisma.aiPathRun.findMany();
    const docs = rows.map((row: any) => ({
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
    const collection = mongo.collection("ai_path_runs");
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection("ai_path_run_nodes", async () => {
    const rows = await prisma.aiPathRunNode.findMany();
    const docs = rows.map((row: any) => ({
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
    const collection = mongo.collection("ai_path_run_nodes");
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });

  await syncCollection("ai_path_run_events", async () => {
    const rows = await prisma.aiPathRunEvent.findMany();
    const docs = rows.map((row: any) => ({
      _id: row.id,
      id: row.id,
      runId: row.runId,
      level: row.level,
      message: row.message,
      metadata: row.metadata ?? null,
      createdAt: row.createdAt,
    }));
    const collection = mongo.collection("ai_path_run_events");
    const deleted = await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs as any[]);
    return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
  });
}
