import 'server-only';

import { createHash } from 'crypto';

import type { AiPathRunQueueSloStatus } from '@/features/jobs/workers/aiPathRunQueue';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { getRedisConnection } from '@/shared/lib/queue';
import prisma from '@/shared/lib/db/prisma';

import { withTransientRecovery } from './transient-recovery/with-recovery';

const SETTINGS_COLLECTION = 'settings';

const AI_PATHS_SLO_NOTIFICATION_KEYS = {
  enabled: 'ai_paths_slo_notifications_enabled',
  webhookUrl: 'ai_paths_slo_notifications_webhook_url',
  minLevel: 'ai_paths_slo_notifications_min_level',
  cooldownSeconds: 'ai_paths_slo_notifications_cooldown_seconds',
} as const;

const DEFAULT_COOLDOWN_SECONDS = 300;
const NOTIFICATION_THROTTLE_KEY_PREFIX = 'ai_paths:slo:notify:v1';

type SloNotificationLevel = 'warning' | 'critical';

type SloNotificationConfig = {
  enabled: boolean;
  webhookUrl: string | null;
  minLevel: SloNotificationLevel;
  cooldownSeconds: number;
};

type SettingRecord = { _id: string; key?: string; value?: string };

type NotifyAiPathsSloInput = {
  status: AiPathRunQueueSloStatus;
  queue?: {
    running?: boolean;
    healthy?: boolean;
    activeRuns?: number;
    queuedCount?: number;
    queueLagMs?: number | null;
  };
};

export type NotifyAiPathsSloResult = {
  delivered: boolean;
  throttled: boolean;
  skipped: boolean;
  reason?: string;
  signature?: string;
};

const canUsePrismaSettings = (): boolean =>
  Boolean(process.env['DATABASE_URL']) && 'setting' in prisma;

const readPrismaSetting = async (key: string): Promise<string | null> => {
  if (!canUsePrismaSettings()) return null;
  try {
    const setting = await prisma.setting.findUnique({
      where: { key },
      select: { value: true },
    });
    return setting?.value ?? null;
  } catch {
    return null;
  }
};

const readMongoSetting = async (key: string): Promise<string | null> => {
  if (!process.env['MONGODB_URI']) return null;
  const mongo = await getMongoDb();
  const doc = await mongo
    .collection<SettingRecord>(SETTINGS_COLLECTION)
    .findOne({ $or: [{ _id: key }, { key }] });
  return typeof doc?.value === 'string' ? doc.value : null;
};

const readSettingValue = async (key: string): Promise<string | null> => {
  const provider = await getAppDbProvider();
  if (provider === 'mongodb') {
    return readMongoSetting(key);
  }
  return readPrismaSetting(key);
};

const parseBoolean = (value: string | null | undefined, fallback = false): boolean => {
  if (typeof value !== 'string') return fallback;
  return value.trim().toLowerCase() === 'true';
};

const parseNumber = (value: string | null | undefined, fallback: number): number => {
  if (typeof value !== 'string') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.floor(parsed));
};

const parseMinLevel = (value: string | null | undefined): SloNotificationLevel => {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'warning') return 'warning';
  return 'critical';
};

const levelPriority: Record<SloNotificationLevel, number> = {
  warning: 1,
  critical: 2,
};

const shouldNotifyForLevel = (
  level: SloNotificationLevel,
  minLevel: SloNotificationLevel
): boolean => levelPriority[level] >= levelPriority[minLevel];

const getNotificationConfig = async (): Promise<SloNotificationConfig> => {
  const [enabledSetting, webhookSetting, minLevelSetting, cooldownSetting] =
    await Promise.all([
      readSettingValue(AI_PATHS_SLO_NOTIFICATION_KEYS.enabled),
      readSettingValue(AI_PATHS_SLO_NOTIFICATION_KEYS.webhookUrl),
      readSettingValue(AI_PATHS_SLO_NOTIFICATION_KEYS.minLevel),
      readSettingValue(AI_PATHS_SLO_NOTIFICATION_KEYS.cooldownSeconds),
    ]);

  const enabled =
    parseBoolean(enabledSetting) ||
    parseBoolean(process.env['AI_PATHS_SLO_NOTIFICATIONS_ENABLED']);
  const webhookUrl =
    webhookSetting ?? process.env['AI_PATHS_SLO_WEBHOOK_URL'] ?? null;
  const minLevel = parseMinLevel(
    minLevelSetting ?? process.env['AI_PATHS_SLO_MIN_LEVEL']
  );
  const cooldownSeconds = parseNumber(
    cooldownSetting ?? process.env['AI_PATHS_SLO_COOLDOWN_SECONDS'],
    DEFAULT_COOLDOWN_SECONDS
  );

  return {
    enabled,
    webhookUrl,
    minLevel,
    cooldownSeconds,
  };
};

const getCooldownCache = (): Map<string, number> => {
  const globalAny = globalThis as typeof globalThis & {
    __aiPathsSloNotificationCache?: Map<string, number>;
  };
  if (!globalAny.__aiPathsSloNotificationCache) {
    globalAny.__aiPathsSloNotificationCache = new Map();
  }
  return globalAny.__aiPathsSloNotificationCache;
};

const getThrottleKey = (signature: string): string =>
  `${NOTIFICATION_THROTTLE_KEY_PREFIX}:${signature}`;

const buildSignature = (status: AiPathRunQueueSloStatus): string => {
  const hash = createHash('sha256');
  hash.update(status.overall);
  const normalizedBreaches = [...status.breaches]
    .map((breach) => `${breach.indicator}:${breach.level}`)
    .sort();
  for (const breach of normalizedBreaches) {
    hash.update(breach);
  }
  return hash.digest('hex');
};

const shouldThrottleInMemory = (
  signature: string,
  cooldownSeconds: number
): boolean => {
  if (cooldownSeconds <= 0) return false;
  const cache = getCooldownCache();
  const now = Date.now();
  const previous = cache.get(signature);
  if (previous && now - previous < cooldownSeconds * 1000) {
    return true;
  }
  cache.set(signature, now);
  return false;
};

const releaseInMemoryThrottle = (signature: string): void => {
  const cache = getCooldownCache();
  cache.delete(signature);
};

const acquireRedisThrottle = async (
  signature: string,
  cooldownSeconds: number
): Promise<boolean | null> => {
  if (cooldownSeconds <= 0) return true;
  const redis = getRedisConnection();
  if (!redis) return null;
  try {
    const result = await redis.set(
      getThrottleKey(signature),
      String(Date.now()),
      'EX',
      Math.max(1, cooldownSeconds),
      'NX'
    );
    return result === 'OK';
  } catch (error) {
    console.error('[ai-paths-slo-notifier] Redis throttle acquisition failed', error);
    return null;
  }
};

const releaseRedisThrottle = async (signature: string): Promise<void> => {
  const redis = getRedisConnection();
  if (!redis) return;
  try {
    await redis.del(getThrottleKey(signature));
  } catch (error) {
    console.error('[ai-paths-slo-notifier] Redis throttle release failed', error);
  }
};

type ThrottleState = {
  throttled: boolean;
  storage: 'redis' | 'memory' | 'none';
};

const acquireThrottleSlot = async (
  signature: string,
  cooldownSeconds: number
): Promise<ThrottleState> => {
  if (cooldownSeconds <= 0) {
    return { throttled: false, storage: 'none' };
  }

  const redisAcquired = await acquireRedisThrottle(signature, cooldownSeconds);
  if (redisAcquired === true) {
    return { throttled: false, storage: 'redis' };
  }
  if (redisAcquired === false) {
    return { throttled: true, storage: 'redis' };
  }

  const throttled = shouldThrottleInMemory(signature, cooldownSeconds);
  return {
    throttled,
    storage: 'memory',
  };
};

const releaseThrottleSlot = async (
  signature: string,
  storage: ThrottleState['storage']
): Promise<void> => {
  if (storage === 'redis') {
    await releaseRedisThrottle(signature);
    return;
  }
  if (storage === 'memory') {
    releaseInMemoryThrottle(signature);
  }
};

const buildPayload = (
  input: NotifyAiPathsSloInput,
  signature: string
): Record<string, unknown> => {
  const status = input.status;
  const headline =
    status.breaches.length > 0
      ? status.breaches
          .slice(0, 3)
          .map((breach) => breach.message)
          .join(' ')
      : 'No detailed breach messages were provided.';
  return {
    event: 'ai_paths_slo_breach',
    level: status.overall,
    signature,
    evaluatedAt: status.evaluatedAt,
    breachCount: status.breachCount,
    breaches: status.breaches.slice(0, 10),
    indicators: status.indicators,
    summary: headline,
    queue: input.queue ?? null,
    environment: process.env['NODE_ENV'] ?? 'development',
    appUrl: process.env['NEXT_PUBLIC_APP_URL'] ?? null,
  };
};

export const notifyAiPathsSloBreach = async (
  input: NotifyAiPathsSloInput
): Promise<NotifyAiPathsSloResult> => {
  let signature: string | null = null;
  let throttleStorage: ThrottleState['storage'] = 'none';
  try {
    if (input.status.overall === 'ok') {
      return {
        delivered: false,
        throttled: false,
        skipped: true,
        reason: 'slo-ok',
      };
    }

    const alertLevel =
      input.status.overall === 'critical' ? 'critical' : 'warning';
    const config = await getNotificationConfig();
    if (!config.enabled) {
      return {
        delivered: false,
        throttled: false,
        skipped: true,
        reason: 'disabled',
      };
    }
    if (!config.webhookUrl) {
      return {
        delivered: false,
        throttled: false,
        skipped: true,
        reason: 'missing-webhook',
      };
    }
    if (!shouldNotifyForLevel(alertLevel, config.minLevel)) {
      return {
        delivered: false,
        throttled: false,
        skipped: true,
        reason: 'below-min-level',
      };
    }

    signature = buildSignature(input.status);
    const throttleState = await acquireThrottleSlot(
      signature,
      config.cooldownSeconds
    );
    throttleStorage = throttleState.storage;
    if (throttleState.throttled) {
      return {
        delivered: false,
        throttled: true,
        skipped: false,
        reason: 'cooldown',
        signature,
      };
    }

    const payload = buildPayload(input, signature);
    const res = await withTransientRecovery(
      async () =>
        fetch(config.webhookUrl!, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify(payload),
        }),
      {
        source: 'ai-paths-slo-webhook',
        circuitId: 'ai-paths-slo-webhook',
        retry: {
          maxAttempts: 3,
          initialDelayMs: 1000,
          maxDelayMs: 10000,
          timeoutMs: 8000,
        },
      }
    );

    if (!res.ok) {
      await releaseThrottleSlot(signature, throttleState.storage);
      console.error('[ai-paths-slo-notifier] Webhook failed', {
        status: res.status,
        statusText: res.statusText,
      });
      return {
        delivered: false,
        throttled: false,
        skipped: false,
        reason: `http-${res.status}`,
        signature,
      };
    }

    return {
      delivered: true,
      throttled: false,
      skipped: false,
      signature,
    };
  } catch (error) {
    if (signature && throttleStorage !== 'none') {
      await releaseThrottleSlot(signature, throttleStorage);
    }
    console.error('[ai-paths-slo-notifier] Webhook error', error);
    return {
      delivered: false,
      throttled: false,
      skipped: false,
      reason: 'exception',
    };
  }
};
