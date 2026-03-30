'use client';

import { useLocale } from 'next-intl';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type JSX,
  type ReactNode,
} from 'react';

import {
  DEFAULT_KANGUR_AI_TUTOR_CONTENT,
  type KangurAiTutorContent,
} from '@/features/kangur/shared/contracts/kangur-ai-tutor-content';
import { buildKangurAiTutorContentLocaleScaffold } from '@/features/kangur/server/ai-tutor-content-locale-scaffold';
import { parseKangurAiTutorContent } from '@/features/kangur/shared/contracts/kangur-ai-tutor-content';
import { useKangurAuthState } from '@/features/kangur/ui/context/KangurAuthContext';
import { api } from '@/shared/lib/api-client';
import { withKangurClientError } from '@/features/kangur/observability/client';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';


type KangurAiTutorContentContextValue = {
  content: KangurAiTutorContent;
  isLoading: boolean;
};

type Props = {
  children: ReactNode;
  locale?: string;
};

const KangurAiTutorContentContext = createContext<KangurAiTutorContentContextValue | null>(null);
const kangurAiTutorContentCache = new Map<string, KangurAiTutorContent>();
const kangurAiTutorContentInflight = new Map<string, Promise<KangurAiTutorContent>>();

const cloneKangurAiTutorContent = (content: KangurAiTutorContent): KangurAiTutorContent =>
  structuredClone(content);

export const clearKangurAiTutorContentClientCache = (): void => {
  kangurAiTutorContentCache.clear();
  kangurAiTutorContentInflight.clear();
};

/**
 * Activation context — the AI tutor content API call is deferred until a
 * consumer (typically the dynamically-loaded widget) calls `activate()`.
 * Until then, locale-scaffolded tutor content is used synchronously.
 */
const KangurAiTutorContentActivationContext = createContext<(() => void) | null>(null);

export function KangurAiTutorContentProvider({
  children,
  locale,
}: Props): JSX.Element {
  const routeLocale = useLocale();
  const resolvedLocale = normalizeSiteLocale(locale ?? routeLocale);
  const { isAuthenticated } = useKangurAuthState();
  const defaultContent = useMemo<KangurAiTutorContent>(
    () =>
      buildKangurAiTutorContentLocaleScaffold({
        locale: resolvedLocale,
        sourceContent: DEFAULT_KANGUR_AI_TUTOR_CONTENT,
      }),
    [resolvedLocale]
  );
  const [content, setContent] = useState<KangurAiTutorContent>({
    ...defaultContent,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isActivated, setIsActivated] = useState(false);

  const activate = useCallback(() => {
    setIsActivated(true);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !isActivated) {
      return;
    }

    let cancelled = false;

    const load = async (): Promise<void> => {
      const cached = kangurAiTutorContentCache.get(resolvedLocale);
      if (cached) {
        setContent(cloneKangurAiTutorContent(cached));
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const inflight =
        kangurAiTutorContentInflight.get(resolvedLocale) ??
        withKangurClientError(
        {
          source: 'kangur-ai-tutor-content',
          action: 'load',
          description: 'Load AI tutor content for the selected locale.',
          context: {
            locale: resolvedLocale,
          },
        },
        async () => {
          const response = await api.get<KangurAiTutorContent>(
            `/api/kangur/ai-tutor/content?locale=${encodeURIComponent(resolvedLocale)}`,
            {
              cache: 'no-store',
            }
          );
          const parsed = parseKangurAiTutorContent(response);
          kangurAiTutorContentCache.set(resolvedLocale, cloneKangurAiTutorContent(parsed));
          return parsed;
        },
        {
          fallback: defaultContent,
          onError: () => {
            kangurAiTutorContentCache.set(
              resolvedLocale,
              cloneKangurAiTutorContent(defaultContent)
            );
          },
          // Optional tutor copy should quietly fall back to defaults instead of
          // surfacing noisy client errors for users when the backing store is unavailable.
          shouldReport: () => false,
        }
      ).finally(() => {
        kangurAiTutorContentInflight.delete(resolvedLocale);
      });

      if (!kangurAiTutorContentInflight.has(resolvedLocale)) {
        kangurAiTutorContentInflight.set(resolvedLocale, inflight);
      }

      const nextContent = await inflight;
      if (!cancelled) {
        setContent(cloneKangurAiTutorContent(nextContent));
        setIsLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [defaultContent, isAuthenticated, isActivated, resolvedLocale]);

  const value = useMemo(
    () => ({
      content,
      isLoading,
    }),
    [content, isLoading]
  );

  return (
    <KangurAiTutorContentActivationContext.Provider value={activate}>
      <KangurAiTutorContentContext.Provider value={value}>
        {children}
      </KangurAiTutorContentContext.Provider>
    </KangurAiTutorContentActivationContext.Provider>
  );
}

export function useKangurAiTutorContent(): KangurAiTutorContent {
  const ctx = useContext(KangurAiTutorContentContext);
  const routeLocale = useLocale();
  const resolvedLocale = normalizeSiteLocale(routeLocale);
  const defaultContent = useMemo(
    () =>
      buildKangurAiTutorContentLocaleScaffold({
        locale: resolvedLocale,
        sourceContent: DEFAULT_KANGUR_AI_TUTOR_CONTENT,
      }),
    [resolvedLocale]
  );

  return ctx?.content ?? defaultContent;
}

export function useOptionalKangurAiTutorContent():
  | KangurAiTutorContentContextValue
  | null {
  return useContext(KangurAiTutorContentContext);
}

/**
 * Call this hook to trigger the AI tutor content API fetch.
 * Typically called from the dynamically-loaded AI tutor widget.
 */
export function useActivateKangurAiTutorContent(): void {
  const activate = useContext(KangurAiTutorContentActivationContext);
  useEffect(() => {
    activate?.();
  }, [activate]);
}
