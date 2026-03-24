/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { DEFAULT_KANGUR_AGE_GROUP } from '@/features/kangur/lessons/lesson-catalog';
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

const { useKangurAgeGroupFocusMock } = vi.hoisted(() => ({
  useKangurAgeGroupFocusMock: vi.fn(),
}));

let requestAnimationFrameMock: ReturnType<typeof vi.spyOn> | null = null;
let cancelAnimationFrameMock: ReturnType<typeof vi.spyOn> | null = null;
const scheduledAnimationFrameHandles = new Set<number>();

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

vi.mock('@/features/kangur/ui/context/KangurAgeGroupFocusContext', () => ({
  useKangurAgeGroupFocus: () => useKangurAgeGroupFocusMock(),
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
  useKangurLessonDocument: () => ({
    data: null,
    isLoading: false,
    isPending: false,
    isFetching: false,
    isRefetching: false,
    error: null,
  }),
  useKangurLessonDocuments: () => ({
    data: {},
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLessonTemplates', () => ({
  useKangurLessonTemplates: () => ({
    data: [],
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLessonSections', () => ({
  useKangurLessonSections: () => ({
    data: [],
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: () => ({
    entry: null,
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

const createTestQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });

let Lessons: typeof import('@/features/kangur/ui/pages/Lessons').default;
let KangurGuestPlayerProvider: typeof import('@/features/kangur/ui/context/KangurGuestPlayerContext').KangurGuestPlayerProvider;

const renderLessonsPage = () =>
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <KangurGuestPlayerProvider>
        <Lessons />
      </KangurGuestPlayerProvider>
    </QueryClientProvider>
  );

const lessonsSettingsValue = JSON.stringify([
  {
    id: 'kangur-lesson-adding',
    componentId: 'adding',
    subject: 'maths',
    ageGroup: DEFAULT_KANGUR_AGE_GROUP,
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
    ageGroup: DEFAULT_KANGUR_AGE_GROUP,
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
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useRealTimers();
    vi.resetModules();
    requestAnimationFrameMock = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback) => {
        const handle = window.setTimeout(() => {
          scheduledAnimationFrameHandles.delete(handle);
          callback(performance.now());
        }, 0);
        scheduledAnimationFrameHandles.add(handle);
        return handle;
      });
    cancelAnimationFrameMock = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation((handle: number) => {
        if (scheduledAnimationFrameHandles.has(handle)) {
          scheduledAnimationFrameHandles.delete(handle);
          window.clearTimeout(handle);
        }
      });
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
    useKangurAgeGroupFocusMock.mockReturnValue({
      ageGroup: DEFAULT_KANGUR_AGE_GROUP,
      setAgeGroup: vi.fn(),
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
    Lessons = (await import('@/features/kangur/ui/pages/Lessons')).default;
    KangurGuestPlayerProvider = (
      await import('@/features/kangur/ui/context/KangurGuestPlayerContext')
    ).KangurGuestPlayerProvider;
  });

  afterEach(() => {
    for (const handle of scheduledAnimationFrameHandles) {
      window.clearTimeout(handle);
    }
    scheduledAnimationFrameHandles.clear();
    requestAnimationFrameMock?.mockRestore();
    cancelAnimationFrameMock?.mockRestore();
    requestAnimationFrameMock = null;
    cancelAnimationFrameMock = null;
  });

  it('auto-opens the focused lesson when focus query maps to operation', async () => {
    window.history.replaceState({}, '', '/kangur/lessons?focus=division');

    renderLessonsPage();

    expect(await screen.findByTestId('active-lesson-header')).toHaveTextContent('Dzielenie');
    expect(screen.getByTestId('active-lesson-parent-completed-chip')).toHaveTextContent(
      'Ukończone dla rodzica'
    );
    expect(window.location.search).toBe('');
  });

  it('keeps lessons list view when focus query does not map to a lesson', async () => {
    window.history.replaceState({}, '', '/kangur/lessons?focus=unknown');

    renderLessonsPage();

    expect(await screen.findByRole('heading', { name: 'Lekcje' })).toBeInTheDocument();
    expect(screen.queryByTestId('active-lesson-header')).not.toBeInTheDocument();
    expect(window.location.search).toBe('?focus=unknown');
  });
});
