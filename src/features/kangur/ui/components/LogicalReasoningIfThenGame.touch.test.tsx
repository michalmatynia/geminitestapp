/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

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

import LogicalReasoningIfThenGame, {
  type LogicalReasoningIfThenCase,
  type LogicalReasoningIfThenGameCopy,
} from '@/features/kangur/ui/components/LogicalReasoningIfThenGame';

const cases: LogicalReasoningIfThenCase[] = [
  {
    id: 'rain',
    rule: 'Jeśli pada deszcz, to biorę parasol.',
    fact: 'Pada deszcz.',
    conclusion: 'Biorę parasol.',
    valid: true,
    explanation: 'Warunek jest spełniony.',
  },
];

const copy: LogicalReasoningIfThenGameCopy = {
  header: {
    eyebrow: 'Gra logiczna',
    title: 'Jeśli... to...',
    description: 'Przeciągnij lub wybierz.',
    placedTemplate: 'Umieszczone: {placed}/{total}',
  },
  zones: {
    pool: { title: 'Karty', hint: 'Przenieś kartę.', ariaLabel: 'Pula' },
    valid: { title: 'Wynika', hint: 'Wniosek wynika.', ariaLabel: 'Wynika' },
    invalid: { title: 'Nie wynika', hint: 'Wniosek nie wynika.', ariaLabel: 'Nie wynika' },
  },
  card: {
    ifLabel: 'Jeśli...',
    factLabel: 'Fakt:',
    conclusionLabel: 'Wniosek:',
    selectAriaTemplate: 'Wybierz kartę: {conclusion}',
  },
  status: { correct: 'Dobrze', wrong: 'Źle' },
  selection: {
    selectedTemplate: 'Wybrana karta: {conclusion}',
    idle: 'Wybierz kartę, aby przenieść ją klawiaturą.',
    touchIdle: 'Dotknij kartę, a potem dotknij strefy „wynika”, „nie wynika” albo puli.',
    touchSelectedTemplate:
      'Wybrana karta: {conclusion} Dotknij strefy „wynika”, „nie wynika” albo puli.',
  },
  moveButtons: {
    toValid: 'Do wynika',
    toInvalid: 'Do nie wynika',
    toPool: 'Do puli',
  },
  actions: { check: 'Sprawdź', reset: 'Reset' },
  summary: {
    perfect: 'Super!',
    good: 'Dobra robota!',
    retry: 'Spróbuj ponownie.',
    resultTemplate: 'Wynik: {score}/{total}',
  },
};

describe('LogicalReasoningIfThenGame touch interactions', () => {
  it('shows touch guidance and supports tap-to-zone assignment', () => {
    render(<LogicalReasoningIfThenGame cases={cases} copy={copy} />);

    expect(screen.getByTestId('logical-ifthen-touch-hint')).toHaveTextContent(
      'Dotknij kartę, a potem dotknij strefy „wynika”, „nie wynika” albo puli.'
    );

    const pool = screen.getByTestId('logical-ifthen-zone-pool');
    const card = within(pool).getByRole('button', { name: 'Wybierz kartę: Biorę parasol.' });
    expect(card).toHaveClass('touch-manipulation');
    expect(card).toHaveClass('min-h-[4.5rem]');

    fireEvent.click(card);

    expect(screen.getByTestId('logical-ifthen-touch-hint')).toHaveTextContent(
      'Wybrana karta: Biorę parasol. Dotknij strefy „wynika”, „nie wynika” albo puli.'
    );

    const validZone = screen.getByTestId('logical-ifthen-zone-valid');
    fireEvent.click(validZone);

    expect(within(validZone).getByText('Biorę parasol.')).toBeInTheDocument();
  });
});
