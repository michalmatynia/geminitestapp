import { ChevronLeft, ChevronRight, Printer } from 'lucide-react';

import { KangurLessonNavigationIconButton } from '@/features/kangur/ui/components/KangurLessonNavigationIconButton';
import { KangurStatusChip } from '@/features/kangur/ui/design/primitives';
import {
  LESSONS_SELECTOR_NAV_BUTTON_ROW_CLASSNAME,
  LESSONS_SELECTOR_NAV_LAYOUT_CLASSNAME,
} from '@/features/kangur/ui/pages/lessons/Lessons.constants';

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
    <nav
      aria-label={ariaLabel}
      className={LESSONS_SELECTOR_NAV_LAYOUT_CLASSNAME}
      data-testid='kangur-exam-navigation'
    >
      <div
        className={LESSONS_SELECTOR_NAV_BUTTON_ROW_CLASSNAME}
        role='group'
        aria-label={ariaLabel}
      >
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
      </div>
      <div className='flex w-full justify-center' aria-live='polite' aria-atomic='true'>
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
    </nav>
  );
}
