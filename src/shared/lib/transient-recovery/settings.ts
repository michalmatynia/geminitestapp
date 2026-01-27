import prisma from "@/shared/lib/db/prisma";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import { ObjectId } from "mongodb";
import { getAppDbProvider } from "@/shared/lib/db/app-db-provider";
import {
  DEFAULT_TRANSIENT_RECOVERY_SETTINGS,
  TRANSIENT_RECOVERY_KEYS,
  type TransientRecoverySettings,
} from "@/shared/lib/transient-recovery/constants";
import { parseJsonSetting } from "@/shared/utils/settings-json";

type SettingRecord = { _id?: string | ObjectId; key?: string; value?: string };

const toMongoId = (id: string) => {
  if (ObjectId.isValid(id) && id.length === 24) return new ObjectId(id);
  return id;
};

type CacheState = {
  expiresAt: number;
  value: TransientRecoverySettings;
};

const CACHE_TTL_MS = 30000;

let cached: CacheState | null = null;

const canUsePrismaSettings = () =>
  Boolean(process.env.DATABASE_URL) && "setting" in prisma;

const readPrismaSetting = async (key: string): Promise<string | null> => {
  if (!canUsePrismaSettings()) return null;
  const setting = await prisma.setting.findUnique({
    where: { key },
    select: { value: true },
  });
  return setting?.value ?? null;
};

const readMongoSetting = async (key: string): Promise<string | null> => {
  if (!process.env.MONGODB_URI) return null;
  const mongo = await getMongoDb();
  const doc = await mongo
    .collection<SettingRecord>("settings")
    .findOne({ $or: [{ _id: toMongoId(key) }, { key }] });
  return typeof doc?.value === "string" ? doc.value : null;
};

const readSettingValue = async (key: string): Promise<string | null> => {
  const provider = await getAppDbProvider();
  if (provider === "mongodb") {
    return (await readMongoSetting(key)) ?? (await readPrismaSetting(key));
  }
  return (await readPrismaSetting(key)) ?? (await readMongoSetting(key));
};

const toPositiveNumber = (value: unknown, fallback: number, minValue = 0): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < minValue) return fallback;
  return parsed;
};

const normalizeSettings = (
  input: TransientRecoverySettings | null | undefined
): TransientRecoverySettings => {
  const base = DEFAULT_TRANSIENT_RECOVERY_SETTINGS;
  const enabled = typeof input?.enabled === "boolean" ? input.enabled : base.enabled;
  const retryEnabled =
    typeof input?.retry?.enabled === "boolean"
      ? input.retry.enabled
      : base.retry.enabled;
  const retry = {
    enabled: retryEnabled,
    maxAttempts: toPositiveNumber(
      input?.retry?.maxAttempts,
      base.retry.maxAttempts,
      1
    ),
    initialDelayMs: toPositiveNumber(input?.retry?.initialDelayMs, base.retry.initialDelayMs),
    maxDelayMs: toPositiveNumber(input?.retry?.maxDelayMs, base.retry.maxDelayMs),
    timeoutMs: (() => {
      const raw = input?.retry?.timeoutMs;
      if (raw === null) return null;
      const parsed = toPositiveNumber(raw, base.retry.timeoutMs ?? 0);
      return parsed > 0 ? parsed : null;
    })(),
  };
  const circuitEnabled =
    typeof input?.circuit?.enabled === "boolean"
      ? input.circuit.enabled
      : base.circuit.enabled;
  const circuit = {
    enabled: circuitEnabled,
    failureThreshold: toPositiveNumber(
      input?.circuit?.failureThreshold,
      base.circuit.failureThreshold,
      1
    ),
    resetTimeoutMs: toPositiveNumber(input?.circuit?.resetTimeoutMs, base.circuit.resetTimeoutMs),
  };

  return {
    enabled,
    retry,
    circuit,
  };
};

export const getTransientRecoverySettings = async (
  options?: { force?: boolean }
): Promise<TransientRecoverySettings> => {
  const now = Date.now();
  if (!options?.force && cached && cached.expiresAt > now) {
    return cached.value;
  }
  const stored = await readSettingValue(TRANSIENT_RECOVERY_KEYS.settings);
  const parsed = parseJsonSetting<TransientRecoverySettings | null>(stored, null);
  const value = normalizeSettings(parsed);
  cached = {
    value,
    expiresAt: now + CACHE_TTL_MS,
  };
  return value;
};
