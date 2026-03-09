'use client';

import React, { useState } from 'react';
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

import {
  KANGUR_LESSON_DOCUMENTS_SETTING_KEY,
  parseKangurLessonDocumentStore,
} from '@/features/kangur/lesson-documents';
import { KANGUR_LESSONS_SETTING_KEY, parseKangurLessons } from '@/features/kangur/settings';
import {
  KANGUR_TEST_QUESTIONS_SETTING_KEY,
  parseKangurTestQuestionStore,
} from '@/features/kangur/test-questions';
import { KANGUR_TEST_SUITES_SETTING_KEY, parseKangurTestSuites } from '@/features/kangur/test-suites';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { cn } from '@/shared/utils';

import { AdminKangurLessonsManagerPage } from './AdminKangurLessonsManagerPage';
import { AdminKangurTestSuitesManagerPage } from './AdminKangurTestSuitesManagerPage';
import { summarizeKangurContentCreator } from './content-creator-insights';
import { KangurAdminContentShell } from './components/KangurAdminContentShell';

type ContentTab = 'lessons' | 'tests';

const TAB_STORAGE_KEY = 'kangur_content_manager_tab_v1';

const readPersistedTab = (): ContentTab => {
  if (typeof window === 'undefined') return 'lessons';
  try {
    const v = window.localStorage.getItem(TAB_STORAGE_KEY);
    return v === 'tests' ? 'tests' : 'lessons';
  } catch {
    return 'lessons';
  }
};

const TABS: Array<{ id: ContentTab; label: string; Icon: LucideIcon }> = [
  { id: 'lessons', label: 'Lessons', Icon: BookOpen },
  { id: 'tests', label: 'Tests', Icon: Trophy },
];

export function AdminKangurContentManagerPage(): React.JSX.Element {
  const settingsStore = useSettingsStore();
  const rawLessons = settingsStore.get(KANGUR_LESSONS_SETTING_KEY);
  const rawLessonDocuments = settingsStore.get(KANGUR_LESSON_DOCUMENTS_SETTING_KEY);
  const rawTestSuites = settingsStore.get(KANGUR_TEST_SUITES_SETTING_KEY);
  const rawQuestions = settingsStore.get(KANGUR_TEST_QUESTIONS_SETTING_KEY);
  const lessons = React.useMemo(() => parseKangurLessons(rawLessons), [rawLessons]);
  const lessonDocuments = React.useMemo(
    () => parseKangurLessonDocumentStore(rawLessonDocuments),
    [rawLessonDocuments]
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

  const handleTabChange = (tab: ContentTab): void => {
    setActiveTab(tab);
    try {
      window.localStorage.setItem(TAB_STORAGE_KEY, tab);
    } catch {
      // ignore
    }
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
      <div className='flex min-h-0 flex-1 flex-col gap-4 overflow-hidden'>
        <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7'>
          <ContentSummaryCard
            label='Lessons'
            value={dashboardStats.lessonCount}
            detail='Tracked in the Kangur lesson library'
            Icon={BookOpen}
          />
          <ContentSummaryCard
            label='Custom content'
            value={dashboardStats.customContentCount}
            detail='Lessons already using the document editor'
            Icon={FileText}
          />
          <ContentSummaryCard
            label='Needs import'
            value={dashboardStats.legacyLessonCount}
            detail='Lessons still relying on legacy component content'
            Icon={ScrollText}
          />
          <ContentSummaryCard
            label='Needs fixes'
            value={dashboardStats.needsFixesCount}
            detail='Document lessons with structural issues that need editorial cleanup'
            Icon={AlertTriangle}
          />
          <ContentSummaryCard
            label='Missing narration'
            value={dashboardStats.missingNarrationCount}
            detail='Document lessons without a usable narration script'
            Icon={Volume2}
          />
          <ContentSummaryCard
            label='Hidden lessons'
            value={dashboardStats.hiddenLessonCount}
            detail='Disabled lessons not visible to learners'
            Icon={EyeOff}
          />
          <ContentSummaryCard
            label='Tests'
            value={dashboardStats.testSuiteCount}
            detail={`${dashboardStats.questionCount} questions across all test suites`}
            Icon={Trophy}
          />
        </div>

        <div className='flex shrink-0 items-center gap-1 self-start rounded-xl border border-border/50 bg-card/30 p-1'>
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type='button'
              onClick={() => handleTabChange(id)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors',
                activeTab === id
                  ? 'bg-sky-500/20 text-sky-100 shadow-sm'
                  : 'text-gray-400 hover:bg-muted/40 hover:text-gray-200'
              )}
            >
              <Icon className='size-3.5' />
              {label}
            </button>
          ))}
        </div>

        <div className='min-h-0 flex-1 overflow-hidden'>
          {activeTab === 'lessons' ? (
            <AdminKangurLessonsManagerPage standalone={false} />
          ) : (
            <AdminKangurTestSuitesManagerPage standalone={false} />
          )}
        </div>
      </div>
    </KangurAdminContentShell>
  );
}

function ContentSummaryCard({
  label,
  value,
  detail,
  Icon,
}: {
  label: string;
  value: number;
  detail: string;
  Icon: LucideIcon;
}): React.JSX.Element {
  return (
    <div className='rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-950/90 px-4 py-3 shadow-[0_18px_60px_-32px_rgba(14,165,233,0.45)]'>
      <div className='flex items-start justify-between gap-3'>
        <div>
          <div className='text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400'>
            {label}
          </div>
          <div className='mt-2 text-2xl font-semibold text-white'>{value}</div>
        </div>
        <div className='rounded-xl border border-sky-400/20 bg-sky-500/10 p-2 text-sky-200'>
          <Icon className='size-4' />
        </div>
      </div>
      <div className='mt-3 text-xs leading-relaxed text-slate-400'>{detail}</div>
    </div>
  );
}
