/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@hello-pangea/dnd', () => ({
  DragDropContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Droppable: ({
    children,
  }: {
    children: (
      provided: {
        innerRef: (element: HTMLElement | null) => void;
        droppableProps: Record<string, never>;
        placeholder: null;
      },
      snapshot: { isDraggingOver: boolean }
    ) => React.ReactNode;
  }) =>
    children(
      {
        innerRef: () => undefined,
        droppableProps: {},
        placeholder: null,
      },
      { isDraggingOver: false }
    ),
  Draggable: ({
    children,
  }: {
    children: (
      provided: {
        innerRef: (element: HTMLElement | null) => void;
        draggableProps: Record<string, never>;
        dragHandleProps: Record<string, never>;
      },
      snapshot: { isDragging: boolean }
    ) => React.ReactNode;
  }) =>
    children(
      {
        innerRef: () => undefined,
        draggableProps: {},
        dragHandleProps: {},
      },
      { isDragging: false }
    ),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

import AgenticDocsHierarchyGame from '@/features/kangur/ui/components/AgenticDocsHierarchyGame';

const items = [
  { id: 'goal', title: 'Goal' },
  { id: 'context', title: 'Context' },
  { id: 'rollout', title: 'Rollout' },
] as const;

const ensureFirstHierarchyItem = (itemId: 'goal' | 'context'): void => {
  const list = screen.getByTestId('agentic-docs-hierarchy-list');
  const renderedItems = Array.from(
    list.querySelectorAll<HTMLElement>('[data-testid^="agentic-docs-hierarchy-item-"]')
  );
  if (renderedItems[0]?.dataset.testid === `agentic-docs-hierarchy-item-${itemId}`) {
    return;
  }

  const sourceItemId = itemId === 'goal' ? 'context' : 'goal';
  fireEvent.click(screen.getByTestId(`agentic-docs-hierarchy-item-${itemId}`));
  fireEvent.click(screen.getByTestId(`agentic-docs-hierarchy-item-${sourceItemId}`));
};

describe('AgenticDocsHierarchyGame touch interactions', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('supports tap-based card reordering on coarse pointers', () => {
    render(
      <AgenticDocsHierarchyGame
        items={items}
        correctOrder={['goal', 'context', 'rollout']}
        prompt='Ułóż sekcje.'
        helperText='Najważniejsze u góry.'
      />
    );

    expect(screen.getByTestId('agentic-docs-hierarchy-touch-hint')).toHaveTextContent(
      'Najważniejsze u góry.'
    );

    const previewBefore = screen.getByTestId('agentic-docs-hierarchy-list').textContent;
    const goalCard = screen.getByTestId('agentic-docs-hierarchy-item-goal');
    expect(goalCard).toHaveClass('touch-manipulation');
    expect(goalCard).toHaveStyle({ touchAction: 'none' });
    expect(goalCard).toHaveClass('min-h-[5rem]');

    fireEvent.click(goalCard);

    expect(screen.getByTestId('agentic-docs-hierarchy-touch-hint')).toHaveTextContent(
      'Wybrana karta: Goal. Dotknij innej pozycji, aby przenieść kartę.'
    );

    fireEvent.click(screen.getByTestId('agentic-docs-hierarchy-item-rollout'));

    expect(screen.getByTestId('agentic-docs-hierarchy-list').textContent).not.toBe(previewBefore);
  });

  it('keeps Sprawdź visible in green without the old success captions', () => {
    render(
      <AgenticDocsHierarchyGame
        items={[
          { id: 'goal', title: 'Goal' },
          { id: 'context', title: 'Context' },
        ]}
        correctOrder={['goal', 'context']}
        prompt='Ułóż sekcje.'
        helperText='Najważniejsze u góry.'
      />
    );

    ensureFirstHierarchyItem('goal');

    const checkButton = screen.getByRole('button', { name: 'Sprawdź' });
    fireEvent.click(checkButton);

    expect(checkButton).toHaveClass('bg-emerald-500');
    expect(screen.queryByText('Perfekcyjna kolejność')).not.toBeInTheDocument();
    expect(screen.queryByText('Świetnie! To jest prawidłowa hierarchia.')).not.toBeInTheDocument();
  });

  it('keeps Sprawdź visible in red without the old retry captions', () => {
    render(
      <AgenticDocsHierarchyGame
        items={[
          { id: 'goal', title: 'Goal' },
          { id: 'context', title: 'Context' },
        ]}
        correctOrder={['goal', 'context']}
        prompt='Ułóż sekcje.'
        helperText='Najważniejsze u góry.'
      />
    );

    ensureFirstHierarchyItem('context');

    const checkButton = screen.getByRole('button', { name: 'Sprawdź' });
    fireEvent.click(checkButton);

    expect(checkButton).toHaveClass('bg-rose-500');
    expect(screen.queryByText(/poprawnie/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Sprawdź, które elementy są jeszcze nie na miejscu.')).not.toBeInTheDocument();
  });
});
