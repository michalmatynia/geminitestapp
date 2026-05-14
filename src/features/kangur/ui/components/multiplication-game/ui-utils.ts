import { type useTranslations } from 'next-intl';
import { cn } from '@/features/kangur/shared/utils';
import { KANGUR_ACCENT_STYLES } from '@/features/kangur/ui/design/tokens';

export const resolveMultiplicationArraySummaryMessage = ({
  percent,
  translations,
}: {
  percent: number;
  translations: ReturnType<typeof useTranslations>;
}): string => {
  if (percent === 100) {
    return translations('multiplicationArray.summary.perfect');
  }

  if (percent >= 67) {
    return translations('multiplicationArray.summary.good');
  }

  return translations('multiplicationArray.summary.retry');
};

export const resolveMultiplicationArrayButtonClassName = ({
  celebrating,
  isCoarsePointer,
  isCollected,
}: {
  celebrating: boolean;
  isCoarsePointer: boolean;
  isCollected: boolean;
}): string =>
  cn(
    'flex items-center kangur-panel-gap px-4 py-3 duration-300 touch-manipulation select-none',
    isCoarsePointer && 'min-h-[4.5rem] active:scale-[0.98]',
    isCollected ? KANGUR_ACCENT_STYLES.violet.activeText : '[color:var(--kangur-page-text)]',
    !isCollected && !celebrating ? 'cursor-pointer' : 'cursor-default'
  );

export const resolveMultiplicationArrayIndexClassName = (isCollected: boolean): string =>
  cn(
    'w-5 text-center text-xs font-bold',
    isCollected ? KANGUR_ACCENT_STYLES.violet.mutedText : '[color:var(--kangur-page-muted-text)]'
  );

export const resolveMultiplicationArrayDotClassName = ({
  color,
  glow,
  isCollected,
}: {
  color: string;
  glow: string;
  isCollected: boolean;
}): string => `w-6 h-6 rounded-full shadow-sm ${isCollected ? `${glow} shadow-md` : color} opacity-80`;
