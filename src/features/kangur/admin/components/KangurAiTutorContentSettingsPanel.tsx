'use client';

import { type ReactNode, useMemo } from 'react';

import {
  summarizeKangurAiTutorContentTranslationStatuses,
  type KangurAiTutorContentTranslatableSectionKey,
} from '@/features/kangur/server/ai-tutor-content-locale-scaffold';
import type {
  KangurAiTutorTranslationStatusDto,
} from '@/shared/contracts/kangur-ai-tutor-locale-scaffold';
import { Alert, Badge, Button, FormField, FormSection, Textarea } from '@/features/kangur/shared/ui';
import { KANGUR_GRID_RELAXED_CLASSNAME } from '@/features/kangur/ui/design/tokens';

import {
  KangurAdminCard,
  KangurAdminInsetCard,
} from './KangurAdminCard';
import {
  AI_TUTOR_CONTENT_TRANSLATION_LOCALES,
  SectionTranslationFilterStatus,
  useKangurAiTutorContentSettingsState,
} from './KangurAiTutorContentSettingsPanel.hooks';

const SETTINGS_SECTION_CLASS_NAME = 'border-border/60 bg-card/35 shadow-sm';
const AI_TUTOR_HOME_ONBOARDING_STEP_FIELDS = [
  { key: 'home_actions', label: 'Home actions' },
  { key: 'home_quest', label: 'Home quest' },
  { key: 'priority_assignments', label: 'Priority assignments' },
  { key: 'leaderboard', label: 'Leaderboard' },
  { key: 'progress', label: 'Progress' },
] as const;

const AI_TUTOR_CONTENT_SECTION_CARD_KEYS = [
  { key: 'guestIntro', label: 'Guest intro' },
  { key: 'homeOnboarding', label: 'Home onboarding' },
  { key: 'guidedCallout', label: 'Guided callout' },
] as const satisfies ReadonlyArray<{
  key: KangurAiTutorContentTranslatableSectionKey;
  label: string;
}>;

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
    case 'manual': return 'secondary';
    case 'missing':
    case 'source-copy': return 'warning';
    case 'source-locale':
    case 'scaffolded':
    default: return 'outline';
  }
};

const getTranslationStatusFilterButtonVariant = (
  status: SectionTranslationFilterStatus,
  isActive: boolean
): 'outline' | 'secondary' | 'info' | 'warning' => {
  if (!isActive) return 'outline';
  switch (status) {
    case 'manual': return 'secondary';
    case 'scaffolded': return 'info';
    case 'source-copy':
    default: return 'warning';
  }
};

const formatTranslationStatusLabel = (
  locale: string,
  status: KangurAiTutorTranslationStatusDto
): string => {
  switch (status) {
    case 'manual': return `${locale.toUpperCase()} manual`;
    case 'scaffolded': return `${locale.toUpperCase()} scaffolded`;
    case 'source-copy': return `${locale.toUpperCase()} source copy`;
    case 'missing': return `${locale.toUpperCase()} missing`;
    case 'source-locale':
    default: return `${locale.toUpperCase()} source`;
  }
};

export function KangurAiTutorContentSettingsPanel(): React.JSX.Element {
  const state = useKangurAiTutorContentSettingsState();
  const {
    aiTutorContentEditorValue,
    setAiTutorContentEditorValue,
    isAiTutorContentLoading,
    isAiTutorContentSaving,
    isAiTutorContentTranslationStatusLoading,
    activeTranslationStatusFilters,
    setActiveTranslationStatusFilters,
    parsedAiTutorContentState,
    aiTutorContentDirty,
    aiTutorContentBlockingIssues,
    hasAiTutorContentBlockingIssues,
    translationStatusesByLocale,
    handleSaveAiTutorContent,
  } = state;

  const translationSummaryByLocale = useMemo(() => {
    const summary = new Map<string, ReturnType<typeof summarizeKangurAiTutorContentTranslationStatuses>>();
    translationStatusesByLocale.forEach((statuses, locale) => {
      summary.set(locale, summarizeKangurAiTutorContentTranslationStatuses(statuses.values()));
    });
    return summary;
  }, [translationStatusesByLocale]);

  const toggleTranslationStatusFilter = (status: SectionTranslationFilterStatus): void => {
    setActiveTranslationStatusFilters((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const renderSectionTranslationStatus = (
    sectionKey: KangurAiTutorContentTranslatableSectionKey
  ): ReactNode => {
    if (isAiTutorContentTranslationStatusLoading) return null;
    return (
      <div className='flex flex-wrap gap-1.5'>
        {Array.from(translationStatusesByLocale.entries()).map(([locale, statuses]) => {
          const status = statuses.get(sectionKey);
          if (!status) return null;
          if (activeTranslationStatusFilters.length > 0 && !activeTranslationStatusFilters.includes(status as any)) return null;
          return (
            <Badge key={locale} variant={getTranslationStatusBadgeVariant(status)} className='px-1.5 py-0 text-[10px] uppercase font-bold tracking-wider'>
              {formatTranslationStatusLabel(locale, status)}
            </Badge>
          );
        })}
      </div>
    );
  };

  return (
    <KangurAdminCard
      title='AI Tutor Content'
      description='Manage localized content, onboarding steps, and system prompts for the AI Tutor.'
      headerActions={
        <Button
          onClick={() => void handleSaveAiTutorContent()}
          disabled={
            isAiTutorContentSaving ||
            !aiTutorContentDirty ||
            hasAiTutorContentBlockingIssues ||
            !parsedAiTutorContentState.content
          }
          loading={isAiTutorContentSaving}
          size='sm'
        >
          {isAiTutorContentSaving ? 'Saving...' : 'Save Content'}
        </Button>
      }
    >
      <div className='flex flex-col kangur-panel-gap'>
        <Alert variant='info' title='Translation Monitor'>
          <p className='text-sm'>The following locales are monitored for translation status: <strong>{AI_TUTOR_CONTENT_TRANSLATION_LOCALES.join(', ').toUpperCase()}</strong>.</p>
          <div className='mt-3 flex flex-wrap gap-4'>
            {Array.from(translationSummaryByLocale.entries()).map(([locale, summary]) => (
              <div key={locale} className='flex items-center gap-2'>
                <Badge variant='outline' className='font-bold'>{locale.toUpperCase()}</Badge>
                <span className='text-xs text-muted-foreground'>
                  Manual: <strong>{summary.manual}</strong> • Scaffolded: <strong>{summary.scaffolded}</strong> • Copy: <strong>{summary['source-copy']}</strong>
                </span>
              </div>
            ))}
          </div>
        </Alert>

        <div className='flex items-center justify-between gap-4'>
          <div className='flex items-center gap-2'>
            <span className='text-xs font-bold text-muted-foreground uppercase'>Filters:</span>
            {AI_TUTOR_CONTENT_TRANSLATION_FILTER_OPTIONS.map((option) => (
              <Button
                key={option.status}
                onClick={() => toggleTranslationStatusFilter(option.status)}
                variant={getTranslationStatusFilterButtonVariant(option.status, activeTranslationStatusFilters.includes(option.status))}
                size='xs'
                className='h-7 px-2.5 text-[10px] font-bold uppercase tracking-wider'
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
          <FormSection title='Editor (PL Source)' description='JSON source for AI Tutor content.' className={SETTINGS_SECTION_CLASS_NAME}>
            <FormField label='Content JSON' error={parsedAiTutorContentState.error || undefined}>
              <Textarea
                value={aiTutorContentEditorValue}
                onChange={(e) => setAiTutorContentEditorValue(e.target.value)}
                rows={24}
                className='font-mono text-[13px] leading-relaxed'
                disabled={isAiTutorContentLoading}
              />
            </FormField>
          </FormSection>

          <div className='space-y-6'>
            <FormSection title='Validation & Insights' description='Automated checks for the current content.' className={SETTINGS_SECTION_CLASS_NAME}>
              {isAiTutorContentLoading ? (
                <Alert
                  variant='info'
                  title='Loading content'
                  description='Waiting for the Mongo-backed AI Tutor content store.'
                />
              ) : parsedAiTutorContentState.error ? (
                <Alert
                  variant='error'
                  title='Invalid content JSON'
                  description={parsedAiTutorContentState.error}
                />
              ) : !parsedAiTutorContentState.content ? (
                <Alert
                  variant='info'
                  title='No content loaded'
                  description='Reload the Mongo-backed AI Tutor content store or paste JSON to begin editing.'
                />
              ) : aiTutorContentBlockingIssues.length > 0 ? (
                <div className='space-y-3'>
                  {aiTutorContentBlockingIssues.map((issue, idx) => (
                    <Alert key={idx} variant='error' title={issue.title} description={issue.message} />
                  ))}
                </div>
              ) : (
                <Alert variant='success' title='Validation Passed' description='Current content JSON is valid and consistent with patterns.' />
              )}
            </FormSection>

            <div className='space-y-4'>
              <h4 className='text-sm font-bold text-muted-foreground uppercase tracking-wider'>Translatable Sections</h4>
              <div className={KANGUR_GRID_RELAXED_CLASSNAME}>
                {AI_TUTOR_CONTENT_SECTION_CARD_KEYS.map((section) => (
                  <KangurAdminInsetCard key={section.key}>
                    <div className='flex flex-col gap-2'>
                      <span className='text-xs font-bold text-slate-700'>{section.label}</span>
                      {renderSectionTranslationStatus(section.key)}
                    </div>
                  </KangurAdminInsetCard>
                ))}
              </div>
            </div>

            <div className='space-y-4'>
              <h4 className='text-sm font-bold text-muted-foreground uppercase tracking-wider'>Onboarding Steps</h4>
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                {AI_TUTOR_HOME_ONBOARDING_STEP_FIELDS.map((field) => (
                  <KangurAdminInsetCard key={field.key}>
                    <div className='flex flex-col gap-2'>
                      <div className='flex items-center justify-between'>
                        <span className='text-xs font-bold text-slate-700'>{field.label}</span>
                        {parsedAiTutorContentState.content?.homeOnboarding.steps[field.key] ? (
                          <Badge variant='success' className='h-4 px-1 text-[9px]'>Live</Badge>
                        ) : (
                          <Badge variant='outline' className='h-4 px-1 text-[9px]'>Missing</Badge>
                        )}
                      </div>
                      {renderSectionTranslationStatus('homeOnboarding')}
                    </div>
                  </KangurAdminInsetCard>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </KangurAdminCard>
  );
}
