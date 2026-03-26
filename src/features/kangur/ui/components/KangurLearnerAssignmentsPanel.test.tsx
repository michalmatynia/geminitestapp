/**
 * @vitest-environment jsdom
 */

import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  buildKangurAssignmentListItemsMock,
  filterKangurAssignmentsBySubjectMock,
  selectKangurPriorityAssignmentsMock,
  useKangurAssignmentsMock,
  useKangurPageContentEntryMock,
  useKangurSubjectFocusMock,
} = vi.hoisted(() => ({
  buildKangurAssignmentListItemsMock: vi.fn(),
  filterKangurAssignmentsBySubjectMock: vi.fn(),
  selectKangurPriorityAssignmentsMock: vi.fn(),
  useKangurAssignmentsMock: vi.fn(),
  useKangurPageContentEntryMock: vi.fn(),
  useKangurSubjectFocusMock: vi.fn(),
}));

const { localeMock } = vi.hoisted(() => ({
  localeMock: vi.fn(() => 'pl'),
}));

vi.mock('next-intl', () => ({
  useLocale: () => localeMock(),
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

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  useKangurSubjectFocus: () => useKangurSubjectFocusMock(),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: useKangurPageContentEntryMock,
}));

vi.mock('@/features/kangur/ui/services/delegated-assignments', () => ({
  buildKangurAssignmentListItems: buildKangurAssignmentListItemsMock,
  filterKangurAssignmentsBySubject: filterKangurAssignmentsBySubjectMock,
  selectKangurPriorityAssignments: selectKangurPriorityAssignmentsMock,
}));

import { KangurLearnerAssignmentsPanel } from '@/features/kangur/ui/components/KangurLearnerAssignmentsPanel';

describe('KangurLearnerAssignmentsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localeMock.mockReturnValue('pl');
    useKangurPageContentEntryMock.mockReturnValue({
      entry: null,
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    });
    useKangurSubjectFocusMock.mockReturnValue({
      subject: 'maths',
      setSubject: vi.fn(),
    });
    filterKangurAssignmentsBySubjectMock.mockImplementation((assignments) => assignments);
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

    expect(screen.getByText('Sugestie od Rodzica')).toHaveClass(
      '[color:var(--kangur-page-muted-text)]'
    );
    expect(
      screen.getByText(
        'Zadania i wskazówki od rodzica, które warto wykonać w pierwszej kolejności.'
      )
    ).toHaveClass('[color:var(--kangur-page-muted-text)]');
    expect(screen.getByText('Aktualne sugestie od rodzica')).toBeInTheDocument();
    expect(screen.getByText('Historia wykonanych sugestii')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('assignments-list-Aktualne sugestie od rodzica')).getByText(
        'Dodawanie'
      )
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('assignments-list-Historia wykonanych sugestii')).getByText('Zegar')
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
        title: 'Sugestie od Rodzica',
        summary: 'Mongo opis aktywnych i zakończonych sugestii od rodzica.',
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

    expect(screen.getByText('Sugestie od Rodzica')).toBeInTheDocument();
    expect(
      screen.getByText('Mongo opis aktywnych i zakończonych sugestii od rodzica.')
    ).toBeInTheDocument();
  });

  it('renders English fallback copy on the English route', () => {
    localeMock.mockReturnValue('en');
    useKangurAssignmentsMock.mockReturnValue({
      assignments: [],
      isLoading: false,
      error: null,
    });
    selectKangurPriorityAssignmentsMock.mockReturnValue([]);
    buildKangurAssignmentListItemsMock.mockReturnValue([]);

    render(<KangurLearnerAssignmentsPanel basePath='/kangur' enabled />);

    expect(screen.getByText('Parent suggestions')).toBeInTheDocument();
    expect(
      screen.getByText('Tasks and hints from the parent that are worth completing first.')
    ).toBeInTheDocument();
    expect(screen.getByText('Current parent suggestions')).toBeInTheDocument();
    expect(screen.getByText('History of completed suggestions')).toBeInTheDocument();
  });
});
