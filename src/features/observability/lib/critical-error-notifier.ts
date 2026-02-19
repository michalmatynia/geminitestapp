 
import 'server-only';

import { createHash } from 'crypto';

import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';
import type {
  SystemLogLevel,
  SystemLogRecord,
} from '@/shared/types/domain/system-logs';

import { ErrorSystem } from '../services/error-system';
import { withTransientRecovery } from './transient-recovery/with-recovery';

const SETTINGS_COLLECTION = 'settings';

const NOTIFICATION_SETTINGS_KEYS = {
  enabled: 'critical_notifications_enabled',
  webhookUrl: 'critical_notifications_webhook_url',
  minLevel: 'critical_notifications_min_level',
  throttleSeconds: 'critical_notifications_throttle_seconds',
} as const;

const DEFAULT_THROTTLE_SECONDS = 120;

type NotificationConfig = {
  enabled: boolean;
  webhookUrl: string | null;
  minLevel: SystemLogLevel;
  throttleSeconds: number;
};

type SettingRecord = { _id: string; key?: string; value?: string };

const canUsePrismaSettings = () =>
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
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseMinLevel = (value: string | null | undefined): SystemLogLevel => {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'warn') return 'warn';
  if (normalized === 'info') return 'info';
  return 'error';
};

const levelPriority: Record<SystemLogLevel, number> = {
  info: 1,
  warn: 2,
  error: 3,
};

const shouldNotifyForLevel = (
  level: SystemLogLevel,
  minLevel: SystemLogLevel,
) => levelPriority[level] >= levelPriority[minLevel];

const getNotificationConfig = async (): Promise<NotificationConfig> => {
  const [enabledSetting, webhookSetting, minLevelSetting, throttleSetting] =
    await Promise.all([
      readSettingValue(NOTIFICATION_SETTINGS_KEYS.enabled),
      readSettingValue(NOTIFICATION_SETTINGS_KEYS.webhookUrl),
      readSettingValue(NOTIFICATION_SETTINGS_KEYS.minLevel),
      readSettingValue(NOTIFICATION_SETTINGS_KEYS.throttleSeconds),
    ]);

  const enabled =
    parseBoolean(enabledSetting) ||
    parseBoolean(process.env['CRITICAL_ERROR_NOTIFICATIONS_ENABLED']);
  const webhookUrl =
    webhookSetting ?? process.env['CRITICAL_ERROR_WEBHOOK_URL'] ?? null;
  const minLevel = parseMinLevel(
    minLevelSetting ?? process.env['CRITICAL_ERROR_MIN_LEVEL'],
  );
  const throttleSeconds = parseNumber(
    throttleSetting ?? process.env['CRITICAL_ERROR_THROTTLE_SECONDS'],
    DEFAULT_THROTTLE_SECONDS,
  );

  return {
    enabled,
    webhookUrl,
    minLevel,
    throttleSeconds,
  };
};

const getThrottleCache = (): Map<string, number> => {
  const globalAny = globalThis as typeof globalThis & {
    __criticalErrorNotificationCache?: Map<string, number>;
  };
  if (!globalAny.__criticalErrorNotificationCache) {
    globalAny.__criticalErrorNotificationCache = new Map();
  }
  return globalAny.__criticalErrorNotificationCache;
};

const buildSignature = (log: SystemLogRecord): string => {
  const hash = createHash('sha256');
  hash.update(log.message ?? '');
  hash.update(String(log.source ?? ''));
  hash.update(String(log.path ?? ''));
  hash.update(String(log.statusCode ?? ''));
  return hash.digest('hex');
};

const shouldThrottle = (signature: string, throttleSeconds: number): boolean => {
  const cache = getThrottleCache();
  const now = Date.now();
  const previous = cache.get(signature);
  if (previous && now - previous < throttleSeconds * 1000) {
    return true;
  }
  cache.set(signature, now);
  return false;
};

const buildPayload = (log: SystemLogRecord, critical: boolean): Record<string, unknown> => ({
  event: 'critical_error',
  critical,
  level: log.level,
  message: log.message,
  source: log.source ?? null,
  path: log.path ?? null,
  method: log.method ?? null,
  statusCode: log.statusCode ?? null,
  requestId: log.requestId ?? null,
  userId: log.userId ?? null,
  createdAt: log.createdAt,
  context: log.context ?? null,
  stack: log.stack ?? null,
  environment: process.env['NODE_ENV'] ?? 'development',
  appUrl: process.env['NEXT_PUBLIC_APP_URL'] ?? null,
});

export const notifyCriticalError = async (
  log: SystemLogRecord,
  critical: boolean,
): Promise<{ delivered: boolean; throttled: boolean }> => {
  try {
    const config = await getNotificationConfig();
    if (!config.enabled || !config.webhookUrl) {
      return { delivered: false, throttled: false };
    }
    if (!shouldNotifyForLevel(log.level, config.minLevel)) {
      return { delivered: false, throttled: false };
    }
    if (!critical) {
      return { delivered: false, throttled: false };
    }

    const signature = buildSignature(log);
    if (shouldThrottle(signature, config.throttleSeconds)) {
      return { delivered: false, throttled: true };
    }

    const payload = buildPayload(log, critical);
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
        source: 'critical-error-webhook',
        circuitId: 'critical-error-webhook',
        retry: {
          maxAttempts: 3,
          initialDelayMs: 1000,
          maxDelayMs: 10000,
          timeoutMs: 8000,
        },
      },
    );
    if (!res.ok) {
      void ErrorSystem.logWarning('[critical-error-notifier] Webhook failed', {
        service: 'critical-error-notifier',
        status: res.status,
        statusText: res.statusText,
      });
      return { delivered: false, throttled: false };
    }
    return { delivered: true, throttled: false };
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'critical-error-notifier',
      action: 'notifyCriticalError'
    });
    return { delivered: false, throttled: false };
  }
};
