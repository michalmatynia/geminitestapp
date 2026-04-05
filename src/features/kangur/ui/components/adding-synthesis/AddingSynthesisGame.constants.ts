import type { KangurAccent } from '@/features/kangur/ui/design/tokens';
import type { FeedbackKind } from './AddingSynthesisGame.types';

export const ADDING_SYNTHESIS_VIEW_KINDS = {
  intro: 'intro',
  playing: 'playing',
  summary: 'summary',
} as const;

export const LANE_STYLES = [
  {
    accent: 'amber',
    rail: 'border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,251,235,0.98)_0%,rgba(255,255,255,0.92)_100%)]',
    label: 'text-amber-700',
  },
  {
    accent: 'sky',
    rail: 'border-sky-200/80 bg-[linear-gradient(180deg,rgba(239,246,255,0.98)_0%,rgba(255,255,255,0.92)_100%)]',
    label: 'text-sky-700',
  },
  {
    accent: 'violet',
    rail: 'border-violet-200/80 bg-[linear-gradient(180deg,rgba(245,243,255,0.98)_0%,rgba(255,255,255,0.92)_100%)]',
    label: 'text-violet-700',
  },
  {
    accent: 'rose',
    rail: 'border-rose-200/80 bg-[linear-gradient(180deg,rgba(255,241,242,0.98)_0%,rgba(255,255,255,0.92)_100%)]',
    label: 'text-rose-700',
  },
] as const satisfies ReadonlyArray<{
  accent: KangurAccent;
  rail: string;
  label: string;
}>;

export const getFeedbackAccent = (kind: FeedbackKind): 'emerald' | 'amber' | 'rose' => {
  if (kind === 'wrong' || kind === 'miss') {
    return 'rose';
  }

  return kind === 'perfect' ? 'emerald' : 'amber';
};
