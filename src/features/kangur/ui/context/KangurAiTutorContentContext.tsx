'use client';

import {
  createContext,
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
} from '@/shared/contracts/kangur-ai-tutor-content';
import { api } from '@/shared/lib/api-client';

type KangurAiTutorContentContextValue = {
  content: KangurAiTutorContent;
  isLoading: boolean;
};

type Props = {
  children: ReactNode;
  locale?: string;
};

const KangurAiTutorContentContext = createContext<KangurAiTutorContentContextValue | null>(null);

export function KangurAiTutorContentProvider({
  children,
  locale = 'pl',
}: Props): JSX.Element {
  const [content, setContent] = useState<KangurAiTutorContent>({
    ...DEFAULT_KANGUR_AI_TUTOR_CONTENT,
    locale,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async (): Promise<void> => {
      setIsLoading(true);
      try {
        const response = await api.get<unknown>(
          `/api/kangur/ai-tutor/content?locale=${encodeURIComponent(locale)}`,
          {
            cache: 'no-store',
          }
        );
        if (cancelled) {
          return;
        }
        setContent(parseKangurAiTutorContent(response));
      } catch {
        if (!cancelled) {
          setContent({
            ...DEFAULT_KANGUR_AI_TUTOR_CONTENT,
            locale,
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [locale]);

  const value = useMemo(
    () => ({
      content,
      isLoading,
    }),
    [content, isLoading]
  );

  return (
    <KangurAiTutorContentContext.Provider value={value}>
      {children}
    </KangurAiTutorContentContext.Provider>
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
