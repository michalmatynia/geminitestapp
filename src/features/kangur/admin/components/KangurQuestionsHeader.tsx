import { Plus } from 'lucide-react';
import React from 'react';

import type { KangurTestSuite } from '@/features/kangur/shared/contracts/kangur-tests';
import { Badge, Button } from '@/features/kangur/shared/ui';
import { KANGUR_STACK_RELAXED_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import type { KangurTestSuiteHealth } from '../test-suite-health';

interface KangurQuestionsHeaderProps {
  currentSuite: KangurTestSuite;
  questionCount: number;
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
    currentSuite,
    questionCount,
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
            Suite question workspace
          </div>
          <div className='text-xl font-semibold text-white'>{currentSuite.title}</div>
          <div className='text-sm leading-6 text-slate-300/82'>
            {questionCount} {questionCount === 1 ? 'question' : 'questions'}
            {currentSuite.year ? ` · ${currentSuite.year}` : ''}
            {currentSuite.gradeLevel ? ` · ${currentSuite.gradeLevel}` : ''}
          </div>
          <div className='flex flex-wrap gap-2'>
            <Badge
              variant='outline'
              className='h-5 px-2 text-[10px] text-emerald-300 border-emerald-400/40'
            >
              Ready {readyCount}
            </Badge>
            <Badge variant='outline' className='h-5 px-2 text-[10px]'>
              Rich UI {richQuestionCount}
            </Badge>
            <Badge
              variant='outline'
              className='h-5 px-2 text-[10px] text-amber-300 border-amber-400/40'
            >
              Needs review {needsReviewCount}
            </Badge>
            <Badge
              variant='outline'
              className='h-5 px-2 text-[10px] text-rose-300 border-rose-400/40'
            >
              Needs fix {needsFixCount}
            </Badge>
            <Badge
              variant='outline'
              className='h-5 px-2 text-[10px] text-violet-300 border-violet-400/40'
            >
              SVG {illustratedCount}
            </Badge>
            <Badge
              variant='outline'
              className='h-5 px-2 text-[10px] text-cyan-300 border-cyan-400/40'
            >
              Review queue {reviewQueueCount}
            </Badge>
            <Badge
              variant='outline'
              className='h-5 px-2 text-[10px] text-slate-300 border-slate-400/40'
            >
              Draft {draftCount}
            </Badge>
            <Badge
              variant='outline'
              className='h-5 px-2 text-[10px] text-sky-300 border-sky-400/40'
            >
              Ready to publish {readyToPublishCount}
            </Badge>
            <Badge
              variant='outline'
              className='h-5 px-2 text-[10px] text-emerald-300 border-emerald-400/40'
            >
              Published {publishedCount}
            </Badge>
            {currentSuiteHealth.publishStatus === 'partial' ? (
              <Badge
                variant='outline'
                className='h-5 px-2 text-[10px] text-cyan-300 border-cyan-400/40'
              >
                Published {currentSuiteHealth.publishedQuestionCount}/
                {currentSuiteHealth.questionCount}
              </Badge>
            ) : null}
            {currentSuiteHealth.publishStatus === 'unpublished' &&
            currentSuiteHealth.questionCount > 0 ? (
              <Badge
                variant='outline'
                className='h-5 px-2 text-[10px] text-slate-300 border-slate-400/40'
              >
                Not published
              </Badge>
            ) : null}
            {currentSuiteHealth.canGoLive ? (
              <Badge
                variant='outline'
                className='h-5 px-2 text-[10px] text-emerald-300 border-emerald-400/40'
              >
                Ready for live
              </Badge>
            ) : null}
            {canPublishAndGoLive ? (
              <Badge
                variant='outline'
                className='h-5 px-2 text-[10px] text-cyan-300 border-cyan-400/40'
              >
                Go live after publish
              </Badge>
            ) : null}
            {currentSuiteHealth.isLive ? (
              <Badge
                variant='outline'
                className='h-5 px-2 text-[10px] border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
              >
                Live
              </Badge>
            ) : null}
            {currentSuiteHealth.liveNeedsAttention ? (
              <Badge
                variant='outline'
                className='h-5 px-2 text-[10px] border-rose-400/40 bg-rose-500/10 text-rose-200'
              >
                Live needs attention
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
              Publish and go live
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
            Publish ready questions
          </Button>
          <Button
            type='button'
            size='sm'
            variant='outline'
            className='h-8 w-full rounded-full px-3 text-[11px] font-semibold sm:w-auto'
            onClick={onGoLive}
            disabled={isSaving || !currentSuiteHealth.canGoLive}
          >
            Go live for learners
          </Button>
          <Button
            type='button'
            size='sm'
            variant='outline'
            className='h-8 w-full rounded-full px-3 text-[11px] font-semibold sm:w-auto'
            onClick={onTakeOffline}
            disabled={isSaving || !currentSuiteHealth.isLive}
          >
            Take suite offline
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
            Add question
          </Button>
          <Button
            type='button'
            size='sm'
            variant='outline'
            className='h-8 w-full rounded-full px-3 text-[11px] font-semibold text-gray-300 sm:w-auto'
            onClick={onBack}
          >
            ← Back to suites
          </Button>
        </div>
      </div>
    </div>
  );
}
