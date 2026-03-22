import { ChevronLeft, ChevronRight } from 'lucide-react';
import { KangurButton, KangurStatusChip } from '@/features/kangur/ui/design/primitives';

export type ExamNavigationProps = {
  prevDisabled: boolean;
  nextDisabled: boolean;
  prevLabel: string;
  nextLabel: string;
  onPrev: () => void;
  onNext: () => void;
  ariaLabel?: string;
  progressLabel?: string;
  progressAriaLabel?: string;
  progressTestId?: string;
};

export function ExamNavigation({
  prevDisabled,
  nextDisabled,
  prevLabel,
  nextLabel,
  onPrev,
  onNext,
  ariaLabel = 'Nawigacja w teście Kangur',
  progressLabel,
  progressAriaLabel,
  progressTestId,
}: ExamNavigationProps): React.JSX.Element {
  const buttonClassName =
    'justify-center px-4 shadow-sm [border-color:var(--kangur-soft-card-border)] disabled:opacity-35 touch-manipulation select-none min-h-11 min-w-[3rem] active:scale-[0.98]';

  return (
    <div className='grid w-full gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center'>
      <div className='hidden sm:block' />
      <nav className='flex items-center justify-center gap-2' aria-label={ariaLabel}>
        <KangurButton
          onClick={prevDisabled ? undefined : onPrev}
          disabled={prevDisabled}
          className={buttonClassName}
          size='sm'
          type='button'
          variant='surface'
          aria-label={prevLabel}
          title={prevLabel}
        >
          <ChevronLeft className='h-4 w-4 flex-shrink-0' aria-hidden='true' />
          <span className='sr-only'>{prevLabel}</span>
        </KangurButton>
        <KangurButton
          onClick={nextDisabled ? undefined : onNext}
          disabled={nextDisabled}
          className={buttonClassName}
          size='sm'
          type='button'
          variant='surface'
          aria-label={nextLabel}
          title={nextLabel}
        >
          <span className='sr-only'>{nextLabel}</span>
          <ChevronRight className='h-4 w-4 flex-shrink-0' aria-hidden='true' />
        </KangurButton>
      </nav>
      <div className='flex justify-center sm:justify-end' aria-live='polite' aria-atomic='true'>
        {progressLabel ? (
          <KangurStatusChip
            accent='amber'
            data-testid={progressTestId}
            aria-label={progressAriaLabel ?? progressLabel}
            size='sm'
          >
            {progressLabel}
          </KangurStatusChip>
        ) : null}
      </div>
    </div>
  );
}
