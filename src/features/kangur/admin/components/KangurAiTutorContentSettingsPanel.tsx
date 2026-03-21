'use client';

import { type ReactNode, useEffect, useMemo, useState } from 'react';

import { validateKangurAiTutorOnboardingContent } from '@/features/kangur/ai-tutor-onboarding-validation';
import {
  buildKangurAiTutorContentTranslationStatusBySectionKey,
  summarizeKangurAiTutorContentTranslationStatuses,
  type KangurAiTutorContentTranslatableSectionKey,
} from '@/features/kangur/server/ai-tutor-content-locale-scaffold';
import {
  DEFAULT_KANGUR_AI_TUTOR_CONTENT,
  parseKangurAiTutorContent,
  type KangurAiTutorContent,
} from '@/features/kangur/shared/contracts/kangur-ai-tutor-content';
import type {
  KangurAiTutorLocaleTranslationStatusDto,
  KangurAiTutorTranslationStatusDto,
} from '@/shared/contracts/kangur-ai-tutor-locale-scaffold';
import { PROMPT_ENGINE_SETTINGS_KEY } from '@/shared/contracts/prompt-engine';
import { VALIDATOR_PATTERN_LISTS_KEY, parseValidatorPatternLists } from '@/shared/contracts/validator';
import { api } from '@/shared/lib/api-client';
import { getEnabledSiteLocaleCodes } from '@/shared/lib/i18n/site-locale';
import { parsePromptEngineSettings } from '@/shared/lib/prompt-engine/settings';
import { useSettingsStore } from '@/features/kangur/shared/providers/SettingsStoreProvider';
import { Alert, Badge, Button, Card, FormField, FormSection, Input, Textarea, useToast } from '@/features/kangur/shared/ui';
import { KANGUR_GRID_RELAXED_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import {
  withKangurClientError,
  withKangurClientErrorSync,
} from '@/features/kangur/observability/client';

import {
  KANGUR_ADMIN_INSET_CARD_CLASS_NAME,
  KangurAdminCard,
  KangurAdminInsetCard,
} from './KangurAdminCard';

const AI_TUTOR_CONTENT_EDITOR_LOCALE = 'pl';
const AI_TUTOR_CONTENT_TRANSLATION_LOCALES = getEnabledSiteLocaleCodes().filter(
  (locale) => locale !== AI_TUTOR_CONTENT_EDITOR_LOCALE
);
const SETTINGS_SECTION_CLASS_NAME = 'border-border/60 bg-card/35 shadow-sm';
const AI_TUTOR_HOME_ONBOARDING_STEP_FIELDS = [
  { key: 'home_actions', label: 'Home actions' },
  { key: 'home_quest', label: 'Home quest' },
  { key: 'priority_assignments', label: 'Priority assignments' },
  { key: 'leaderboard', label: 'Leaderboard' },
  { key: 'progress', label: 'Progress' },
] as const;

const AI_TUTOR_CONTENT_SECTION_CARD_KEYS = [
  {
    key: 'guestIntro',
    label: 'Guest intro',
  },
  {
    key: 'homeOnboarding',
    label: 'Home onboarding',
  },
  {
    key: 'guidedCallout',
    label: 'Guided callout',
  },
] as const satisfies ReadonlyArray<{
  key: KangurAiTutorContentTranslatableSectionKey;
  label: string;
}>;

const stringifyAiTutorContent = (content: KangurAiTutorContent): string =>
  `${JSON.stringify(content, null, 2)}\n`;

type SectionTranslationStatus = KangurAiTutorLocaleTranslationStatusDto;

type SectionTranslationFilterStatus = Extract<
  KangurAiTutorTranslationStatusDto,
  'manual' | 'scaffolded' | 'source-copy'
>;

const AI_TUTOR_CONTENT_TRANSLATION_FILTER_OPTIONS = [
  { status: 'manual', label: 'Manual' },
  { status: 'scaffolded', label: 'Scaffolded' },
  { status: 'source-copy', label: 'Source copy' },
] as const satisfies ReadonlyArray<{
  status: SectionTranslationFilterStatus;
  label: string;
}>;

const getTranslationStatusBadgeVariant = (
  status: KangurAiTutorTranslationStatusDto
): 'outline' | 'secondary' | 'warning' => {
  switch (status) {
    case 'manual':
      return 'secondary';
    case 'missing':
    case 'source-copy':
      return 'warning';
    case 'source-locale':
    case 'scaffolded':
    default:
      return 'outline';
  }
};

const getTranslationStatusFilterButtonVariant = (
  status: SectionTranslationFilterStatus,
  isActive: boolean
): 'outline' | 'secondary' | 'info' | 'warning' => {
  if (!isActive) {
    return 'outline';
  }

  switch (status) {
    case 'manual':
      return 'secondary';
    case 'scaffolded':
      return 'info';
    case 'source-copy':
    default:
      return 'warning';
  }
};

const formatTranslationStatusLabel = (
  locale: string,
  status: KangurAiTutorTranslationStatusDto
): string => {
  switch (status) {
    case 'manual':
      return `${locale.toUpperCase()} manual`;
    case 'scaffolded':
      return `${locale.toUpperCase()} scaffolded`;
    case 'source-copy':
      return `${locale.toUpperCase()} source copy`;
    case 'missing':
      return `${locale.toUpperCase()} missing`;
    case 'source-locale':
    default:
      return `${locale.toUpperCase()} source`;
  }
};

export function KangurAiTutorContentSettingsPanel(): React.JSX.Element {
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
            onError: () => {
              // Translation status is additive; keep the editor usable if a locale fetch fails.
            },
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
                  {
                    variant: 'error',
                  }
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
      return new Map<
        string,
        Map<KangurAiTutorContentTranslatableSectionKey, KangurAiTutorTranslationStatusDto>
      >();
    }

    return new Map(
      AI_TUTOR_CONTENT_TRANSLATION_LOCALES.map((locale) => [
        locale,
        buildKangurAiTutorContentTranslationStatusBySectionKey({
          locale,
          sourceContent,
          localizedContent: translationContentsByLocale[locale] ?? null,
          sourceLocale: AI_TUTOR_CONTENT_EDITOR_LOCALE,
        }),
      ])
    );
  }, [parsedAiTutorContentState.content, translationContentsByLocale]);
  const translationStatusSummaries = useMemo(
    () =>
      AI_TUTOR_CONTENT_TRANSLATION_LOCALES.map((locale) => ({
        locale,
        summary: summarizeKangurAiTutorContentTranslationStatuses(
          translationStatusesByLocale.get(locale)?.values() ?? []
        ),
      })),
    [translationStatusesByLocale]
  );
  const trackedTranslationLocales = useMemo(
    () =>
      translationStatusSummaries
        .filter(
          ({ summary }) =>
            summary.manual > 0 || summary.scaffolded > 0 || summary.missing > 0
        )
        .map(({ locale }) => locale),
    [translationStatusSummaries]
  );
  const sectionTranslationStatuses = useMemo(() => {
    const sectionStatuses = new Map<
      KangurAiTutorContentTranslatableSectionKey,
      SectionTranslationStatus[]
    >();

    for (const section of AI_TUTOR_CONTENT_SECTION_CARD_KEYS) {
      sectionStatuses.set(
        section.key,
        trackedTranslationLocales.map((locale) => ({
          locale,
          status: translationStatusesByLocale.get(locale)?.get(section.key) ?? 'missing',
        }))
      );
    }

    return sectionStatuses;
  }, [trackedTranslationLocales, translationStatusesByLocale]);
  const translationFilterMatchCounts = useMemo(
    () =>
      new Map(
        AI_TUTOR_CONTENT_TRANSLATION_FILTER_OPTIONS.map(({ status }) => [
          status,
          AI_TUTOR_CONTENT_SECTION_CARD_KEYS.filter((section) =>
            (sectionTranslationStatuses.get(section.key) ?? []).some(
              (sectionStatus) => sectionStatus.status === status
            )
          ).length,
        ])
      ),
    [sectionTranslationStatuses]
  );
  const visibleStructuredSections = useMemo(() => {
    if (
      isAiTutorContentTranslationStatusLoading ||
      activeTranslationStatusFilters.length === 0
    ) {
      return AI_TUTOR_CONTENT_SECTION_CARD_KEYS;
    }

    return AI_TUTOR_CONTENT_SECTION_CARD_KEYS.filter((section) =>
      (sectionTranslationStatuses.get(section.key) ?? []).some((sectionStatus) =>
        activeTranslationStatusFilters.includes(
          sectionStatus.status as SectionTranslationFilterStatus
        )
      )
    );
  }, [
    activeTranslationStatusFilters,
    isAiTutorContentTranslationStatusLoading,
    sectionTranslationStatuses,
  ]);
  const visibleStructuredSectionKeys = useMemo(
    () => new Set(visibleStructuredSections.map((section) => section.key)),
    [visibleStructuredSections]
  );

  const applyAiTutorContent = (nextContent: KangurAiTutorContent): void => {
    setAiTutorContentEditorValue(stringifyAiTutorContent(parseKangurAiTutorContent(nextContent)));
  };

  const updateAiTutorContent = (
    updater: (content: KangurAiTutorContent) => KangurAiTutorContent
  ): void => {
    if (!parsedAiTutorContentState.content) {
      return;
    }
    applyAiTutorContent(updater(parsedAiTutorContentState.content));
  };

  const renderAiTutorContentIssues = (path: string): ReactNode => {
    const issues = aiTutorContentValidation?.issues.filter((issue) => issue.path === path) ?? [];
    if (issues.length === 0) {
      return null;
    }

    return (
      <div className='mt-2 space-y-2'>
        {issues.map((issue, index) => (
          <Alert
            key={`${path}-${issue.ruleId ?? issue.title}-${index}`}
            variant={issue.blocking ? 'error' : 'warning'}
            className='text-xs'
            title={issue.title}
          >
            {issue.message}
          </Alert>
        ))}
      </div>
    );
  };

  const handleResetAiTutorContentToDefaults = (): void => {
    setAiTutorContentEditorValue(stringifyAiTutorContent(DEFAULT_KANGUR_AI_TUTOR_CONTENT));
  };

  const handleReloadAiTutorContent = async (): Promise<void> => {
    setIsAiTutorContentLoading(true);
    setIsAiTutorContentTranslationStatusLoading(true);
    const [content, localizedContents] = await Promise.all([
      withKangurClientError(
        {
          source: 'kangur.admin.ai-tutor-content',
          action: 'reload-content',
          description: 'Reloads AI Tutor content from the server.',
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
            toast(error instanceof Error ? error.message : 'Failed to reload AI Tutor content.', {
              variant: 'error',
            });
          },
        }
      ),
      loadTranslationContents(),
    ]);

    if (content) {
      const nextValue = stringifyAiTutorContent(content);
      setAiTutorContentEditorValue(nextValue);
      setPersistedAiTutorContentEditorValue(nextValue);
      toast('Kangur AI Tutor content reloaded.', { variant: 'success' });
    }
    setTranslationContentsByLocale(localizedContents);
    setIsAiTutorContentLoading(false);
    setIsAiTutorContentTranslationStatusLoading(false);
  };

  const handleSaveAiTutorContent = async (): Promise<void> => {
    if (parsedAiTutorContentState.error) {
      toast(parsedAiTutorContentState.error, { variant: 'error' });
      return;
    }
    if (!parsedAiTutorContentState.content) {
      toast('AI Tutor content JSON is invalid.', { variant: 'error' });
      return;
    }
    if (hasAiTutorContentBlockingIssues) {
      toast('Resolve blocking AI Tutor onboarding validation issues before saving.', {
        variant: 'error',
      });
      return;
    }
    setIsAiTutorContentSaving(true);
    const savedContent = await withKangurClientError(
      {
        source: 'kangur.admin.ai-tutor-content',
        action: 'save-content',
        description: 'Saves AI Tutor content from the admin editor.',
      },
      async () => {
        const saved = await api.post<KangurAiTutorContent>(
          '/api/kangur/ai-tutor/content',
          parsedAiTutorContentState.content,
          { logError: false }
        );
        return parseKangurAiTutorContent(saved);
      },
      {
        fallback: null,
        onError: (error) => {
          toast(error instanceof Error ? error.message : 'Failed to save AI Tutor content.', {
            variant: 'error',
          });
        },
      }
    );

    if (savedContent) {
      const nextValue = stringifyAiTutorContent(savedContent);
      setAiTutorContentEditorValue(nextValue);
      setPersistedAiTutorContentEditorValue(nextValue);
      toast('Kangur AI Tutor content saved.', { variant: 'success' });
    }
    setIsAiTutorContentSaving(false);
  };

  return (
    <FormSection
      title='AI Tutor Content'
      description='Edit the Mongo-backed tutor copy pack used by onboarding, helper prompts, labels, narrator controls, and tutor explanations.'
      className={SETTINGS_SECTION_CLASS_NAME}
    >
      <KangurAdminCard>
        <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
          <div>
            <div className='flex items-center gap-2'>
              <div className='text-sm font-semibold text-foreground'>Mongo content pack</div>
              <Badge variant='secondary'>Locale {AI_TUTOR_CONTENT_EDITOR_LOCALE}</Badge>
            </div>
            <p className='mt-1 text-sm text-muted-foreground'>
              Validation uses the shared Kangur AI Tutor content schema. Save writes directly
              to Mongo and the runtime loader reads the same document.
            </p>
          </div>
          <div className='flex flex-wrap gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => {
                void handleReloadAiTutorContent();
              }}
              disabled={isAiTutorContentLoading || isAiTutorContentSaving}
            >
              {isAiTutorContentLoading ? 'Loading...' : 'Reload Mongo content'}
            </Button>
            <Button
              variant='ghost'
              size='sm'
              onClick={handleResetAiTutorContentToDefaults}
              disabled={isAiTutorContentSaving}
            >
              Reset to defaults
            </Button>
            <Button
              size='sm'
              onClick={() => {
                void handleSaveAiTutorContent();
              }}
              disabled={
                isAiTutorContentLoading ||
                isAiTutorContentSaving ||
                !aiTutorContentDirty ||
                Boolean(parsedAiTutorContentState.error) ||
                hasAiTutorContentBlockingIssues
              }
            >
              {isAiTutorContentSaving ? 'Saving content...' : 'Save Mongo content'}
            </Button>
          </div>
        </div>

        {aiTutorContentValidation ? (
          <div className='mt-4 rounded-2xl border border-border/60 bg-background/60 px-4 py-4 shadow-sm'>
            <div className='flex flex-wrap items-center gap-2'>
              <div className='text-sm font-semibold text-foreground'>Onboarding validation</div>
              <Badge variant={hasAiTutorContentBlockingIssues ? 'warning' : 'secondary'}>
                {hasAiTutorContentBlockingIssues
                  ? `${aiTutorContentBlockingIssues.length} blocking`
                  : 'Ready to save'}
              </Badge>
              <Badge variant='outline'>{aiTutorContentValidation.issues.length} issues</Badge>
              <Badge variant='outline'>{aiTutorContentValidation.ruleIds.length} rules</Badge>
              <Badge variant='outline'>{aiTutorContentValidation.listName}</Badge>
            </div>
            {aiTutorContentValidation.issues.length > 0 ? (
              <div className='mt-3 space-y-2'>
                {aiTutorContentValidation.issues.map((issue, index) => (
                  <Alert
                    key={`${issue.path}-${issue.ruleId ?? issue.title}-${index}`}
                    variant={issue.blocking ? 'error' : 'warning'}
                    title={issue.path}
                    className='text-xs'
                  >
                    <div className='font-medium'>{issue.title}</div>
                    <div className='mt-1'>{issue.message}</div>
                  </Alert>
                ))}
              </div>
            ) : (
              <p className='mt-2 text-sm text-muted-foreground'>
                Guest intro and home onboarding copy satisfy the shared AI Tutor onboarding rules.
              </p>
            )}
          </div>
        ) : null}

        {AI_TUTOR_CONTENT_TRANSLATION_LOCALES.length > 0 ? (
          <KangurAdminInsetCard className='mt-4'>
            <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
              <div>
                <div className='text-sm font-semibold text-foreground'>Translation status</div>
                <p className='mt-1 text-sm text-muted-foreground'>
                  Compares the current Polish source content pack with localized Mongo documents to
                  show which sections are still scaffolded, still match source copy, or already
                  have manual translation edits.
                </p>
              </div>
              <div className='flex flex-wrap gap-2'>
                <Badge
                  variant={isAiTutorContentTranslationStatusLoading ? 'warning' : 'outline'}
                >
                  {`${trackedTranslationLocales.length} locales tracked`}
                </Badge>
              </div>
            </div>

            <div className='mt-3 grid gap-3 md:grid-cols-2'>
              {translationStatusSummaries
                .filter(({ locale }) => trackedTranslationLocales.includes(locale))
                .map(({ locale, summary }) => (
                <div
                  key={locale}
                  className='rounded-xl border border-border/60 bg-card/40 px-3 py-3 text-sm'
                >
                  <div className='flex items-center justify-between gap-2'>
                    <div className='font-semibold text-foreground'>{locale.toUpperCase()}</div>
                    <Badge variant='outline'>
                      {summary.manual + summary.scaffolded + summary['source-copy'] + summary.missing}{' '}
                      sections
                    </Badge>
                  </div>
                  <div className='mt-2 flex flex-wrap gap-2'>
                    <Badge variant='secondary'>{summary.manual} manual</Badge>
                    <Badge variant='outline'>{summary.scaffolded} scaffolded</Badge>
                    <Badge variant='warning'>{summary['source-copy']} source copy</Badge>
                    {summary.missing > 0 ? (
                      <Badge variant='warning'>{summary.missing} missing</Badge>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <div className='mt-4 rounded-xl border border-border/60 bg-card/35 px-3 py-3'>
              <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
                <div>
                  <div className='text-sm font-semibold text-foreground'>
                    Structured section filters
                  </div>
                  <p className='mt-1 text-sm text-muted-foreground'>
                    Show only the structured sections where at least one tracked locale matches the
                    selected translation status.
                  </p>
                </div>
                <Badge variant='outline'>
                  {visibleStructuredSections.length} of {AI_TUTOR_CONTENT_SECTION_CARD_KEYS.length}{' '}
                  visible
                </Badge>
              </div>

              <div className='mt-3 flex flex-wrap gap-2'>
                <Button
                  type='button'
                  size='xs'
                  variant={activeTranslationStatusFilters.length === 0 ? 'secondary' : 'outline'}
                  aria-pressed={activeTranslationStatusFilters.length === 0}
                  aria-label='Show all structured sections'
                  onClick={() => setActiveTranslationStatusFilters([])}
                >
                  All sections
                </Button>
                {AI_TUTOR_CONTENT_TRANSLATION_FILTER_OPTIONS.map(({ status, label }) => {
                  const isActive = activeTranslationStatusFilters.includes(status);
                  return (
                    <Button
                      key={status}
                      type='button'
                      size='xs'
                      variant={getTranslationStatusFilterButtonVariant(status, isActive)}
                      aria-pressed={isActive}
                      aria-label={`Toggle ${label.toLowerCase()} sections filter`}
                      onClick={() =>
                        setActiveTranslationStatusFilters((current) =>
                          current.includes(status)
                            ? current.filter((currentStatus) => currentStatus !== status)
                            : [...current, status]
                        )
                      }
                    >
                      {label}
                      <span className='ml-1 text-xs opacity-80'>
                        {translationFilterMatchCounts.get(status) ?? 0}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </div>
          </KangurAdminInsetCard>
        ) : null}

        {parsedAiTutorContentState.content ? (
          <div className='mt-4 space-y-4'>
            {visibleStructuredSections.length === 0 ? (
              <KangurAdminInsetCard>
                No structured AI Tutor sections match the current translation status filters.
              </KangurAdminInsetCard>
            ) : null}

            {visibleStructuredSectionKeys.has('guestIntro') ? (
            <KangurAdminInsetCard>
              <div className='flex items-center gap-2'>
                <div className='text-sm font-semibold text-foreground'>
                  Structured onboarding editor
                </div>
                <Badge variant='secondary'>Guest intro</Badge>
                {(sectionTranslationStatuses.get('guestIntro') ?? []).map(({ locale, status }) => (
                  <Badge key={`guestIntro-${locale}`} variant={getTranslationStatusBadgeVariant(status)}>
                    {formatTranslationStatusLabel(locale, status)}
                  </Badge>
                ))}
              </div>
              <p className='mt-1 text-sm text-muted-foreground'>
                Edit the learner-facing onboarding copy directly. Changes still sync back into the full Mongo JSON below.
              </p>

              <div className={`${KANGUR_GRID_RELAXED_CLASSNAME} mt-4 lg:grid-cols-2`}>
                <FormField label='Initial headline'>
                  <Input
                    value={parsedAiTutorContentState.content.guestIntro.initial.headline}
                    onChange={(event) =>
                      updateAiTutorContent((content) => ({
                        ...content,
                        guestIntro: {
                          ...content.guestIntro,
                          initial: {
                            ...content.guestIntro.initial,
                            headline: event.target.value,
                          },
                        },
                      }))
                    }
                    aria-label='AI Tutor initial guest intro headline'
                   title='Initial headline'/>
                  {renderAiTutorContentIssues('guestIntro.initial.headline')}
                </FormField>
                <FormField label='Initial description'>
                  <Textarea
                    value={parsedAiTutorContentState.content.guestIntro.initial.description}
                    onChange={(event) =>
                      updateAiTutorContent((content) => ({
                        ...content,
                        guestIntro: {
                          ...content.guestIntro,
                          initial: {
                            ...content.guestIntro.initial,
                            description: event.target.value,
                          },
                        },
                      }))
                    }
                    rows={4}
                    aria-label='AI Tutor initial guest intro description'
                   title='Initial description'/>
                  {renderAiTutorContentIssues('guestIntro.initial.description')}
                </FormField>
              </div>

              <div className={`${KANGUR_GRID_RELAXED_CLASSNAME} mt-4 lg:grid-cols-2`}>
                <FormField label='Repeated-entry description'>
                  <Textarea
                    value={parsedAiTutorContentState.content.guestIntro.repeated.description}
                    onChange={(event) =>
                      updateAiTutorContent((content) => ({
                        ...content,
                        guestIntro: {
                          ...content.guestIntro,
                          repeated: {
                            ...content.guestIntro.repeated,
                            description: event.target.value,
                          },
                        },
                      }))
                    }
                    rows={4}
                    aria-label='AI Tutor repeated entry description'
                   title='Repeated-entry description'/>
                  {renderAiTutorContentIssues('guestIntro.repeated.description')}
                </FormField>
                <FormField label='Help headline'>
                  <Input
                    value={parsedAiTutorContentState.content.guestIntro.help.headline}
                    onChange={(event) =>
                      updateAiTutorContent((content) => ({
                        ...content,
                        guestIntro: {
                          ...content.guestIntro,
                          help: {
                            ...content.guestIntro.help,
                            headline: event.target.value,
                          },
                        },
                      }))
                    }
                    aria-label='AI Tutor help headline'
                   title='Help headline'/>
                  {renderAiTutorContentIssues('guestIntro.help.headline')}
                </FormField>
              </div>

              <FormField label='Help description' className='mt-4'>
                <Textarea
                  value={parsedAiTutorContentState.content.guestIntro.help.description}
                  onChange={(event) =>
                    updateAiTutorContent((content) => ({
                      ...content,
                      guestIntro: {
                        ...content.guestIntro,
                        help: {
                          ...content.guestIntro.help,
                          description: event.target.value,
                        },
                      },
                    }))
                  }
                  rows={4}
                  aria-label='AI Tutor help description'
                 title='Help description'/>
                {renderAiTutorContentIssues('guestIntro.help.description')}
              </FormField>
            </KangurAdminInsetCard>
            ) : null}

            {visibleStructuredSectionKeys.has('homeOnboarding') ? (
            <KangurAdminInsetCard>
              <div className='flex items-center gap-2'>
                <div className='text-sm font-semibold text-foreground'>
                  Home onboarding
                </div>
                <Badge variant='secondary'>Walkthrough</Badge>
                {(sectionTranslationStatuses.get('homeOnboarding') ?? []).map(
                  ({ locale, status }) => (
                    <Badge
                      key={`homeOnboarding-${locale}`}
                      variant={getTranslationStatusBadgeVariant(status)}
                    >
                      {formatTranslationStatusLabel(locale, status)}
                    </Badge>
                  )
                )}
              </div>
              <p className='mt-1 text-sm text-muted-foreground'>
                These fields drive the built-in home walkthrough shown before any model-based tutoring.
              </p>

              <div className={`${KANGUR_GRID_RELAXED_CLASSNAME} mt-4 lg:grid-cols-2`}>
                <FormField label='Callout header label'>
                  <Input
                    value={parsedAiTutorContentState.content.homeOnboarding.calloutHeaderLabel}
                    onChange={(event) =>
                      updateAiTutorContent((content) => ({
                        ...content,
                        homeOnboarding: {
                          ...content.homeOnboarding,
                          calloutHeaderLabel: event.target.value,
                        },
                      }))
                    }
                    aria-label='AI Tutor onboarding callout header label'
                   title='Callout header label'/>
                  {renderAiTutorContentIssues('homeOnboarding.calloutHeaderLabel')}
                </FormField>
                <FormField label='Step label template'>
                  <Input
                    value={parsedAiTutorContentState.content.homeOnboarding.stepLabelTemplate}
                    onChange={(event) =>
                      updateAiTutorContent((content) => ({
                        ...content,
                        homeOnboarding: {
                          ...content.homeOnboarding,
                          stepLabelTemplate: event.target.value,
                        },
                      }))
                    }
                    aria-label='AI Tutor onboarding step label template'
                   title='Step label template'/>
                  {renderAiTutorContentIssues('homeOnboarding.stepLabelTemplate')}
                </FormField>
              </div>

              <div className={`${KANGUR_GRID_RELAXED_CLASSNAME} mt-4 lg:grid-cols-2`}>
                <FormField label='Manual start label'>
                  <Input
                    value={parsedAiTutorContentState.content.homeOnboarding.manualStartLabel}
                    onChange={(event) =>
                      updateAiTutorContent((content) => ({
                        ...content,
                        homeOnboarding: {
                          ...content.homeOnboarding,
                          manualStartLabel: event.target.value,
                        },
                      }))
                    }
                    aria-label='AI Tutor onboarding manual start label'
                   title='Manual start label'/>
                  {renderAiTutorContentIssues('homeOnboarding.manualStartLabel')}
                </FormField>
                <FormField label='Manual replay label'>
                  <Input
                    value={parsedAiTutorContentState.content.homeOnboarding.manualReplayLabel}
                    onChange={(event) =>
                      updateAiTutorContent((content) => ({
                        ...content,
                        homeOnboarding: {
                          ...content.homeOnboarding,
                          manualReplayLabel: event.target.value,
                        },
                      }))
                    }
                    aria-label='AI Tutor onboarding manual replay label'
                   title='Manual replay label'/>
                  {renderAiTutorContentIssues('homeOnboarding.manualReplayLabel')}
                </FormField>
              </div>

              <div className={`${KANGUR_GRID_RELAXED_CLASSNAME} mt-4 xl:grid-cols-2`}>
                {AI_TUTOR_HOME_ONBOARDING_STEP_FIELDS.map((step) => (
                  <Card
                    key={step.key}
                    variant='subtle'
                    padding='md'
                    className={KANGUR_ADMIN_INSET_CARD_CLASS_NAME}
                  >
                    <div className='flex items-center gap-2'>
                      <div className='text-sm font-semibold text-foreground'>{step.label}</div>
                      <Badge variant='outline'>{step.key}</Badge>
                    </div>
                    <div className='mt-3 space-y-4'>
                      <FormField label='Step title'>
                        <Input
                          value={
                            parsedAiTutorContentState.content?.homeOnboarding.steps[step.key]
                              .title ?? ''
                          }
                          onChange={(event) =>
                            updateAiTutorContent((content) => ({
                              ...content,
                              homeOnboarding: {
                                ...content.homeOnboarding,
                                steps: {
                                  ...content.homeOnboarding.steps,
                                  [step.key]: {
                                    ...content.homeOnboarding.steps[step.key],
                                    title: event.target.value,
                                  },
                                },
                              },
                            }))
                          }
                          aria-label={`AI Tutor onboarding ${step.label} title`}
                         title='Step title'/>
                        {renderAiTutorContentIssues(`homeOnboarding.steps.${step.key}.title`)}
                      </FormField>
                      <FormField label='Step description'>
                        <Textarea
                          value={
                            parsedAiTutorContentState.content?.homeOnboarding.steps[step.key]
                              .description ?? ''
                          }
                          onChange={(event) =>
                            updateAiTutorContent((content) => ({
                              ...content,
                              homeOnboarding: {
                                ...content.homeOnboarding,
                                steps: {
                                  ...content.homeOnboarding.steps,
                                  [step.key]: {
                                    ...content.homeOnboarding.steps[step.key],
                                    description: event.target.value,
                                  },
                                },
                              },
                            }))
                          }
                          rows={4}
                          aria-label={`AI Tutor onboarding ${step.label} description`}
                         title='Step description'/>
                        {renderAiTutorContentIssues(`homeOnboarding.steps.${step.key}.description`)}
                      </FormField>
                    </div>
                  </Card>
                ))}
              </div>
            </KangurAdminInsetCard>
            ) : null}

            {visibleStructuredSectionKeys.has('guidedCallout') ? (
            <KangurAdminInsetCard>
              <div className='flex items-center gap-2'>
                <div className='text-sm font-semibold text-foreground'>
                  Guided onboarding buttons
                </div>
                <Badge variant='secondary'>Callout</Badge>
                {(sectionTranslationStatuses.get('guidedCallout') ?? []).map(
                  ({ locale, status }) => (
                    <Badge
                      key={`guidedCallout-${locale}`}
                      variant={getTranslationStatusBadgeVariant(status)}
                    >
                      {formatTranslationStatusLabel(locale, status)}
                    </Badge>
                  )
                )}
              </div>
              <div className={`${KANGUR_GRID_RELAXED_CLASSNAME} mt-4 lg:grid-cols-3`}>
                <FormField label='Back button'>
                  <Input
                    value={parsedAiTutorContentState.content.guidedCallout.buttons.back}
                    onChange={(event) =>
                      updateAiTutorContent((content) => ({
                        ...content,
                        guidedCallout: {
                          ...content.guidedCallout,
                          buttons: {
                            ...content.guidedCallout.buttons,
                            back: event.target.value,
                          },
                        },
                      }))
                    }
                    aria-label='AI Tutor guided callout back button'
                   title='Back button'/>
                  {renderAiTutorContentIssues('guidedCallout.buttons.back')}
                </FormField>
                <FormField label='Finish button'>
                  <Input
                    value={parsedAiTutorContentState.content.guidedCallout.buttons.finish}
                    onChange={(event) =>
                      updateAiTutorContent((content) => ({
                        ...content,
                        guidedCallout: {
                          ...content.guidedCallout,
                          buttons: {
                            ...content.guidedCallout.buttons,
                            finish: event.target.value,
                          },
                        },
                      }))
                    }
                    aria-label='AI Tutor guided callout finish button'
                   title='Finish button'/>
                  {renderAiTutorContentIssues('guidedCallout.buttons.finish')}
                </FormField>
                <FormField label='Rozumiem button'>
                  <Input
                    value={parsedAiTutorContentState.content.guidedCallout.buttons.understand}
                    onChange={(event) =>
                      updateAiTutorContent((content) => ({
                        ...content,
                        guidedCallout: {
                          ...content.guidedCallout,
                          buttons: {
                            ...content.guidedCallout.buttons,
                            understand: event.target.value,
                          },
                        },
                      }))
                    }
                    aria-label='AI Tutor guided callout understand button'
                   title='Rozumiem button'/>
                  {renderAiTutorContentIssues('guidedCallout.buttons.understand')}
                </FormField>
              </div>
            </KangurAdminInsetCard>
            ) : null}
          </div>
        ) : (
          <Card
            variant='subtle'
            padding='md'
            className='mt-4 rounded-2xl border-border/60 bg-amber-50/60 text-sm text-amber-900 shadow-sm'
          >
            Structured onboarding editing is temporarily disabled because the raw content JSON is invalid.
            Fix the JSON below or reload the content from Mongo first.
          </Card>
        )}

        <FormField
          label='Tutor content JSON'
          description='Malformed JSON or schema-invalid values will be rejected. Missing keys are backfilled from defaults when the document is loaded.'
          className='mt-4'
        >
          <Textarea
            value={aiTutorContentEditorValue}
            onChange={(event) => setAiTutorContentEditorValue(event.target.value)}
            rows={26}
            spellCheck={false}
            aria-label='Tutor content JSON'
            className='font-mono text-xs leading-6'
           title='Tutor content JSON'/>
        </FormField>

        <div className='mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
          <Badge variant={aiTutorContentDirty ? 'warning' : 'outline'}>
            {aiTutorContentDirty ? 'Unsaved content changes' : 'Mongo content in sync'}
          </Badge>
          {parsedAiTutorContentState.error ? <Badge variant='warning'>Invalid JSON</Badge> : null}
          {aiTutorContentValidation ? (
            <Badge variant={hasAiTutorContentBlockingIssues ? 'warning' : 'outline'}>
              {hasAiTutorContentBlockingIssues
                ? `${aiTutorContentBlockingIssues.length} blocking onboarding issues`
                : 'Onboarding validation clean'}
            </Badge>
          ) : null}
          {parsedAiTutorContentState.error ? (
            <span>Validation: {parsedAiTutorContentState.error}</span>
          ) : null}
          <span>Endpoint: /api/kangur/ai-tutor/content</span>
        </div>
      </KangurAdminCard>
    </FormSection>
  );
}
