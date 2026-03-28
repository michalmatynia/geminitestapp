'use client';

import { useEffect, useMemo, useState } from 'react';
import { validateKangurAiTutorOnboardingContent } from '@/features/kangur/ai-tutor-onboarding-validation';
import {
  buildKangurAiTutorContentTranslationStatusBySectionKey,
  type KangurAiTutorContentTranslatableSectionKey,
} from '@/features/kangur/server/ai-tutor-content-locale-scaffold';
import {
  DEFAULT_KANGUR_AI_TUTOR_CONTENT,
  parseKangurAiTutorContent,
  type KangurAiTutorContent,
} from '@/features/kangur/shared/contracts/kangur-ai-tutor-content';
import type {
  KangurAiTutorTranslationStatusDto,
} from '@/shared/contracts/kangur-ai-tutor-locale-scaffold';
import { PROMPT_ENGINE_SETTINGS_KEY } from '@/shared/contracts/prompt-engine';
import { VALIDATOR_PATTERN_LISTS_KEY, parseValidatorPatternLists } from '@/shared/contracts/validator';
import { api } from '@/shared/lib/api-client';
import { getEnabledSiteLocaleCodes } from '@/shared/lib/i18n/site-locale';
import { parsePromptEngineSettings } from '@/shared/lib/prompt-engine/settings';
import { useSettingsStore } from '@/features/kangur/shared/providers/SettingsStoreProvider';
import { useToast } from '@/features/kangur/shared/ui';
import {
  withKangurClientError,
  withKangurClientErrorSync,
} from '@/features/kangur/observability/client';

export const AI_TUTOR_CONTENT_EDITOR_LOCALE = 'pl';
export const AI_TUTOR_CONTENT_TRANSLATION_LOCALES = getEnabledSiteLocaleCodes().filter(
  (locale) => locale !== AI_TUTOR_CONTENT_EDITOR_LOCALE
);

export type SectionTranslationFilterStatus = Extract<
  KangurAiTutorTranslationStatusDto,
  'manual' | 'scaffolded' | 'source-copy'
>;

const stringifyAiTutorContent = (content: KangurAiTutorContent): string =>
  `${JSON.stringify(content, null, 2)}\n`;

export function useKangurAiTutorContentSettingsState() {
  const settingsStore = useSettingsStore();
  const { toast } = useToast();
  
  const [aiTutorContentEditorValue, setAiTutorContentEditorValue] = useState<string>(() =>
    stringifyAiTutorContent(DEFAULT_KANGUR_AI_TUTOR_CONTENT)
  );
  const [persistedAiTutorContentEditorValue, setPersistedAiTutorContentEditorValue] =
    useState<string>(() => stringifyAiTutorContent(DEFAULT_KANGUR_AI_TUTOR_CONTENT));
  const [isAiTutorContentLoading, setIsAiTutorContentLoading] = useState(true);
  const [isAiTutorContentSaving, setIsAiTutorContentSaving] = useState(false);
  const [translationContentsByLocale, setTranslationContentsByLocale] = useState<
    Record<string, KangurAiTutorContent | null>
  >({});
  const [isAiTutorContentTranslationStatusLoading, setIsAiTutorContentTranslationStatusLoading] =
    useState(true);
  const [activeTranslationStatusFilters, setActiveTranslationStatusFilters] = useState<
    SectionTranslationFilterStatus[]
  >([]);
  
  const rawValidatorPatternLists = settingsStore.get(VALIDATOR_PATTERN_LISTS_KEY);
  const rawPromptEngineSettings = settingsStore.get(PROMPT_ENGINE_SETTINGS_KEY);

  const loadTranslationContents = async (): Promise<Record<string, KangurAiTutorContent | null>> => {
    if (AI_TUTOR_CONTENT_TRANSLATION_LOCALES.length === 0) {
      return {};
    }

    const localizedContents = await Promise.all(
      AI_TUTOR_CONTENT_TRANSLATION_LOCALES.map(async (locale) => {
        const content = await withKangurClientError(
          {
            source: 'kangur.admin.ai-tutor-content',
            action: 'load-translation-content',
            description: 'Loads localized AI Tutor content to derive translation status badges.',
            context: { locale },
          },
          async () => {
            const response = await api.get<KangurAiTutorContent>('/api/kangur/ai-tutor/content', {
              params: { locale },
              logError: false,
            });
            return parseKangurAiTutorContent(response);
          },
          {
            fallback: null,
            onError: () => {},
          }
        );

        return [locale, content] as const;
      })
    );

    return Object.fromEntries(localizedContents);
  };

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setIsAiTutorContentLoading(true);
      setIsAiTutorContentTranslationStatusLoading(true);
      const [content, localizedContents] = await Promise.all([
        withKangurClientError(
          {
            source: 'kangur.admin.ai-tutor-content',
            action: 'load-content',
            description: 'Loads AI Tutor content for the admin editor.',
            context: { locale: AI_TUTOR_CONTENT_EDITOR_LOCALE },
          },
          async () => {
            const response = await api.get<KangurAiTutorContent>('/api/kangur/ai-tutor/content', {
              params: { locale: AI_TUTOR_CONTENT_EDITOR_LOCALE },
              logError: false,
            });
            return parseKangurAiTutorContent(response);
          },
          {
            fallback: null,
            onError: (error) => {
              if (!cancelled) {
                toast(
                  error instanceof Error ? error.message : 'Failed to load AI Tutor content.',
                  { variant: 'error' }
                );
              }
            },
          }
        ),
        loadTranslationContents(),
      ]);

      if (!cancelled && content) {
        const nextValue = stringifyAiTutorContent(content);
        setAiTutorContentEditorValue(nextValue);
        setPersistedAiTutorContentEditorValue(nextValue);
      }

      if (!cancelled) {
        setTranslationContentsByLocale(localizedContents);
      }

      if (!cancelled) {
        setIsAiTutorContentLoading(false);
        setIsAiTutorContentTranslationStatusLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [toast]);

  const parsedAiTutorContentState = useMemo<
    { content: KangurAiTutorContent | null; error: string | null }
  >(() => {
    return withKangurClientErrorSync(
      {
        source: 'kangur.admin.ai-tutor-content',
        action: 'parse-content-json',
        description: 'Parses AI Tutor content JSON from the editor.',
      },
      () => ({
        content: parseKangurAiTutorContent(JSON.parse(aiTutorContentEditorValue) as unknown),
        error: null,
      }),
      {
        fallback: {
          content: null,
          error: 'Invalid AI Tutor content JSON.',
        } as { content: KangurAiTutorContent | null; error: string | null },
      }
    );
  }, [aiTutorContentEditorValue]);

  const aiTutorContentValidation = useMemo(
    () =>
      parsedAiTutorContentState.content
        ? validateKangurAiTutorOnboardingContent({
          content: parsedAiTutorContentState.content,
          patternLists: parseValidatorPatternLists(rawValidatorPatternLists),
          promptEngineSettings: parsePromptEngineSettings(rawPromptEngineSettings),
        })
        : null,
    [parsedAiTutorContentState.content, rawPromptEngineSettings, rawValidatorPatternLists]
  );

  const aiTutorContentDirty =
    aiTutorContentEditorValue.trim() !== persistedAiTutorContentEditorValue.trim();
  const aiTutorContentBlockingIssues = aiTutorContentValidation?.blockingIssues ?? [];
  const hasAiTutorContentBlockingIssues = aiTutorContentBlockingIssues.length > 0;

  const translationStatusesByLocale = useMemo(() => {
    const sourceContent = parsedAiTutorContentState.content;
    if (!sourceContent) {
      return new Map<string, Map<KangurAiTutorContentTranslatableSectionKey, KangurAiTutorTranslationStatusDto>>();
    }

    const map = new Map<string, Map<KangurAiTutorContentTranslatableSectionKey, KangurAiTutorTranslationStatusDto>>();
    Object.entries(translationContentsByLocale).forEach(([locale, content]) => {
      if (!content) {
        return;
      }
      map.set(
        locale,
        buildKangurAiTutorContentTranslationStatusBySectionKey(sourceContent, content)
      );
    });
    return map;
  }, [parsedAiTutorContentState.content, translationContentsByLocale]);

  const handleSaveAiTutorContent = async (): Promise<void> => {
    const { content } = parsedAiTutorContentState;
    if (!content) {
      return;
    }

    setIsAiTutorContentSaving(true);
    try {
      await withKangurClientError(
        {
          source: 'kangur.admin.ai-tutor-content',
          action: 'save-content',
          description: 'Saves AI Tutor content from the admin editor.',
          context: { locale: AI_TUTOR_CONTENT_EDITOR_LOCALE },
        },
        async () => {
          await api.post('/api/kangur/ai-tutor/content', {
            locale: AI_TUTOR_CONTENT_EDITOR_LOCALE,
            content,
          });
          return true;
        },
        {
          onError: (error) => {
            toast(error instanceof Error ? error.message : 'Failed to save AI Tutor content.', {
              variant: 'error',
            });
          },
        }
      );

      setPersistedAiTutorContentEditorValue(aiTutorContentEditorValue);
      toast('AI Tutor content saved successfully.', { variant: 'success' });
    } finally {
      setIsAiTutorContentSaving(false);
    }
  };

  return {
    aiTutorContentEditorValue,
    setAiTutorContentEditorValue,
    isAiTutorContentLoading,
    isAiTutorContentSaving,
    isAiTutorContentTranslationStatusLoading,
    activeTranslationStatusFilters,
    setActiveTranslationStatusFilters,
    parsedAiTutorContentState,
    aiTutorContentValidation,
    aiTutorContentDirty,
    aiTutorContentBlockingIssues,
    hasAiTutorContentBlockingIssues,
    translationStatusesByLocale,
    handleSaveAiTutorContent,
  };
}
