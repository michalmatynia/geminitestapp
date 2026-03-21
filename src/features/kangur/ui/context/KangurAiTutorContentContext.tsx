'use client';

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
  parseKangurAiTutorContent,
  type KangurAiTutorContent,
} from '@/features/kangur/shared/contracts/kangur-ai-tutor-content';
import { useKangurAuthState } from '@/features/kangur/ui/context/KangurAuthContext';
import { api } from '@/shared/lib/api-client';
import { withKangurClientError } from '@/features/kangur/observability/client';


type KangurAiTutorContentContextValue = {
  content: KangurAiTutorContent;
  isLoading: boolean;
};

type Props = {
  children: ReactNode;
  locale?: string;
};

const KangurAiTutorContentContext = createContext<KangurAiTutorContentContextValue | null>(null);

/**
 * Activation context — the AI tutor content API call is deferred until a
 * consumer (typically the dynamically-loaded widget) calls `activate()`.
 * Until then, `DEFAULT_KANGUR_AI_TUTOR_CONTENT` is used synchronously.
 */
const KangurAiTutorContentActivationContext = createContext<(() => void) | null>(null);

export function KangurAiTutorContentProvider({
  children,
  locale = 'pl',
}: Props): JSX.Element {
  const { isAuthenticated } = useKangurAuthState();
  const [content, setContent] = useState<KangurAiTutorContent>({
    ...DEFAULT_KANGUR_AI_TUTOR_CONTENT,
    locale,
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
      setIsLoading(true);
      await withKangurClientError(
        {
          source: 'kangur-ai-tutor-content',
          action: 'load',
          description: 'Load AI tutor content for the selected locale.',
          context: {
            locale,
          },
        },
        async () => {
          const response = await api.get<KangurAiTutorContent>(
            `/api/kangur/ai-tutor/content?locale=${encodeURIComponent(locale)}`,
            {
              cache: 'no-store',
            }
          );
          if (cancelled) {
            return;
          }
          setContent(parseKangurAiTutorContent(response));
        },
        {
          fallback: undefined,
          onError: () => {
            if (!cancelled) {
              setContent({
                ...DEFAULT_KANGUR_AI_TUTOR_CONTENT,
                locale,
              });
            }
          },
        }
      );
      if (!cancelled) {
        setIsLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isActivated, locale]);

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
  return ctx?.content ?? DEFAULT_KANGUR_AI_TUTOR_CONTENT;
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
