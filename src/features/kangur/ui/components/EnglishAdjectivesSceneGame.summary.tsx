import React from 'react';
import { cn } from '@/features/kangur/shared/utils';
import { KANGUR_ACCENT_STYLES, type KangurAccent } from '@/features/kangur/ui/design/tokens';

export function SummaryAdjectiveGuideCard({
  accent,
  dataTestId,
  examples,
  label,
  lead,
}: {
  accent: KangurAccent;
  dataTestId: string;
  examples: string;
  label: string;
  lead: string;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'rounded-[18px] border px-3 py-3 text-left shadow-sm',
        KANGUR_ACCENT_STYLES[accent].activeCard
      )}
      data-testid={dataTestId}
    >
      <p className='text-[10px] font-black uppercase tracking-[0.16em] text-slate-500'>{label}</p>
      <p className='mt-1 text-sm font-semibold text-slate-700'>{lead}</p>
      <p className='mt-2 text-xs text-slate-600'>{examples}</p>
    </div>
  );
}

export function SummaryAdjectiveOrderCard({
  accent,
  dataTestId,
  label,
  phrase,
  rule,
}: {
  accent: KangurAccent;
  dataTestId: string;
  label: string;
  phrase: string;
  rule: string;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'rounded-[18px] border px-3 py-3 text-left shadow-sm',
        KANGUR_ACCENT_STYLES[accent].activeCard
      )}
      data-testid={dataTestId}
    >
      <p className='text-[10px] font-black uppercase tracking-[0.16em] text-slate-500'>{label}</p>
      <p className='mt-1 text-sm font-semibold text-slate-700'>{phrase}</p>
      <p className='mt-2 text-xs font-semibold text-slate-600'>{rule}</p>
    </div>
  );
}

export function SummaryAdjectiveStarterCard({
  accent,
  dataTestId,
  text,
}: {
  accent: KangurAccent;
  dataTestId: string;
  text: string;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'rounded-[18px] border px-3 py-3 text-left shadow-sm',
        KANGUR_ACCENT_STYLES[accent].activeCard
      )}
      data-testid={dataTestId}
    >
      <p className='text-sm font-semibold text-slate-700'>{text}</p>
    </div>
  );
}

export function SummaryAdjectiveQuestionCard({
  accent,
  dataTestId,
  prompt,
  starter,
}: {
  accent: KangurAccent;
  dataTestId: string;
  prompt: string;
  starter: string;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'rounded-[18px] border px-3 py-3 text-left shadow-sm',
        KANGUR_ACCENT_STYLES[accent].activeCard
      )}
      data-testid={dataTestId}
    >
      <p className='text-sm font-semibold text-slate-700'>{prompt}</p>
      <p className='mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500'>
        {starter}
      </p>
    </div>
  );
}
