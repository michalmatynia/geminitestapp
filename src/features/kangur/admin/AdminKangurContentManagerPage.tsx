'use client';

import {
  AlertTriangle,
  BookOpen,
  EyeOff,
  FileText,
  ScrollText,
  Trophy,
  Volume2,
  type LucideIcon,
} from 'lucide-react';
import React, { useState } from 'react';

import type { IdLabelOptionDto } from '@/shared/contracts/base';
import { useKangurLessonDocuments, useKangurLessons } from '@/features/kangur/ui/hooks/useKangurLessons';
import {
  KANGUR_TEST_QUESTIONS_SETTING_KEY,
  parseKangurTestQuestionStore,
} from '@/features/kangur/test-suites/questions';
import { KANGUR_TEST_SUITES_SETTING_KEY, parseKangurTestSuites } from '@/features/kangur/test-suites';
import { useSettingsStore } from '@/features/kangur/shared/providers/SettingsStoreProvider';
import { Badge, Card } from '@/features/kangur/shared/ui';
import { cn } from '@/features/kangur/shared/utils';
import {
  KANGUR_GRID_ROOMY_CLASSNAME,
  KANGUR_STACK_ROOMY_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';

import { AdminKangurLessonsManagerPage } from './AdminKangurLessonsManagerPage';
import { AdminKangurTestSuitesManagerPage } from './AdminKangurTestSuitesManagerPage';
import { KangurAdminCard } from './components/KangurAdminCard';
import { KangurAdminContentShell } from './components/KangurAdminContentShell';
import { renderKangurAdminMetricCard } from './components/KangurAdminMetricCard';
import { KangurAdminStatusCard } from './components/KangurAdminStatusCard';
import { renderKangurAdminWorkspaceIntroCard } from './components/KangurAdminWorkspaceIntroCard';
import { summarizeKangurContentCreator } from './content-creator-insights';
import { withKangurClientErrorSync } from '@/features/kangur/observability/client';


type ContentTab = 'lessons' | 'tests';

const TAB_STORAGE_KEY = 'kangur_content_manager_tab_v1';

const readPersistedTab = (): ContentTab => {
  if (typeof window === 'undefined') return 'lessons';
  return withKangurClientErrorSync(
    {
      source: 'kangur.admin.content-manager',
      action: 'read-tab',
      description: 'Reads the persisted content manager tab from local storage.',
    },
    () => {
      const v = window.localStorage.getItem(TAB_STORAGE_KEY);
      return v === 'tests' ? 'tests' : 'lessons';
    },
    { fallback: 'lessons' }
  );
};

const TABS: Array<IdLabelOptionDto<ContentTab> & { Icon: LucideIcon }> = [
  { id: 'lessons', label: 'Lessons', Icon: BookOpen },
  { id: 'tests', label: 'Tests', Icon: Trophy },
];

const ACTIVE_WORKSPACE_COPY: Record<
  ContentTab,
  {
    title: string;
    description: string;
    badge: string;
  }
> = {
  lessons: {
    title: 'Lessons workspace',
    description:
      'Organize the lesson library, focus by authoring state, and open the active lesson editor without leaving the Kangur admin flow.',
    badge: 'Authoring surface',
  },
  tests: {
    title: 'Tests workspace',
    description:
      'Manage assessment content in the same admin rhythm as lessons, with one shared content shell instead of a separate tool surface.',
    badge: 'Assessment surface',
  },
};

export function AdminKangurContentManagerPage(): React.JSX.Element {
  const settingsStore = useSettingsStore();
  const lessonsQuery = useKangurLessons();
  const lessonDocumentsQuery = useKangurLessonDocuments();
  const rawTestSuites = settingsStore.get(KANGUR_TEST_SUITES_SETTING_KEY);
  const rawQuestions = settingsStore.get(KANGUR_TEST_QUESTIONS_SETTING_KEY);
  const lessons = React.useMemo(() => lessonsQuery.data ?? [], [lessonsQuery.data]);
  const lessonDocuments = React.useMemo(
    () => lessonDocumentsQuery.data ?? {},
    [lessonDocumentsQuery.data]
  );
  const testSuites = React.useMemo(() => parseKangurTestSuites(rawTestSuites), [rawTestSuites]);
  const questionStore = React.useMemo(
    () => parseKangurTestQuestionStore(rawQuestions),
    [rawQuestions]
  );
  const dashboardStats = React.useMemo(
    () =>
      summarizeKangurContentCreator({
        lessons,
        lessonDocuments,
        testSuiteCount: testSuites.length,
        questionStore,
      }),
    [lessonDocuments, lessons, questionStore, testSuites.length]
  );
  const [activeTab, setActiveTab] = useState<ContentTab>(() => readPersistedTab());
  const activeWorkspace = ACTIVE_WORKSPACE_COPY[activeTab];
  const activeTabLabel = TABS.find((tab) => tab.id === activeTab)?.label ?? 'Lessons';
  const needsAttention =
    dashboardStats.needsFixesCount > 0 ||
    dashboardStats.legacyLessonCount > 0 ||
    dashboardStats.missingNarrationCount > 0;

  const handleTabChange = (tab: ContentTab): void => {
    setActiveTab(tab);
    withKangurClientErrorSync(
      {
        source: 'kangur.admin.content-manager',
        action: 'persist-tab',
        description: 'Persists the content manager tab selection.',
        context: { tab },
      },
      () => {
        window.localStorage.setItem(TAB_STORAGE_KEY, tab);
      },
      { fallback: undefined }
    );
  };

  return (
    <KangurAdminContentShell
      title='Kangur Content Manager'
      description='Manage lessons and test suites for the Kangur learning app.'
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Kangur', href: '/admin/kangur' },
        { label: 'Content Manager' },
      ]}
      className='h-full'
      panelClassName='flex h-full min-h-0 flex-col'
      contentClassName='flex min-h-0 flex-1 flex-col'
    >
      <div
        className={cn(
          KANGUR_GRID_ROOMY_CLASSNAME,
          'min-h-0 flex-1 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]'
        )}
      >
        <div className={cn(KANGUR_STACK_ROOMY_CLASSNAME, 'min-h-0 flex-1 overflow-hidden')}>
          <div
            className={cn(
              KANGUR_GRID_ROOMY_CLASSNAME,
              'xl:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]'
            )}
          >
            {renderKangurAdminWorkspaceIntroCard({
              title: 'Content workspace',
              description:
                'Manage Kangur lessons and tests from one shared admin surface, with the same page structure, spacing, and support tools used across the rest of Kangur admin.',
              badge: 'Shared surface',
            })}

            <KangurAdminCard>
              <div className='flex flex-col gap-3'>
                <div>
                  <div className='text-sm font-semibold text-foreground'>Choose workspace</div>
                  <div className='mt-1 text-sm text-muted-foreground'>
                    Keep lessons and tests inside one consistent content-management flow.
                  </div>
                </div>
                <div className='flex flex-wrap items-center gap-1 rounded-xl border border-border/60 bg-background/60 p-1'>
                  {TABS.map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      type='button'
                      onClick={() => handleTabChange(id)}
                      aria-pressed={activeTab === id}
                      aria-label={label}
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 ring-offset-background',
                        activeTab === id
                          ? 'bg-primary/15 text-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-card hover:text-foreground'
                      )}
                    >
                      <Icon className='size-3.5' />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </KangurAdminCard>
          </div>

          <div className='space-y-3'>
            <div className='text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground'>
              Content overview
            </div>
            <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7'>
              {renderKangurAdminMetricCard({
                label: 'Lessons',
                value: dashboardStats.lessonCount,
                detail: 'Tracked in the Kangur lesson library',
                Icon: BookOpen,
                tone: 'info',
              })}
              {renderKangurAdminMetricCard({
                label: 'Custom content',
                value: dashboardStats.customContentCount,
                detail: 'Lessons already using the document editor',
                Icon: FileText,
                tone: 'success',
              })}
              {renderKangurAdminMetricCard({
                label: 'Needs import',
                value: dashboardStats.legacyLessonCount,
                detail: 'Lessons still relying on legacy component content',
                Icon: ScrollText,
                tone: 'warning',
              })}
              {renderKangurAdminMetricCard({
                label: 'Needs fixes',
                value: dashboardStats.needsFixesCount,
                detail: 'Document lessons with structural issues that need editorial cleanup',
                Icon: AlertTriangle,
                tone: 'warning',
              })}
              {renderKangurAdminMetricCard({
                label: 'Missing narration',
                value: dashboardStats.missingNarrationCount,
                detail: 'Document lessons without a usable narration script',
                Icon: Volume2,
                tone: 'warning',
              })}
              {renderKangurAdminMetricCard({
                label: 'Hidden lessons',
                value: dashboardStats.hiddenLessonCount,
                detail: 'Disabled lessons not visible to learners',
                Icon: EyeOff,
                tone: 'neutral',
              })}
              {renderKangurAdminMetricCard({
                label: 'Tests',
                value: dashboardStats.testSuiteCount,
                detail: `${dashboardStats.questionCount} questions across all test suites`,
                Icon: Trophy,
                tone: 'info',
              })}
            </div>
          </div>

          <Card
            variant='subtle'
            padding='md'
            className='flex min-h-0 flex-1 flex-col rounded-2xl border-border/60 bg-card/35 shadow-sm'
          >
            <div className='flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4'>
              <div className='min-w-0 flex-1'>
                <div className='flex flex-wrap items-center gap-2'>
                  <h2 className='text-base font-semibold text-foreground'>{activeWorkspace.title}</h2>
                  <Badge variant='outline'>{activeWorkspace.badge}</Badge>
                </div>
                <p className='mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground'>
                  {activeWorkspace.description}
                </p>
              </div>
            </div>

            <div className='mt-4 min-h-0 flex-1 overflow-hidden'>
              {activeTab === 'lessons' ? (
                <AdminKangurLessonsManagerPage standalone={false} />
              ) : (
                <AdminKangurTestSuitesManagerPage standalone={false} />
              )}
            </div>
          </Card>
        </div>

        <KangurAdminStatusCard
          title='Status'
          statusBadge={
            <Badge variant={needsAttention ? 'warning' : 'secondary'}>
              {needsAttention ? 'Needs attention' : 'Healthy'}
            </Badge>
          }
          items={[
            {
              label: 'Workspace',
              value: <Badge variant='outline'>{activeTabLabel}</Badge>,
            },
            {
              label: 'Lessons',
              value: <span className='text-foreground font-semibold'>{dashboardStats.lessonCount}</span>,
            },
            {
              label: 'Tests',
              value: (
                <span className='text-foreground font-semibold'>{dashboardStats.testSuiteCount}</span>
              ),
            },
            {
              label: 'Needs import',
              value: (
                <span className='text-foreground font-semibold'>{dashboardStats.legacyLessonCount}</span>
              ),
            },
            {
              label: 'Needs fixes',
              value: (
                <span className='text-foreground font-semibold'>{dashboardStats.needsFixesCount}</span>
              ),
            },
            {
              label: 'Missing narration',
              value: (
                <span className='text-foreground font-semibold'>
                  {dashboardStats.missingNarrationCount}
                </span>
              ),
            },
          ]}
        />
      </div>
    </KangurAdminContentShell>
  );
}
