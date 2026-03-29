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

const renderChoiceSvg = (svgContent: string | undefined): React.JSX.Element | null => {
  const trimmedSvgContent = svgContent?.trim();
  if (!trimmedSvgContent) return null;

  return (
    <span className='flex items-center justify-center rounded-[18px] border p-2 [border-color:var(--kangur-soft-card-border)] [background:var(--kangur-soft-card-background)]'>
      <span
        className='block max-h-24 max-w-full'
        dangerouslySetInnerHTML={{ __html: sanitizeSvg(trimmedSvgContent) }}
      />
    </span>
  );
};

const renderChoiceDescription = (description: string | undefined): React.JSX.Element | null => {
  const trimmedDescription = description?.trim();
  if (!trimmedDescription) return null;

  return (
    <span className='text-xs font-medium leading-5 [color:var(--kangur-page-muted-text)]'>
      {trimmedDescription}
    </span>
  );
};

export function KangurTestChoiceCardContent({
  choice,
}: {
  choice: KangurTestQuestion['choices'][number];
}): React.JSX.Element {
  const svg = renderChoiceSvg(choice.svgContent);
  const description = renderChoiceDescription(choice.description);

  return (
    <span className='flex flex-1 flex-col gap-2 [color:var(--kangur-page-text)]'>
      {svg}
      <span>{choice.text}</span>
      {description}
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

type KangurTestChoiceAnchorParams = Omit<KangurTestChoiceCardProps, 'children' | 'choiceGrid'>;

const resolveChoiceContentId = (
  contentId: string | null | undefined,
  question: KangurTestQuestion | undefined
): string => contentId ?? question?.suiteId ?? '';

const resolveChoiceQuestionId = (question: KangurTestQuestion | undefined): string => question?.id ?? '';

const resolveChoiceLabel = (
  choice: KangurTestQuestion['choices'][number] | undefined
): string => choice?.label ?? '';

const resolveChoiceText = (
  choice: KangurTestQuestion['choices'][number] | undefined
): string => choice?.text ?? '';

const resolveChoiceAnchorEnabled = (
  isSelected: boolean | undefined,
  showAnswer: boolean | undefined
): boolean => isSelected === true && showAnswer !== true;

const resolveChoiceSelectionAnchorConfig = ({
  contentId,
  choice,
  question,
  isSelected,
  showAnswer,
}: KangurTestChoiceAnchorParams) => {
  const resolvedContentId = resolveChoiceContentId(contentId, question);
  const resolvedQuestionId = resolveChoiceQuestionId(question);
  const resolvedChoiceLabel = resolveChoiceLabel(choice);
  const resolvedChoiceText = resolveChoiceText(choice);

  return {
    id: `kangur-test-selection:${resolvedContentId}:${resolvedQuestionId}:${resolvedChoiceLabel}`,
    enabled: resolveChoiceAnchorEnabled(isSelected, showAnswer),
    metadata: {
      contentId: resolvedContentId,
      label: `Odpowiedź ${resolvedChoiceLabel}: ${resolvedChoiceText}`,
    },
  };
};

const useChoiceSelectionAnchor = (params: KangurTestChoiceAnchorParams) => {
  const selectionAnchorRef = React.useRef<HTMLDivElement | null>(null);
  const anchorConfig = resolveChoiceSelectionAnchorConfig(params);

  useKangurTutorAnchor({
    id: anchorConfig.id,
    kind: 'selection',
    ref: selectionAnchorRef,
    surface: 'test',
    enabled: anchorConfig.enabled,
    priority: 86,
    metadata: anchorConfig.metadata,
  });

  return selectionAnchorRef;
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
  const selectionAnchorRef = useChoiceSelectionAnchor({
    contentId,
    choice,
    question,
    isSelected,
    showAnswer,
  });

  return (
    <div ref={selectionAnchorRef} className={choiceGrid ? 'h-full' : undefined}>
      {children}
    </div>
  );
}
