'use client';

import React, { type ReactNode } from 'react';

import { useKangurTutorAnchor } from '@/features/kangur/ui/hooks/useKangurTutorAnchor';
import type { KangurTestQuestion } from '@/features/kangur/shared/contracts/kangur-tests';
import { sanitizeSvg } from '@/features/kangur/shared/utils';
import { CheckCircle, XCircle } from 'lucide-react';
import { KangurAnswerChoiceBadge } from '@/features/kangur/ui/components/KangurAnswerChoiceBadge';
import { KANGUR_ACCENT_STYLES, type KangurAccent } from '@/features/kangur/ui/design/tokens';

// ── Test Choice Card Sub-components ──────────────────────────────────────────

export function KangurTestChoiceCardBadge({
  label,
  accent = 'slate',
}: {
  label: string;
  accent?: KangurAccent;
}): React.JSX.Element {
  const badgeClassName = KANGUR_ACCENT_STYLES[accent].badge;
  return (
    <KangurAnswerChoiceBadge className={badgeClassName} size='xs'>
      {label}
    </KangurAnswerChoiceBadge>
  );
}

export function KangurTestChoiceCardContent({
  choice,
}: {
  choice: KangurTestQuestion['choices'][number];
}): React.JSX.Element {
  return (
    <span className='flex flex-1 flex-col gap-2 [color:var(--kangur-page-text)]'>
      {choice.svgContent?.trim() ? (
        <span className='flex items-center justify-center rounded-[18px] border p-2 [border-color:var(--kangur-soft-card-border)] [background:var(--kangur-soft-card-background)]'>
          <span
            className='block max-h-24 max-w-full'
            dangerouslySetInnerHTML={{ __html: sanitizeSvg(choice.svgContent) }}
          />
        </span>
      ) : null}
      <span>{choice.text}</span>
      {choice.description?.trim() ? (
        <span className='text-xs font-medium leading-5 [color:var(--kangur-page-muted-text)]'>
          {choice.description.trim()}
        </span>
      ) : null}
    </span>
  );
}

export function KangurTestChoiceCardFeedback({
  showAnswer,
  isSelected,
  isChoiceCorrect,
}: {
  showAnswer: boolean;
  isSelected: boolean;
  isChoiceCorrect: boolean;
}): React.JSX.Element | null {
  if (!showAnswer) return null;

  if (isChoiceCorrect) {
    return (
      <>
        <CheckCircle aria-hidden='true' className='size-4 shrink-0 text-emerald-500' />
        <span className='sr-only'>Poprawna odpowiedź</span>
      </>
    );
  }

  if (isSelected && !isChoiceCorrect) {
    return (
      <>
        <XCircle aria-hidden='true' className='size-4 shrink-0 text-rose-500' />
        <span className='sr-only'>Błędna odpowiedź</span>
      </>
    );
  }

  return null;
}

// ── Main Component ───────────────────────────────────────────────────────────

type KangurTestChoiceCardProps = {
  children: ReactNode;
  choiceGrid?: boolean;
  contentId?: string | null;
  choice?: KangurTestQuestion['choices'][number];
  question?: KangurTestQuestion;
  isSelected?: boolean;
  showAnswer?: boolean;
};

export function KangurTestChoiceCard({
  children,
  choiceGrid,
  contentId,
  choice,
  question,
  isSelected,
  showAnswer,
}: KangurTestChoiceCardProps): React.JSX.Element {
  const selectionAnchorRef = React.useRef<HTMLDivElement | null>(null);

  useKangurTutorAnchor({
    id: `kangur-test-selection:${contentId ?? question?.suiteId}:${question?.id}:${choice?.label}`,
    kind: 'selection',
    ref: selectionAnchorRef,
    surface: 'test',
    enabled: Boolean(isSelected && !showAnswer),
    priority: 86,
    metadata: {
      contentId: contentId ?? question?.suiteId ?? '',
      label: `Odpowiedź ${choice?.label}: ${choice?.text}`,
    },
  });

  return (
    <div ref={selectionAnchorRef} className={choiceGrid ? 'h-full' : undefined}>
      {children}
    </div>
  );
}
