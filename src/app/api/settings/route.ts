export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { WithId } from "mongodb";

import prisma from "@/shared/lib/db/prisma";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import {
  APP_DB_PROVIDER_SETTING_KEY,
  getAppDbProvider,
  invalidateAppDbProviderCache,
} from "@/shared/lib/db/app-db-provider";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { parseJsonBody } from "@/shared/lib/api/parse-json";
import { internalError } from "@/shared/errors/app-error";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { ErrorSystem } from "@/features/observability/server";
import { AUTH_SETTINGS_KEYS } from "@/features/auth/utils/auth-management";
import { PRODUCT_DB_PROVIDER_SETTING_KEY } from "@/features/products/constants";
import {
  SettingRecord,
  getCachedSettings,
  setCachedSettings,
  clearSettingsCache,
  getSettingsCacheStats,
  isSettingsCacheDebugEnabled,
  getSettingsInflight,
  setSettingsInflight,
  getStaleSettings,
  type SettingsScope,
} from "@/shared/lib/settings-cache";

const shouldLog = () => process.env.DEBUG_SETTINGS === "true";

type SettingDocument = {
  key: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
};

const SETTINGS_COLLECTION = "settings";
const HEAVY_PREFIXES = ["ai_paths_", "image_studio_", "base_import_", "base_export_"];
const HEAVY_KEYS = new Set<string>(["agent_personas"]);
const HEAVY_PREFIX_REGEX = new RegExp(`^(${HEAVY_PREFIXES.map((p) => p.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")).join("|")})`);
const DEFAULT_SCOPE: SettingsScope = "light";
let settingsIndexesEnsured: Promise<void> | null = null;

const ensureSettingsIndexes = async (): Promise<void> => {
  if (!process.env.MONGODB_URI) return;
  if (!settingsIndexesEnsured) {
    settingsIndexesEnsured = (async (): Promise<void> => {
      try {
        const mongo = await getMongoDb();
        await mongo.collection(SETTINGS_COLLECTION).createIndex({ key: 1 }, { name: "settings_key" });
      } catch (error) {
        console.warn("[settings] Failed to ensure settings indexes.", error);
      }
    })();
  }
  await settingsIndexesEnsured;
};
const productSettingKeys = new Set([
  APP_DB_PROVIDER_SETTING_KEY,
  PRODUCT_DB_PROVIDER_SETTING_KEY,
  "ai_vision_model",
  "ai_vision_user_prompt",
  "ai_vision_prompt",
  "ai_vision_output_enabled",
  "openai_model",
  "description_generation_user_prompt",
  "description_generation_prompt",
  "ai_generation_output_enabled",
  "ai_description_test_product_id",
]);

const isProductSettingKey = (key: string) => productSettingKeys.has(key);
const authSettingKeys: Set<string> = new Set(Object.values(AUTH_SETTINGS_KEYS));
const isMongoPreferredSettingKey = (key: string) =>
  isProductSettingKey(key) || authSettingKeys.has(key);
const isHeavySettingKey = (key: string): boolean =>
  HEAVY_KEYS.has(key) || HEAVY_PREFIXES.some((prefix) => key.startsWith(prefix));

const canUsePrismaSettings = (provider: "prisma" | "mongodb") =>
  provider === "prisma" && Boolean(process.env.DATABASE_URL) && "setting" in prisma;

const isPrismaMissingTableError = (
  error: unknown
): error is Prisma.PrismaClientKnownRequestError =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  (error.code === "P2021" || error.code === "P2022");

const settingSchema = z.object({
  key: z.string().trim().min(1),
  value: z.string(),
});


const normalizeScope = (scope?: string | null): SettingsScope => {
  if (scope === "heavy" || scope === "light" || scope === "all") return scope;
  return DEFAULT_SCOPE;
};

const applyScopeFilter = (settings: SettingRecord[], scope: SettingsScope): SettingRecord[] => {
  if (scope === "all") return settings;
  if (scope === "heavy") return settings.filter((setting: SettingRecord) => isHeavySettingKey(setting.key));
  return settings.filter((setting: SettingRecord) => !isHeavySettingKey(setting.key));
};

const buildPrismaScopeWhere = (scope: SettingsScope): Record<string, unknown> => {
  if (scope === "all") return {};
  const heavyOr = [
    ...HEAVY_PREFIXES.map((prefix) => ({ key: { startsWith: prefix } })),
    { key: { in: Array.from(HEAVY_KEYS) } },
  ];
  if (scope === "heavy") {
    return { OR: heavyOr };
  }
  return { NOT: { OR: heavyOr } };
};

const buildMongoScopeQuery = (scope: SettingsScope): Record<string, unknown> => {
  if (scope === "all") return {};
  const heavyOr = [
    { key: { $regex: HEAVY_PREFIX_REGEX } },
    { key: { $in: Array.from(HEAVY_KEYS) } },
    { _id: { $in: Array.from(HEAVY_KEYS) } },
    { _id: { $type: "string", $regex: HEAVY_PREFIX_REGEX } },
  ];
  if (scope === "heavy") {
    return { $or: heavyOr };
  }
  return { $nor: heavyOr };
};

const listMongoSettings = async (scope: SettingsScope): Promise<SettingRecord[]> => {
  if (!process.env.MONGODB_URI) return [];
  await ensureSettingsIndexes();
  const mongo = await getMongoDb();
  const query = buildMongoScopeQuery(scope);
  const docs = await mongo
    .collection<SettingDocument>(SETTINGS_COLLECTION)
    .find(query, { projection: { _id: 1, key: 1, value: 1 } })
    .toArray();
  return docs
    .map((doc: WithId<SettingDocument>) => ({ key: doc.key ?? String(doc._id), value: doc.value }))
    .filter((doc: SettingRecord) => typeof doc.key === "string" && typeof doc.value === "string");
};

const upsertMongoSetting = async (
  key: string,
  value: string
): Promise<SettingRecord | null> => {
  if (!process.env.MONGODB_URI) return null;
  const mongo = await getMongoDb();
  const now = new Date();
  await mongo.collection<SettingDocument>(SETTINGS_COLLECTION).updateOne(
    { key },
    {
      $set: { value, updatedAt: now },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );
  return { key, value };
};

const SETTINGS_CACHE_CONTROL = "private, max-age=120, stale-while-revalidate=600";
const shouldLogTiming = () => process.env.DEBUG_API_TIMING === "true";

const buildServerTiming = (entries: Record<string, number | null | undefined>): string => {
  const parts = Object.entries(entries)
    .filter(([, value]) => typeof value === "number" && Number.isFinite(value) && value >= 0)
    .map(([name, value]) => `${name};dur=${Math.round(value as number)}`);
  return parts.join(", ");
};

const attachTimingHeaders = (response: Response, entries: Record<string, number | null | undefined>): void => {
  const value = buildServerTiming(entries);
  if (value) {
    response.headers.set("Server-Timing", value);
  }
};

const attachProviderHeader = async (response: Response): Promise<void> => {
  try {
    const provider = await getAppDbProvider();
    response.headers.set("X-App-Db-Provider", provider);
  } catch (error) {
    console.warn("[settings] Failed to resolve app DB provider.", error);
  }
};

const fetchAndCacheSettings = async (
  scope: SettingsScope,
  timings?: Record<string, number | null | undefined>
): Promise<SettingRecord[]> => {
  const totalStart = performance.now();
  const provider = await getAppDbProvider();
  if (timings) timings.provider = performance.now() - totalStart;
  const hasMongo = Boolean(process.env.MONGODB_URI);
  const envProvider = process.env.APP_DB_PROVIDER?.toLowerCase().trim();
  const forcePrisma = envProvider === "prisma";
  const prismaSettings: SettingRecord[] = [];
  let prismaMissing = false;
  if (canUsePrismaSettings(provider)) {
    const prismaStart = performance.now();
    try {
      const settings = await prisma.setting.findMany({
        where: buildPrismaScopeWhere(scope),
        select: { key: true, value: true },
      });
      prismaSettings.push(...applyScopeFilter(settings, scope));
    } catch (error) {
      if (isPrismaMissingTableError(error)) {
        prismaMissing = true;
        console.warn("[settings] Prisma settings table missing; falling back to Mongo.", {
          code: error.code,
        });
      } else {
        throw error;
      }
    } finally {
      if (timings) timings.prisma = performance.now() - prismaStart;
    }
  }
  const shouldReadMongoSettings = hasMongo && (!forcePrisma || prismaMissing);
  const mongoSettings = shouldReadMongoSettings
    ? await (async (): Promise<SettingRecord[]> => {
        const mongoStart = performance.now();
        const settings = await listMongoSettings(scope);
        if (timings) timings.mongo = performance.now() - mongoStart;
        return settings;
      })()
    : [];
  if (prismaMissing && !hasMongo) {
    console.warn("[settings] Prisma settings table missing and no Mongo fallback; returning empty settings.");
  }
  const settingsMap = new Map<string, SettingRecord>();
  if (provider === "mongodb") {
    mongoSettings.forEach((setting: SettingRecord) => {
      settingsMap.set(setting.key, setting);
    });
  } else {
    prismaSettings.forEach((setting: SettingRecord) => {
      if (!authSettingKeys.has(setting.key) || !hasMongo) {
        settingsMap.set(setting.key, setting);
      }
    });
    mongoSettings.forEach((setting: SettingRecord) => {
      const shouldOverride =
        isMongoPreferredSettingKey(setting.key) || !settingsMap.has(setting.key);
      if (shouldOverride) {
        settingsMap.set(setting.key, setting);
      }
    });
  }
  const settings = Array.from(settingsMap.values());
  if (shouldLog()) {
    await ErrorSystem.logInfo("[settings] fetched", {
      service: "api/settings",
      count: settings.length,
      keys: settings.map((setting: SettingRecord) => setting.key),
    });
  }
  setCachedSettings(settings, scope);
  if (timings) timings.total = performance.now() - totalStart;
  if (timings && shouldLogTiming()) {
    console.log("[timing] settings.fetch", { scope, ...timings });
  }
  return settings;
};

async function GET_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  scopeOverride?: SettingsScope
): Promise<Response> {
  const requestStart = performance.now();
  if (shouldLog()) {
    await ErrorSystem.logInfo("[settings] GET /api/settings", { service: "api/settings" });
  }
  try {
    const scope = scopeOverride ?? normalizeScope(req.nextUrl.searchParams.get("scope"));
    if (req.nextUrl.searchParams.get("debug") === "1" && isSettingsCacheDebugEnabled()) {
      const response = NextResponse.json(getSettingsCacheStats(), {
        headers: { "Cache-Control": "no-store" },
      });
      await attachProviderHeader(response);
      attachTimingHeaders(response, { total: performance.now() - requestStart, cache: 0 });
      return response;
    }
    const cached = getCachedSettings(scope);
    if (cached) {
      if (shouldLogTiming()) {
        console.log("[settings] cache", { scope, status: "hit" });
      }
      const response = NextResponse.json(cached, {
        headers: { "Cache-Control": SETTINGS_CACHE_CONTROL, "X-Cache": "hit" },
      });
      await attachProviderHeader(response);
      attachTimingHeaders(response, { total: performance.now() - requestStart, cache: 0 });
      return response;
    }
    const inflight = getSettingsInflight(scope);
    if (inflight) {
      const data = await inflight;
      if (shouldLogTiming()) {
        console.log("[settings] cache", { scope, status: "wait" });
      }
      const response = NextResponse.json(data, {
        headers: { "Cache-Control": SETTINGS_CACHE_CONTROL, "X-Cache": "wait" },
      });
      await attachProviderHeader(response);
      attachTimingHeaders(response, { total: performance.now() - requestStart, cache: 0 });
      return response;
    }

    const stale = getStaleSettings(scope);
    if (stale) {
      if (shouldLogTiming()) {
        console.log("[settings] cache", { scope, status: "stale" });
      }
      const timings: Record<string, number | null | undefined> = {};
      const refreshPromise = fetchAndCacheSettings(scope, timings)
        .catch((error) => {
          void ErrorSystem.captureException(error, {
            service: "api/settings",
            method: "GET",
          });
          return stale;
        })
        .finally(() => {
          setSettingsInflight(null, scope);
        });
      setSettingsInflight(refreshPromise, scope);
      const response = NextResponse.json(stale, {
        headers: { "Cache-Control": SETTINGS_CACHE_CONTROL, "X-Cache": "stale" },
      });
      await attachProviderHeader(response);
      attachTimingHeaders(response, { total: performance.now() - requestStart, cache: 0 });
      return response;
    }

    const timings: Record<string, number | null | undefined> = {};
    const inflightPromise = fetchAndCacheSettings(scope, timings)
      .finally(() => {
        setSettingsInflight(null, scope);
      });
    setSettingsInflight(inflightPromise, scope);
    const data = await inflightPromise;
    if (shouldLogTiming()) {
      console.log("[settings] cache", { scope, status: "miss" });
    }
    const response = NextResponse.json(data, {
      headers: { "Cache-Control": SETTINGS_CACHE_CONTROL, "X-Cache": "miss" },
    });
    await attachProviderHeader(response);
    attachTimingHeaders(response, { total: performance.now() - requestStart, cache: 0, ...timings });
    return response;
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "settings.GET",
      fallbackMessage: "Failed to fetch settings",
    });
  }
}

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  if (shouldLog()) {
    await ErrorSystem.logInfo("[settings] POST /api/settings", { service: "api/settings" });
  }
  try {
    clearSettingsCache();
    const parsed = await parseJsonBody(req, settingSchema, {
      logPrefix: "settings.POST",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const { key, value } = parsed.data;
    if (shouldLog()) {
      await ErrorSystem.logInfo("[settings] upserting", { service: "api/settings", key, valuePreview: value.slice(0, 40) });
    }
    const provider = await getAppDbProvider();
    const hasMongo = Boolean(process.env.MONGODB_URI);
    const shouldWriteMongo =
      hasMongo &&
      (provider === "mongodb" || isMongoPreferredSettingKey(key) || !canUsePrismaSettings(provider));
    const shouldWritePrisma =
      canUsePrismaSettings(provider) && (!authSettingKeys.has(key) || !hasMongo);
    let prismaSetting: SettingRecord | null = null;
    let mongoSetting: SettingRecord | null = null;
    let prismaMissing = false;
    if (shouldWritePrisma) {
      try {
        prismaSetting = await prisma.setting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
          select: { key: true, value: true },
        });
      } catch (error) {
        if (isPrismaMissingTableError(error)) {
          prismaMissing = true;
          console.warn("[settings] Prisma settings table missing; falling back to Mongo.", {
            code: error.code,
          });
        } else {
          throw error;
        }
      }
    }
    const shouldWriteMongoFallback = shouldWriteMongo || (prismaMissing && hasMongo);
    if (shouldWriteMongoFallback) {
      mongoSetting = await upsertMongoSetting(key, value);
    }
    const setting = prismaSetting ?? mongoSetting;
    if (!setting) {
      const message = prismaMissing
        ? "Settings table is missing in Prisma. Run prisma db push or configure MongoDB."
        : "No settings store configured";
      return createErrorResponse(
        internalError(message),
        { request: req, source: "settings.POST" }
      );
    }
    if (setting.key === APP_DB_PROVIDER_SETTING_KEY) {
      invalidateAppDbProviderCache();
    }
    if (shouldLog()) {
      await ErrorSystem.logInfo("[settings] saved", { service: "api/settings", key: setting.key });
    }
    return NextResponse.json(setting);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "settings.POST",
      fallbackMessage: "Failed to save setting",
    });
  }
}

const disableSettingsRateLimit = process.env.NODE_ENV !== "production";

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
  { source: "settings.GET", rateLimitKey: disableSettingsRateLimit ? false : "api" }
);
export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: "settings.POST", rateLimitKey: disableSettingsRateLimit ? false : "write" }
);

export { GET_handler };
