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

export function KangurQuestionsManagerPanel(): React.JSX.Element {
  const { suite, onClose } = useKangurQuestionsManagerRuntimeContext();
  const locale = useLocale();
  const copy = useMemo(() => getQuestionManagerCopy(locale as any), [locale]);
  
  const controller = useKangurQuestionsManagerController(suite, [], {}, [], []);

  return (
    <div className='flex h-full flex-col gap-4 overflow-hidden'>
      <QuestionsManagerHeader copy={copy} currentSuite={suite} questions={[]} health={{}} canPublishAndGoLive={false} canPublishReady={false} isSaving={controller.state.isSaving} mutations={controller.mutations} />
      <QuestionsManagerFilters copy={copy} {...controller} />
      <QuestionsListView {...controller} questions={[]} />
      <QuestionsManagerModals controller={controller} copy={copy} />
    </div>
  );
}
