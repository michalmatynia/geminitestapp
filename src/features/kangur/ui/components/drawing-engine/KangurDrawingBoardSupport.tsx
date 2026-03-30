import { cn } from '@/features/kangur/shared/utils';
import type { KangurMiniGameInformationalFeedback } from '@/features/kangur/ui/types';

type KangurDrawingInputHelpTextProps = {
  children: string;
  id: string;
  isCoarsePointer: boolean;
  testId?: string;
};

export function KangurDrawingInputHelpText({
  children,
  id,
  isCoarsePointer,
  testId,
}: KangurDrawingInputHelpTextProps): React.JSX.Element {
  return (
    <p
      className={cn(
        'text-xs text-center [color:var(--kangur-page-muted-text)]',
        isCoarsePointer ? 'block' : 'hidden sm:block'
      )}
      data-testid={testId}
      id={id}
    >
      {children}
    </p>
  );
}

type KangurDrawingFeedbackMessageProps = {
  feedback: KangurMiniGameInformationalFeedback;
  testId?: string;
};

export function KangurDrawingFeedbackMessage({
  feedback,
  testId,
}: KangurDrawingFeedbackMessageProps): React.JSX.Element {
  return (
    <p
      aria-atomic='true'
      aria-live='polite'
      className={cn(
        'text-sm font-semibold text-center',
        feedback.kind === 'success'
          ? 'text-emerald-600'
          : feedback.kind === 'error'
            ? 'text-rose-600'
            : 'text-amber-600'
      )}
      data-testid={testId}
      role='status'
    >
      {feedback.text}
    </p>
  );
}
