'use client';

import React, { useState } from 'react';
import { BookOpen, Trophy } from 'lucide-react';
import type { KangurLesson } from '@/features/kangur/shared/contracts/kangur';
import { Button } from '@/shared/ui/primitives.public';
import { KangurAdminContentShell } from './components/KangurAdminContentShell';
import { useSettingsStore } from '@/features/kangur/shared/providers/SettingsStoreProvider';
import { useKangurLessons, useKangurLessonDocuments } from '@/features/kangur/hooks';
import { KANGUR_TEST_SUITES_SETTING_KEY, parseKangurTestSuites } from '@/features/kangur/test-suites';
import {
  KANGUR_TEST_QUESTIONS_SETTING_KEY,
  parseKangurTestQuestionStore,
} from '@/features/kangur/test-suites/questions';
import { withKangurClientErrorSync } from '@/features/kangur/observability/client';
import { summarizeKangurContentCreator } from './content-creator-insights';
import { ContentManagerHeader } from './components/ContentManagerHeader';
import { ContentManagerStats } from './components/ContentManagerStats';

type ContentTab = 'lessons' | 'tests';
const TAB_STORAGE_KEY = 'kangur-cm-tab';

const TABS = [
  { id: 'lessons' as ContentTab, label: 'Lessons', Icon: BookOpen },
  { id: 'tests' as ContentTab, label: 'Tests', Icon: Trophy },
];

export function AdminKangurContentManagerPage(): React.JSX.Element {
  const settingsStore = useSettingsStore();
  const lessonsQuery = useKangurLessons();
  const lessonDocumentsQuery = useKangurLessonDocuments();
  
  const rawTestSuites = settingsStore.get(KANGUR_TEST_SUITES_SETTING_KEY) as unknown;
  const rawQuestions = settingsStore.get(KANGUR_TEST_QUESTIONS_SETTING_KEY) as unknown;
  
  const lessons: KangurLesson[] = React.useMemo(() => (lessonsQuery.data ?? []), [lessonsQuery.data]);
  const lessonDocuments = React.useMemo(() => (lessonDocumentsQuery.data ?? {}) as Record<string, any>, [lessonDocumentsQuery.data]);
  const testSuites = React.useMemo(() => parseKangurTestSuites(rawTestSuites), [rawTestSuites]);
  const questionStore = React.useMemo(() => parseKangurTestQuestionStore(rawQuestions), [rawQuestions]);
  
  const dashboardStats = React.useMemo(() => summarizeKangurContentCreator({
    lessons,
    lessonDocuments,
    testSuiteCount: testSuites.length,
    questionStore,
  }), [lessonDocuments, lessons, questionStore, testSuites.length]);

  const [activeTab, setActiveTab] = useState<ContentTab>(() => {
    if (typeof window !== 'undefined') {
      const v = window.localStorage.getItem(TAB_STORAGE_KEY);
      return v === 'tests' ? 'tests' : 'lessons';
    }
    return 'lessons';
  });

  const activeTabLabel = TABS.find((tab) => tab.id === activeTab)?.label ?? 'Lessons';
  const needsAttention = dashboardStats.needsFixesCount > 0 || dashboardStats.legacyLessonCount > 0 || dashboardStats.missingNarrationCount > 0;

  const handleTabChange = (tab: ContentTab): void => {
    setActiveTab(tab);
    withKangurClientErrorSync(
      { source: 'kangur.admin.content-manager', action: 'persist-tab', description: 'Persist tab', context: { tab } },
      () => { window.localStorage.setItem(TAB_STORAGE_KEY, tab); },
      { fallback: undefined }
    );
  };

  return (
    <KangurAdminContentShell
      title='Kangur Content Manager'
      description='Manage lessons and test suites.'
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Kangur', href: '/admin/kangur' },
        { label: 'Content Manager' },
      ]}
      className='h-full'
    >
      <ContentManagerHeader activeTabLabel={activeTabLabel} needsAttention={needsAttention} />
      <ContentManagerStats stats={dashboardStats} />
      
      <div className='flex items-center gap-2 mb-4'>
        {TABS.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'ghost'}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>
    </KangurAdminContentShell>
  );
}

export default AdminKangurContentManagerPage;
