import { cn } from '@/features/kangur/shared/utils';

export type KangurCheckButtonTone = 'success' | 'error' | null | undefined;

const FEEDBACK_TONE_CLASSNAME: Record<Exclude<KangurCheckButtonTone, null | undefined>, string> = {
  success:
    'border-emerald-500 bg-emerald-500 text-white hover:border-emerald-500 hover:bg-emerald-500 hover:text-white focus-visible:ring-emerald-300/70 disabled:opacity-100',
  error:
    'border-rose-500 bg-rose-500 text-white hover:border-rose-500 hover:bg-rose-500 hover:text-white focus-visible:ring-rose-300/70 disabled:opacity-100',
};

export function getKangurCheckButtonClassName(
  className?: string,
  feedbackTone: KangurCheckButtonTone = null
): string {
  return cn(className, feedbackTone ? FEEDBACK_TONE_CLASSNAME[feedbackTone] : null);
}
