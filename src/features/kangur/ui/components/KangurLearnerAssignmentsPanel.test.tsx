/**
 * @vitest-environment jsdom
 */

import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  buildKangurAssignmentListItemsMock,
  selectKangurPriorityAssignmentsMock,
  useKangurAssignmentsMock,
  useKangurPageContentEntryMock,
} = vi.hoisted(() => ({
  buildKangurAssignmentListItemsMock: vi.fn(),
  selectKangurPriorityAssignmentsMock: vi.fn(),
  useKangurAssignmentsMock: vi.fn(),
  useKangurPageContentEntryMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/components/KangurAssignmentsList', () => ({
  __esModule: true,
  default: ({
    items,
    title,
  }: {
    items: Array<{ id: string; title: string }>;
    title: string;
  }) => (
    <section data-testid={`assignments-list-${title}`}>
      <h3>{title}</h3>
      {items.map((item) => (
        <div key={item.id}>{item.title}</div>
      ))}
    </section>
  ),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurAssignments', () => ({
  useKangurAssignments: useKangurAssignmentsMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: useKangurPageContentEntryMock,
}));

vi.mock('@/features/kangur/ui/services/delegated-assignments', () => ({
  buildKangurAssignmentListItems: buildKangurAssignmentListItemsMock,
  selectKangurPriorityAssignments: selectKangurPriorityAssignmentsMock,
}));

import { KangurLearnerAssignmentsPanel } from '@/features/kangur/ui/components/KangurLearnerAssignmentsPanel';

describe('KangurLearnerAssignmentsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useKangurPageContentEntryMock.mockReturnValue({
      entry: null,
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    });
  });

  it('renders the themed learner assignments summary copy for loaded data', () => {
    const assignments = [
      {
        id: 'assignment-1',
        title: 'Dodawanie',
        archived: false,
        priority: 'high',
        updatedAt: '2026-03-10T10:00:00.000Z',
        progress: { status: 'assigned', completedAt: null },
      },
      {
        id: 'assignment-2',
        title: 'Zegar',
        archived: false,
        priority: 'medium',
        updatedAt: '2026-03-11T12:00:00.000Z',
        progress: { status: 'completed', completedAt: '2026-03-11T12:00:00.000Z' },
      },
    ];

    useKangurAssignmentsMock.mockReturnValue({
      assignments,
      isLoading: false,
      error: null,
    });
    selectKangurPriorityAssignmentsMock.mockReturnValue([assignments[0]]);
    buildKangurAssignmentListItemsMock.mockImplementation((_basePath, sourceAssignments) =>
      sourceAssignments.map((assignment: { id: string; title: string }) => ({
        id: assignment.id,
        title: assignment.title,
      }))
    );

    render(<KangurLearnerAssignmentsPanel basePath='/kangur' enabled />);

    expect(screen.getByText('Przebieg przydzielonych zadan')).toHaveClass(
      '[color:var(--kangur-page-muted-text)]'
    );
    expect(
      screen.getByText(
        'Sprawdz, co jest nadal aktywne, ile zadan masz juz za soba i co bylo ostatnim sukcesem.'
      )
    ).toHaveClass('[color:var(--kangur-page-muted-text)]');
    expect(screen.getByText('Aktywne zadania od rodzica')).toBeInTheDocument();
    expect(screen.getByText('Historia ukonczonych zadan')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('assignments-list-Aktywne zadania od rodzica')).getByText(
        'Dodawanie'
      )
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('assignments-list-Historia ukonczonych zadan')).getByText('Zegar')
    ).toBeInTheDocument();
  });

  it('uses Mongo-backed assignments intro copy when available', () => {
    const assignments = [
      {
        id: 'assignment-1',
        title: 'Dodawanie',
        archived: false,
        priority: 'high',
        updatedAt: '2026-03-10T10:00:00.000Z',
        progress: { status: 'assigned', completedAt: null },
      },
    ];

    useKangurPageContentEntryMock.mockReturnValue({
      entry: {
        id: 'learner-profile-assignments',
        title: 'Przebieg przydzielonych zadan',
        summary: 'Mongo opis aktywnych i zakonczonych przydzialow ucznia.',
      },
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    });
    useKangurAssignmentsMock.mockReturnValue({
      assignments,
      isLoading: false,
      error: null,
    });
    selectKangurPriorityAssignmentsMock.mockReturnValue(assignments);
    buildKangurAssignmentListItemsMock.mockImplementation((_basePath, sourceAssignments) =>
      sourceAssignments.map((assignment: { id: string; title: string }) => ({
        id: assignment.id,
        title: assignment.title,
      }))
    );

    render(<KangurLearnerAssignmentsPanel basePath='/kangur' enabled />);

    expect(screen.getByText('Przebieg przydzielonych zadan')).toBeInTheDocument();
    expect(
      screen.getByText('Mongo opis aktywnych i zakonczonych przydzialow ucznia.')
    ).toBeInTheDocument();
  });
});
