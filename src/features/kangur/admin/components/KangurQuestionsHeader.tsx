import { Plus } from 'lucide-react';
import React from 'react';

import type { KangurTestSuite } from '@/features/kangur/shared/contracts/kangur-tests';
import { Badge, Button } from '@/features/kangur/shared/ui';
import { KANGUR_STACK_RELAXED_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import type { KangurTestSuiteHealth } from '../test-suite-health';
import type { QuestionManagerCopy } from '../question-manager.copy';

interface KangurQuestionsHeaderProps {
  copy: QuestionManagerCopy['header'];
  currentSuite: KangurTestSuite;
  questionCount: number;
  formatQuestionCount: (count: number) => string;
  readyCount: number;
  richQuestionCount: number;
  needsReviewCount: number;
  needsFixCount: number;
  illustratedCount: number;
  reviewQueueCount: number;
  draftCount: number;
  readyToPublishCount: number;
  publishedCount: number;
  currentSuiteHealth: KangurTestSuiteHealth;
  canPublishAndGoLive: boolean;
  canPublishReady: boolean;
  isSaving: boolean;
  onPublishAndGoLive: () => void;
  onPublishReady: () => void;
  onGoLive: () => void;
  onTakeOffline: () => void;
  onAddQuestion: () => void;
  onBack: () => void;
}

export function KangurQuestionsHeader(
  props: KangurQuestionsHeaderProps
): React.JSX.Element {
  const {
    copy,
    currentSuite,
    questionCount,
    formatQuestionCount,
    readyCount,
    richQuestionCount,
    needsReviewCount,
    needsFixCount,
    illustratedCount,
    reviewQueueCount,
    draftCount,
    readyToPublishCount,
    publishedCount,
    currentSuiteHealth,
    canPublishAndGoLive,
    canPublishReady,
    isSaving,
    onPublishAndGoLive,
    onPublishReady,
    onGoLive,
    onTakeOffline,
    onAddQuestion,
    onBack,
  } = props;
  return (
    <div className='overflow-hidden rounded-[28px] border border-border/60 bg-[linear-gradient(135deg,rgba(9,16,32,0.96),rgba(10,30,55,0.88))] p-5 sm:p-6 shadow-[0_24px_80px_-44px_rgba(14,165,233,0.42)]'>
      <div className={`${KANGUR_STACK_RELAXED_CLASSNAME} xl:flex-row xl:items-start xl:justify-between`}>
        <div className='max-w-3xl space-y-2'>
          <div className='text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200/78'>
            {copy.eyebrow}
          </div>
          <div className='text-xl font-semibold text-white'>{currentSuite.title}</div>
          <div className='text-sm leading-6 text-slate-300/82'>
            {formatQuestionCount(questionCount)}
            {currentSuite.year ? ` · ${currentSuite.year}` : ''}
            {currentSuite.gradeLevel ? ` · ${currentSuite.gradeLevel}` : ''}
          </div>
          <div className='flex flex-wrap gap-2'>
            <Badge
              variant='outline'
              className='h-5 px-2 text-[10px] text-emerald-300 border-emerald-400/40'
            >
              {copy.ready} {readyCount}
            </Badge>
            <Badge variant='outline' className='h-5 px-2 text-[10px]'>
              {copy.richUi} {richQuestionCount}
            </Badge>
            <Badge
              variant='outline'
              className='h-5 px-2 text-[10px] text-amber-300 border-amber-400/40'
            >
              {copy.needsReview} {needsReviewCount}
            </Badge>
            <Badge
              variant='outline'
              className='h-5 px-2 text-[10px] text-rose-300 border-rose-400/40'
            >
              {copy.needsFix} {needsFixCount}
            </Badge>
            <Badge
              variant='outline'
              className='h-5 px-2 text-[10px] text-violet-300 border-violet-400/40'
            >
              {copy.illustrated} {illustratedCount}
            </Badge>
            <Badge
              variant='outline'
              className='h-5 px-2 text-[10px] text-cyan-300 border-cyan-400/40'
            >
              {copy.reviewQueue} {reviewQueueCount}
            </Badge>
            <Badge
              variant='outline'
              className='h-5 px-2 text-[10px] text-slate-300 border-slate-400/40'
            >
              {copy.draft} {draftCount}
            </Badge>
            <Badge
              variant='outline'
              className='h-5 px-2 text-[10px] text-sky-300 border-sky-400/40'
            >
              {copy.readyToPublish} {readyToPublishCount}
            </Badge>
            <Badge
              variant='outline'
              className='h-5 px-2 text-[10px] text-emerald-300 border-emerald-400/40'
            >
              {copy.published} {publishedCount}
            </Badge>
            {currentSuiteHealth.publishStatus === 'partial' ? (
              <Badge
                variant='outline'
                className='h-5 px-2 text-[10px] text-cyan-300 border-cyan-400/40'
              >
                {copy.published} {currentSuiteHealth.publishedQuestionCount}/
                {currentSuiteHealth.questionCount}
              </Badge>
            ) : null}
            {currentSuiteHealth.publishStatus === 'unpublished' &&
            currentSuiteHealth.questionCount > 0 ? (
              <Badge
                variant='outline'
                className='h-5 px-2 text-[10px] text-slate-300 border-slate-400/40'
              >
                {copy.notPublished}
              </Badge>
            ) : null}
            {currentSuiteHealth.canGoLive ? (
              <Badge
                variant='outline'
                className='h-5 px-2 text-[10px] text-emerald-300 border-emerald-400/40'
              >
                {copy.readyForLive}
              </Badge>
            ) : null}
            {canPublishAndGoLive ? (
              <Badge
                variant='outline'
                className='h-5 px-2 text-[10px] text-cyan-300 border-cyan-400/40'
              >
                {copy.goLiveAfterPublish}
              </Badge>
            ) : null}
            {currentSuiteHealth.isLive ? (
              <Badge
                variant='outline'
                className='h-5 px-2 text-[10px] border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
              >
                {copy.live}
              </Badge>
            ) : null}
            {currentSuiteHealth.liveNeedsAttention ? (
              <Badge
                variant='outline'
                className='h-5 px-2 text-[10px] border-rose-400/40 bg-rose-500/10 text-rose-200'
              >
                {copy.liveNeedsAttention}
              </Badge>
            ) : null}
          </div>
        </div>
        <div className='flex w-full flex-wrap items-center gap-2.5 xl:w-auto xl:justify-end'>
          {canPublishAndGoLive ? (
            <Button
              type='button'
              size='sm'
              className='h-8 w-full rounded-full px-3 text-[11px] font-semibold sm:w-auto'
              onClick={onPublishAndGoLive}
              disabled={isSaving}
            >
              {copy.publishAndGoLive}
            </Button>
          ) : null}
          <Button
            type='button'
            size='sm'
            variant='outline'
            className='h-8 w-full rounded-full px-3 text-[11px] font-semibold sm:w-auto'
            onClick={onPublishReady}
            disabled={isSaving || !canPublishReady}
          >
            {copy.publishReadyQuestions}
          </Button>
          <Button
            type='button'
            size='sm'
            variant='outline'
            className='h-8 w-full rounded-full px-3 text-[11px] font-semibold sm:w-auto'
            onClick={onGoLive}
            disabled={isSaving || !currentSuiteHealth.canGoLive}
          >
            {copy.goLiveForLearners}
          </Button>
          <Button
            type='button'
            size='sm'
            variant='outline'
            className='h-8 w-full rounded-full px-3 text-[11px] font-semibold sm:w-auto'
            onClick={onTakeOffline}
            disabled={isSaving || !currentSuiteHealth.isLive}
          >
            {copy.takeSuiteOffline}
          </Button>
          <Button
            type='button'
            size='sm'
            variant='outline'
            className='h-8 w-full rounded-full px-3 text-[11px] font-semibold sm:w-auto'
            onClick={onAddQuestion}
            disabled={isSaving}
          >
            <Plus className='mr-1 size-3.5' />
            {copy.addQuestion}
          </Button>
          <Button
            type='button'
            size='sm'
            variant='outline'
            className='h-8 w-full rounded-full px-3 text-[11px] font-semibold text-gray-300 sm:w-auto'
            onClick={onBack}
          >
            ← {copy.backToSuites}
          </Button>
        </div>
      </div>
    </div>
  );
}
