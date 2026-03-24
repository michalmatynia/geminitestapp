import { ChevronLeft, ChevronRight, Printer } from 'lucide-react';

import { KangurLessonNavigationIconButton } from '@/features/kangur/ui/components/KangurLessonNavigationIconButton';
import { KangurStatusChip } from '@/features/kangur/ui/design/primitives';

export type ExamNavigationProps = {
  prevDisabled: boolean;
  nextDisabled: boolean;
  prevLabel: string;
  nextLabel: string;
  onPrev: () => void;
  onNext: () => void;
  ariaLabel?: string;
  printLabel?: string;
  progressLabel?: string;
  progressAriaLabel?: string;
  progressTestId?: string;
  onPrintPanel?: () => void;
};

export function ExamNavigation({
  prevDisabled,
  nextDisabled,
  prevLabel,
  nextLabel,
  onPrev,
  onNext,
  ariaLabel = 'Nawigacja w teście Kangur',
  printLabel = 'Drukuj panel',
  progressLabel,
  progressAriaLabel,
  progressTestId,
  onPrintPanel,
}: ExamNavigationProps): React.JSX.Element {
  const buttonClassName =
    'justify-center px-4 shadow-sm [border-color:var(--kangur-soft-card-border)] disabled:opacity-35 touch-manipulation select-none min-h-11 min-w-[3rem] active:scale-[0.98]';

  return (
    <div className='grid w-full gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center'>
      <div className='hidden sm:block' />
      <nav className='flex items-center justify-center gap-2' aria-label={ariaLabel}>
        <KangurLessonNavigationIconButton
          onClick={prevDisabled ? undefined : onPrev}
          disabled={prevDisabled}
          className={buttonClassName}
          aria-label={prevLabel}
          icon={ChevronLeft}
          title={prevLabel}
        />
        <KangurLessonNavigationIconButton
          onClick={nextDisabled ? undefined : onNext}
          disabled={nextDisabled}
          className={buttonClassName}
          aria-label={nextLabel}
          icon={ChevronRight}
          title={nextLabel}
        />
        {onPrintPanel ? (
          <KangurLessonNavigationIconButton
            onClick={onPrintPanel}
            className={buttonClassName}
            data-testid='kangur-exam-print-button'
            aria-label={printLabel}
            icon={Printer}
            title={printLabel}
          />
        ) : null}
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
