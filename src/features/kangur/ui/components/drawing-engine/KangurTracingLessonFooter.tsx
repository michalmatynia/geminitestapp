'use client';

import { KangurCheckButton } from '@/features/kangur/ui/components/KangurCheckButton';
import {
  KangurButton,
  KangurGlassPanel,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_WRAP_ROW_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import type { KangurMiniGameFeedbackState } from '@/features/kangur/ui/types';

type KangurTracingLessonFooterProps = {
  checkLabel: string;
  clearLabel: string;
  feedback: KangurMiniGameFeedbackState;
  idlePrompt: string;
  isCoarsePointer: boolean;
  isLastRound: boolean;
  nextLabel: string;
  onCheck: () => void;
  onClear: () => void;
  onNext: () => void;
  restartLabel: string;
};

export function KangurTracingLessonFooter({
  checkLabel,
  clearLabel,
  feedback,
  idlePrompt,
  isCoarsePointer,
  isLastRound,
  nextLabel,
  onCheck,
  onClear,
  onNext,
  restartLabel,
}: KangurTracingLessonFooterProps): React.JSX.Element {
  const buttonClassName = isCoarsePointer ? 'min-h-11 px-4' : undefined;

  return (
    <KangurGlassPanel className='w-full max-w-3xl' padding='lg' surface='playField'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='min-w-0'>
          {feedback ? (
            <p
              className={`text-sm font-semibold ${
                feedback.kind === 'success' ? 'text-emerald-600' : 'text-rose-600'
              }`}
              role='status'
              aria-live='polite'
            >
              {feedback.text}
            </p>
          ) : (
            <p className='text-sm text-slate-600'>{idlePrompt}</p>
          )}
        </div>
        <div className={KANGUR_WRAP_ROW_CLASSNAME}>
          <KangurButton
            className={buttonClassName}
            size='sm'
            type='button'
            variant='surface'
            onClick={onClear}
          >
            {clearLabel}
          </KangurButton>
          {feedback?.kind === 'success' ? (
            <KangurButton
              className={buttonClassName}
              size='sm'
              type='button'
              variant='primary'
              onClick={onNext}
            >
              {isLastRound ? restartLabel : nextLabel}
            </KangurButton>
          ) : (
            <KangurCheckButton
              className={buttonClassName}
              size='sm'
              type='button'
              variant='primary'
              onClick={onCheck}
              feedbackTone={feedback?.kind === 'error' ? 'error' : null}
            >
              {checkLabel}
            </KangurCheckButton>
          )}
        </div>
      </div>
    </KangurGlassPanel>
  );
}
