'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

import { CLIENT_LOGGING_KEYS } from '@/features/observability/constants/client-logging';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import {
  initClientErrorReporting,
  setClientErrorBaseContext,
} from '@/shared/utils/observability/client-error-logger';
import { parseJsonSetting } from '@/shared/utils/settings-json';

export default function ClientErrorReporter(): null {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const settingsStore = useSettingsStore();

  useEffect(() => {
    initClientErrorReporting();
  }, []);

  const featureFlagsRaw = settingsStore.get(CLIENT_LOGGING_KEYS.featureFlags);
  const tagsRaw = settingsStore.get(CLIENT_LOGGING_KEYS.tags);

  useEffect(() => {
    const featureFlags = parseJsonSetting<Record<string, unknown> | null>(featureFlagsRaw, null);
    const tags = parseJsonSetting<Record<string, unknown> | null>(tagsRaw, null);
    setClientErrorBaseContext({
      featureFlags,
      tags,
    });
  }, [featureFlagsRaw, tagsRaw]);

  useEffect(() => {
    const context = {
      app: {
        version: process.env['NEXT_PUBLIC_APP_VERSION'] ?? 'unknown',
        buildId: process.env['NEXT_PUBLIC_BUILD_ID'] ?? null,
        releaseChannel: process.env['NEXT_PUBLIC_RELEASE_CHANNEL'] ?? null,
        environment: process.env['NODE_ENV'] ?? null,
      },
      route: pathname,
      query: searchParams?.toString() ?? '',
      referrer: typeof document !== 'undefined' ? document.referrer : null,
      locale: typeof navigator !== 'undefined' ? navigator.language : null,
      timezone:
        typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : null,
      device:
        typeof navigator !== 'undefined'
          ? {
              platform: navigator.platform,
              deviceMemory:
                (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null,
              hardwareConcurrency: navigator.hardwareConcurrency ?? null,
            }
          : null,
      network:
        typeof navigator !== 'undefined'
          ? {
              online: navigator.onLine,
              effectiveType:
                (navigator as Navigator & { connection?: { effectiveType?: string } }).connection
                  ?.effectiveType ?? null,
              downlink:
                (navigator as Navigator & { connection?: { downlink?: number } }).connection
                  ?.downlink ?? null,
              rtt:
                (navigator as Navigator & { connection?: { rtt?: number } }).connection?.rtt ??
                null,
            }
          : null,
      viewport:
        typeof window !== 'undefined'
          ? { width: window.innerWidth, height: window.innerHeight }
          : null,
      featureFlags:
        typeof window !== 'undefined'
          ? ((window as Window & { __FEATURE_FLAGS__?: Record<string, unknown> })
              .__FEATURE_FLAGS__ ??
            ((): Record<string, unknown> | null => {
              try {
                const raw = window.localStorage.getItem('featureFlags');
                return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
              } catch {
                return null;
              }
            })())
          : null,
      tags:
        typeof window !== 'undefined'
          ? ((window as Window & { __CLIENT_LOG_TAGS__?: Record<string, unknown> })
              .__CLIENT_LOG_TAGS__ ??
            ((): Record<string, unknown> | null => {
              try {
                const raw = window.localStorage.getItem('clientLogTags');
                return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
              } catch {
                return null;
              }
            })())
          : null,
      user: session?.user
        ? {
            id: session.user.id ?? null,
            email: session.user.email ?? null,
            role: session.user.role ?? null,
          }
        : null,
    };
    setClientErrorBaseContext(context);
  }, [
    pathname,
    searchParams,
    session?.user,
    session?.user?.email,
    session?.user?.id,
    session?.user?.role,
  ]);

  return null;
}
