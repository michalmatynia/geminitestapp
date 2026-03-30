/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

import { AgenticAssignmentGame } from '@/features/kangur/ui/components/AgenticAssignmentGame';

const copy = {
  statusLabel: 'Assignment game',
  heading: 'Match the items',
  lead: 'Assign each item to the right bucket.',
  instructions: ['Pick an item.', 'Pick a bucket.', 'Check the result.'],
  leftPanelTitle: 'Items',
  leftPanelCaption: {
    coarsePointer: 'Tap an item, then tap a bucket.',
    finePointer: 'Drag or click to assign.',
  },
  leftPanelCountLabel: (assignedCount: number, total: number) => `${assignedCount}/${total}`,
  leftPanelGroupLabel: 'Items group',
  leftPanelTouchHint: {
    idle: 'Select an item.',
    selected: (itemText: string) => `Selected item: ${itemText}`,
    testId: 'agentic-assignment-touch-hint',
  },
  rightPanelTitle: 'Buckets',
  rightPanelCaption: {
    coarsePointer: 'Pick the matching bucket.',
    finePointer: 'Pick the matching bucket.',
  },
  rightPanelGroupLabel: 'Buckets group',
  successMessage: 'Perfect assignment.',
  failureMessage: (score: number, total: number) => `Assigned ${score}/${total} correctly.`,
};

const options = [
  {
    id: 'safe',
    label: 'Safe',
    description: 'Correct bucket',
    colorClass: 'border-emerald-200 bg-emerald-50',
  },
  {
    id: 'risky',
    label: 'Risky',
    description: 'Wrong bucket',
    colorClass: 'border-rose-200 bg-rose-50',
  },
] as const;

const theme = {
  accent: 'emerald',
  heroClassName: 'bg-white',
  heroTopGlowClassName: 'bg-emerald-200',
  heroBottomGlowClassName: 'bg-emerald-100',
  headingGradientClass: 'from-emerald-500 to-teal-500',
  instructionListClassName: 'list-disc pl-4',
  leftPanelGlowClassName: 'bg-emerald-100',
  leftPanelTitleClassName: 'text-emerald-900',
  leftPanelCaptionClassName: 'text-emerald-700',
  leftTouchHintClassName: 'text-emerald-900',
  leftItemFocusRingClassName: 'focus-visible:ring-emerald-300',
  leftItemActiveClassName: 'border-emerald-300 bg-emerald-50',
  leftItemInactiveClassName: 'border-slate-200',
  leftItemCorrectClassName: 'border-emerald-300 bg-emerald-50',
  leftItemWrongClassName: 'border-rose-300 bg-rose-50',
  leftAssignedBadgeClassName: 'border-slate-200 text-slate-700',
  rightPanelGlowClassName: 'bg-emerald-100',
  rightPanelTitleClassName: 'text-emerald-900',
  rightPanelCaptionClassName: 'text-emerald-700',
  rightOptionFocusRingClassName: 'focus-visible:ring-emerald-300',
  rightOptionDescriptionClassName: 'text-slate-600',
} as const;

const baseProps = {
  copy,
  items: [{ id: 'item-1', text: 'Protect secrets', answer: 'safe' }] as const,
  onFinish: vi.fn(),
  options,
  theme,
  visual: null,
} as const;

describe('AgenticAssignmentGame', () => {
  it('keeps Check visible in green without the old success text', () => {
    render(<AgenticAssignmentGame {...baseProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Protect secrets' }));
    fireEvent.click(screen.getByRole('button', { name: 'Safe' }));

    const checkButton = screen.getByRole('button', { name: 'Check' });
    fireEvent.click(checkButton);

    expect(checkButton).toHaveClass('bg-emerald-500');
    expect(screen.queryByText('Perfect assignment.')).not.toBeInTheDocument();
  });

  it('keeps Check visible in red without the old failure text', () => {
    render(<AgenticAssignmentGame {...baseProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Protect secrets' }));
    fireEvent.click(screen.getByRole('button', { name: 'Risky' }));

    const checkButton = screen.getByRole('button', { name: 'Check' });
    fireEvent.click(checkButton);

    expect(checkButton).toHaveClass('bg-rose-500');
    expect(screen.queryByText('Assigned 0/1 correctly.')).not.toBeInTheDocument();
  });
});
