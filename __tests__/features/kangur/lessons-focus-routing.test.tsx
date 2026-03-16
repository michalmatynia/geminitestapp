/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { render, screen } from '@/__tests__/test-utils';
import { KangurGuestPlayerProvider } from '@/features/kangur/ui/context/KangurGuestPlayerContext';
import { createDefaultKangurProgressState } from '@/shared/contracts/kangur';
const {
  useKangurRoutingMock,
  settingsStoreGetMock,
  useKangurProgressStateMock,
  useKangurAuthMock,
  useKangurAssignmentsMock,
  useSessionMock,
  lessonsState,
} = vi.hoisted(() => ({
    useKangurRoutingMock: vi.fn(),
    settingsStoreGetMock: vi.fn(),
    useKangurProgressStateMock: vi.fn(),
    useKangurAuthMock: vi.fn(),
    useKangurAssignmentsMock: vi.fn(),
    useSessionMock: vi.fn(),
    lessonsState: {
      value: [] as Array<Record<string, unknown>>,
    },
  }));

const { useKangurSubjectFocusMock } = vi.hoisted(() => ({
  useKangurSubjectFocusMock: vi.fn(),
}));

let requestAnimationFrameMock: ReturnType<typeof vi.spyOn> | null = null;
let cancelAnimationFrameMock: ReturnType<typeof vi.spyOn> | null = null;

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useKangurRouting: useKangurRoutingMock,
  useOptionalKangurRouting: () => null,
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: useKangurAuthMock,
  useOptionalKangurAuth: useKangurAuthMock,
}));

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  useKangurSubjectFocus: () => useKangurSubjectFocusMock(),
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => ({
    get: settingsStoreGetMock,
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurProgressState', () => ({
  useKangurProgressState: useKangurProgressStateMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurAssignments', () => ({
  useKangurAssignments: useKangurAssignmentsMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLessons', () => ({
  useKangurLessons: (options: { subject?: string; enabledOnly?: boolean } = {}) => {
    let data = lessonsState.value;
    if (options.enabledOnly) {
      data = data.filter((lesson) => lesson.enabled !== false);
    }
    if (options.subject) {
      data = data.filter((lesson) => (lesson.subject ?? 'maths') === options.subject);
    }
    return {
      data,
      isLoading: false,
      error: null,
    };
  },
  useKangurLessonDocuments: () => ({
    data: {},
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurAiTutorContext', () => ({
  KangurAiTutorSessionSync: () => null,
  useOptionalKangurAiTutor: () => null,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurTutorAnchor', () => ({
  useKangurTutorAnchor: () => undefined,
}));

vi.mock('next-auth/react', () => ({
  useSession: useSessionMock,
}));

import Lessons from '@/features/kangur/ui/pages/Lessons';

const renderLessonsPage = () =>
  render(
    <KangurGuestPlayerProvider>
      <Lessons />
    </KangurGuestPlayerProvider>
  );

const lessonsSettingsValue = JSON.stringify([
  {
    id: 'kangur-lesson-adding',
    componentId: 'adding',
    subject: 'maths',
    title: 'Dodawanie',
    description: 'Opis',
    emoji: '➕',
    color: 'from-orange-400 to-yellow-400',
    activeBg: 'bg-orange-400',
    sortOrder: 1000,
    enabled: true,
  },
  {
    id: 'kangur-lesson-division',
    componentId: 'division',
    subject: 'maths',
    title: 'Dzielenie',
    description: 'Opis',
    emoji: '➗',
    color: 'from-blue-500 to-teal-400',
    activeBg: 'bg-blue-500',
    sortOrder: 2000,
    enabled: true,
  },
]);

describe('Lessons page focus query support', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requestAnimationFrameMock = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback) => {
        callback(0);
        return 0;
      });
    cancelAnimationFrameMock = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(() => {});
    useKangurRoutingMock.mockReturnValue({ basePath: '/kangur' });
    useKangurAuthMock.mockReturnValue({
      user: null,
      navigateToLogin: vi.fn(),
      logout: vi.fn(),
    });
    useKangurSubjectFocusMock.mockReturnValue({
      subject: 'maths',
      setSubject: vi.fn(),
      subjectKey: 'learner-1',
    });
    useSessionMock.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });
    lessonsState.value = JSON.parse(lessonsSettingsValue) as Array<Record<string, unknown>>;
    settingsStoreGetMock.mockReturnValue(undefined);
    useKangurAssignmentsMock.mockReturnValue({
      assignments: [
        {
          id: 'assignment-division-completed',
          learnerKey: 'ada@example.com',
          title: '➗ Dzielenie',
          description: 'Powtórz dzielenie po przydziale rodzica.',
          priority: 'high',
          archived: false,
          target: {
            type: 'lesson',
            lessonComponentId: 'division',
            requiredCompletions: 1,
            baselineCompletions: 0,
          },
          assignedByName: 'Ada',
          assignedByEmail: 'ada@example.com',
          createdAt: '2026-03-06T09:00:00.000Z',
          updatedAt: '2026-03-06T10:30:00.000Z',
          progress: {
            status: 'completed',
            percent: 100,
            summary: 'Powtórki po przydziale: 1/1.',
            attemptsCompleted: 1,
            attemptsRequired: 1,
            lastActivityAt: '2026-03-06T10:30:00.000Z',
            completedAt: '2026-03-06T10:30:00.000Z',
          },
        },
      ],
      isLoading: false,
      error: null,
      createAssignment: vi.fn(),
      updateAssignment: vi.fn(),
      refresh: vi.fn(),
    });
    useKangurProgressStateMock.mockReturnValue(createDefaultKangurProgressState());
  });

  afterEach(() => {
    requestAnimationFrameMock?.mockRestore();
    cancelAnimationFrameMock?.mockRestore();
    requestAnimationFrameMock = null;
    cancelAnimationFrameMock = null;
  });

  it('auto-opens the focused lesson when focus query maps to operation', async () => {
    window.history.replaceState({}, '', '/kangur/lessons?focus=division');

    renderLessonsPage();

    expect(await screen.findByTestId('active-lesson-header')).toHaveTextContent('Dzielenie');
    expect(await screen.findByText('Co to dzielenie?')).toBeInTheDocument();
    expect(screen.getByTestId('active-lesson-parent-completed-chip')).toHaveTextContent(
      'Ukończone dla rodzica'
    );
    expect(window.location.search).toBe('');
  });

  it('keeps lessons list view when focus query does not map to a lesson', async () => {
    window.history.replaceState({}, '', '/kangur/lessons?focus=unknown');

    renderLessonsPage();

    expect(await screen.findByRole('heading', { name: 'Lekcje' })).toBeInTheDocument();
    expect(screen.queryByText('Co to dzielenie?')).not.toBeInTheDocument();
    expect(window.location.search).toBe('?focus=unknown');
  });
});
