'use client';

import React, { useMemo } from 'react';
import { useKangurQuestionsManagerRuntimeContext } from './context/KangurQuestionsManagerRuntimeContext';
import { useKangurQuestionsManagerController } from './questions-manager/useKangurQuestionsManagerController';
import { QuestionsManagerHeader } from './questions-manager/QuestionsManagerHeader';
import { QuestionsManagerFilters } from './questions-manager/QuestionsManagerFilters';
import { QuestionsListView } from './questions-manager/QuestionsListView';
import { QuestionsManagerModals } from './questions-manager/QuestionsManagerModals';
import { getQuestionManagerCopy } from './question-manager.copy';
import { useLocale } from 'next-intl';
import { getKangurTestSuiteHealth } from './test-suite-health';

export function KangurQuestionsManagerPanel(): React.JSX.Element {
  const { suite, onClose } = useKangurQuestionsManagerRuntimeContext();
  const locale = useLocale();
  const copy = useMemo(() => getQuestionManagerCopy(locale as any), [locale]);
  const questions = useMemo(() => [], []);
  const controller = useKangurQuestionsManagerController(suite, [], {}, questions, []);
  const health = useMemo(() => getKangurTestSuiteHealth(suite, questions), [questions, suite]);

  return (
    <div className='flex h-full flex-col gap-4 overflow-hidden'>
      <QuestionsManagerHeader copy={copy} currentSuite={suite} questions={questions} health={health} canPublishAndGoLive={false} canPublishReady={false} isSaving={controller.mutations.isSaving} mutations={controller.mutations} onClose={onClose} />
      <QuestionsManagerFilters copy={copy} {...controller} />
      <QuestionsListView {...controller} copy={copy} questions={questions} />
      <QuestionsManagerModals controller={controller} copy={copy} />
    </div>
  );
}
