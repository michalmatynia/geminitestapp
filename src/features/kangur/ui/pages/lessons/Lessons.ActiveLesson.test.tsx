/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@/__tests__/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LessonHub from '@/features/kangur/ui/components/LessonHub';
import {
  LESSONS_ACTIVE_HUB_COLUMN_CLASSNAME,
  LESSONS_ACTIVE_SECTION_CLASSNAME,
} from '@/features/kangur/ui/pages/lessons/Lessons.constants';

const {
  useLessonsMock,
  useKangurMobileBreakpointMock,
  lessonDocumentBackButtonLabelMock,
  lessonDocumentBackClickMock,
  lessonComponentsMock,
  ageGroupState,
} = vi.hoisted(() => ({
  useLessonsMock: vi.fn(),
  useKangurMobileBreakpointMock: vi.fn(),
  lessonDocumentBackButtonLabelMock: vi.fn(() => null),
  lessonDocumentBackClickMock: vi.fn(),
  lessonComponentsMock: {} as Record<string, React.ComponentType<unknown>>,
  ageGroupState: {
    value: 'ten_year_old' as 'six_year_old' | 'ten_year_old' | 'grown_ups',
  },
}));

vi.mock('@/features/kangur/lesson-documents', () => ({
  hasKangurLessonDocumentContent: () => false,
}));

vi.mock('@/features/kangur/lessons/lesson-ui-registry', () => ({
  LESSON_COMPONENTS: lessonComponentsMock,
}));

vi.mock('@/features/kangur/ui/components/KangurActiveLessonHeader', () => ({
  KangurActiveLessonHeader: ({
    onBack,
    headerTestId = 'mock-active-lesson-header',
  }: {
    onBack: () => void;
    headerTestId?: string;
  }) => (
    <div data-testid={headerTestId}>
      <button type='button' onClick={onBack}>
        Wróć do listy lekcji
      </button>
    </div>
  ),
}));

vi.mock('@/features/kangur/ui/components/KangurLessonDocumentRenderer', () => ({
  KangurLessonDocumentRenderer: () => {
    const backButtonLabel = lessonDocumentBackButtonLabelMock();

    return (
      <div data-testid='mock-lesson-docs'>
        {backButtonLabel ? (
          <button
            type='button'
            data-kangur-lesson-back='true'
            data-kangur-lesson-back-label={backButtonLabel}
            onClick={() => lessonDocumentBackClickMock()}
          >
            {backButtonLabel}
          </button>
        ) : null}
      </div>
    );
  },
}));

vi.mock('@/features/kangur/ui/components/KangurLessonNavigationWidget', () => ({
  KangurLessonNavigationWidget: () => <div data-testid='mock-lesson-navigation' />,
}));

vi.mock('@/features/kangur/ui/context/KangurLessonNavigationContext', () => ({
  KangurLessonNavigationProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/features/kangur/ui/design/primitives', () => ({
  KangurButton: ({
    children,
    fullWidth: _fullWidth,
    size: _size,
    variant: _variant,
    ...props
  }: {
    children: React.ReactNode;
    fullWidth?: boolean;
    size?: string;
    variant?: string;
  }) => (
    <button type='button' {...props}>
      {children}
    </button>
  ),
  KangurGlassPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  KangurIconBadge: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  KangurOptionCardButton: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button type='button' {...props}>
      {children}
    </button>
  ),
  KangurStatusChip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  KangurSummaryPanel: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurMobileBreakpoint', () => ({
  useKangurMobileBreakpoint: () => useKangurMobileBreakpointMock(),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: () => ({ entry: null }),
}));

vi.mock('@/features/kangur/ui/context/KangurAgeGroupFocusContext', () => ({
  useKangurAgeGroupFocus: () => ({
    ageGroup: ageGroupState.value,
    setAgeGroup: vi.fn(),
  }),
}));

vi.mock('@/features/kangur/ui/pages/lessons/LessonsContext', () => ({
  useLessons: () => useLessonsMock(),
}));

import { ActiveLessonView } from '@/features/kangur/ui/pages/lessons/Lessons.ActiveLesson';

const splitClasses = (className: string): string[] => className.trim().split(/\s+/);

const activeLesson = {
  id: 'lesson-1',
  componentId: 'adding',
  title: 'Lesson 1',
  contentMode: 'document',
};

const nextLesson = {
  id: 'lesson-2',
  componentId: 'adding',
  title: 'Lesson 2',
  contentMode: 'document',
};

describe('ActiveLessonView mobile controls', () => {
  let activeLessonContentRef: React.RefObject<HTMLDivElement>;
  let handleSelectLesson: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    ageGroupState.value = 'ten_year_old';
    useKangurMobileBreakpointMock.mockReturnValue(true);
    lessonDocumentBackButtonLabelMock.mockReturnValue(null);
    lessonDocumentBackClickMock.mockReset();
    activeLesson.contentMode = 'document';
    nextLesson.contentMode = 'document';
    Object.keys(lessonComponentsMock).forEach((key) => {
      delete lessonComponentsMock[key];
    });
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    activeLessonContentRef = React.createRef<HTMLDivElement>();
    handleSelectLesson = vi.fn();

    useLessonsMock.mockReturnValue({
      activeLesson,
      handleSelectLesson,
      lessonDocuments: {},
      lessonAssignmentsByComponent: new Map(),
      completedLessonAssignmentsByComponent: new Map(),
      setIsActiveLessonComponentReady: vi.fn(),
      activeLessonHeaderRef: React.createRef<HTMLDivElement>(),
      activeLessonNavigationRef: React.createRef<HTMLDivElement>(),
      activeLessonContentRef,
      activeLessonScrollRef: React.createRef<HTMLDivElement>(),
      orderedLessons: [activeLesson, nextLesson],
      isSecretLessonActive: false,
      progress: { lessonMastery: {} },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('keeps native page scroll on mobile while showing the back control', async () => {
    const { unmount } = render(<ActiveLessonView />);

    await act(async () => {});

    const backToLessonsButton = screen.getByRole('button', { name: 'Wróć do lekcji' });

    expect(backToLessonsButton).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Przewiń w górę' })).toBeNull();
    const topControls = screen.getByTestId('kangur-lesson-top-controls');
    const activeLessonTransition = screen.getByTestId('lessons-active-transition');

    expect(activeLessonTransition.contains(topControls)).toBe(true);
    expect(screen.getByTestId('mock-lesson-navigation').parentElement).toHaveClass(
      ...splitClasses(LESSONS_ACTIVE_SECTION_CLASSNAME)
    );
    expect(screen.queryByTestId('kangur-lesson-scroll-container')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Przewiń w dół' })).toBeNull();
    expect(document.documentElement.style.overflow).toBe('');
    expect(document.body.style.overflow).toBe('');

    fireEvent.click(backToLessonsButton);
    expect(handleSelectLesson).toHaveBeenCalledWith(null);

    unmount();

    expect(document.documentElement.style.overflow).toBe('');
    expect(document.body.style.overflow).toBe('');
  });

  it('uses an icon-first back control for six-year-old mobile lessons', async () => {
    ageGroupState.value = 'six_year_old';

    render(<ActiveLessonView />);

    await act(async () => {});

    expect(screen.getByRole('button', { name: 'Wróć do lekcji' })).toBeInTheDocument();
    expect(screen.getByTestId('kangur-lesson-back-to-lessons-detail')).toHaveTextContent('🏠');
  });

  it('returns to the lessons list from the header even when in-content back is available', async () => {
    const { rerender } = render(<ActiveLessonView />);
    useKangurMobileBreakpointMock.mockReturnValue(false);
    rerender(<ActiveLessonView />);

    await act(async () => {});
    const inContentBackButton = document.createElement('button');
    inContentBackButton.type = 'button';
    inContentBackButton.dataset.kangurLessonBack = 'true';
    const inContentBackClick = vi.fn();
    inContentBackButton.addEventListener('click', inContentBackClick);
    activeLessonContentRef.current?.appendChild(inContentBackButton);

    const headerBackButton = screen.getByRole('button', { name: 'Wróć do listy lekcji' });
    fireEvent.click(headerBackButton);

    expect(inContentBackClick).not.toHaveBeenCalled();
    expect(handleSelectLesson).toHaveBeenCalledWith(null);
  });

  it('falls back to listing lesson when no in-content back button is available', async () => {
    useKangurMobileBreakpointMock.mockReturnValue(false);
    render(<ActiveLessonView />);
    await act(async () => {});

    const headerBackButton = screen.getByRole('button', { name: 'Wróć do listy lekcji' });
    fireEvent.click(headerBackButton);

    expect(handleSelectLesson).toHaveBeenCalledWith(null);
  });

  it('does not break hook order when the active lesson becomes null after a rerender', async () => {
    useKangurMobileBreakpointMock.mockReturnValue(false);

    let currentActiveLesson: typeof activeLesson | null = activeLesson;

    useLessonsMock.mockImplementation(() => ({
      activeLesson: currentActiveLesson,
      handleSelectLesson,
      lessonDocuments: {},
      lessonAssignmentsByComponent: new Map(),
      completedLessonAssignmentsByComponent: new Map(),
      setIsActiveLessonComponentReady: vi.fn(),
      activeLessonHeaderRef: React.createRef<HTMLDivElement>(),
      activeLessonNavigationRef: React.createRef<HTMLDivElement>(),
      activeLessonContentRef,
      activeLessonScrollRef: React.createRef<HTMLDivElement>(),
      orderedLessons: [activeLesson, nextLesson],
      isSecretLessonActive: false,
      progress: { lessonMastery: {} },
    }));

    const { rerender } = render(<ActiveLessonView />);
    await act(async () => {});

    currentActiveLesson = null;

    expect(() => {
      rerender(<ActiveLessonView />);
    }).not.toThrow();
  });

  it('keeps rendering the latched lesson snapshot while the live active lesson clears', async () => {
    useKangurMobileBreakpointMock.mockReturnValue(false);

    let currentActiveLesson: typeof activeLesson | null = activeLesson;

    useLessonsMock.mockImplementation(() => ({
      activeLesson: currentActiveLesson,
      handleSelectLesson,
      lessonDocuments: {},
      lessonAssignmentsByComponent: new Map(),
      completedLessonAssignmentsByComponent: new Map(),
      setIsActiveLessonComponentReady: vi.fn(),
      activeLessonHeaderRef: React.createRef<HTMLDivElement>(),
      activeLessonNavigationRef: React.createRef<HTMLDivElement>(),
      activeLessonContentRef,
      activeLessonScrollRef: React.createRef<HTMLDivElement>(),
      orderedLessons: [activeLesson, nextLesson],
      isSecretLessonActive: false,
      progress: { lessonMastery: {} },
      isActiveLessonDocumentLoading: false,
    }));

    const snapshot = {
      activeLesson,
      activeLessonId: activeLesson.id,
      lessonDocuments: {},
      lessonAssignmentsByComponent: new Map(),
      completedLessonAssignmentsByComponent: new Map(),
      orderedLessons: [activeLesson, nextLesson],
      isSecretLessonActive: false,
      progress: { lessonMastery: {} },
      isActiveLessonDocumentLoading: false,
    };

    const { rerender } = render(<ActiveLessonView snapshot={snapshot} />);
    await act(async () => {});

    currentActiveLesson = null;
    rerender(<ActiveLessonView snapshot={snapshot} />);

    expect(screen.getByTestId('active-lesson-header')).toBeInTheDocument();
    expect(screen.getByTestId('lessons-active-transition')).toBeInTheDocument();
  });

  it('uses the in-content back action from the mobile lesson controls when available', async () => {
    activeLesson.contentMode = 'component';
    lessonComponentsMock[activeLesson.componentId] = () => (
      <button
        type='button'
        data-kangur-lesson-back='true'
        data-kangur-lesson-back-label='Wróć do tematow'
        onClick={() => lessonDocumentBackClickMock()}
      >
        Wróć do tematow
      </button>
    );
    render(<ActiveLessonView />);

    await act(async () => {});
    const mobileBackButton = screen.getByRole('button', { name: 'Wróć do lekcji' });

    fireEvent.click(mobileBackButton);

    expect(lessonDocumentBackClickMock).toHaveBeenCalledTimes(1);
    expect(handleSelectLesson).not.toHaveBeenCalled();
  });

  it('keeps lesson hubs centered on the same active lesson shell as the navigation', async () => {
    activeLesson.contentMode = 'component';
    activeLesson.componentId = 'hub_lesson';
    lessonComponentsMock.hub_lesson = () => (
      <LessonHub
        gradientClass='kangur-gradient-accent-indigo'
        lessonEmoji='🧩'
        lessonTitle='Angielski: składnia zdania'
        onBack={vi.fn()}
        onSelect={vi.fn()}
        sections={[
          {
            id: 'order',
            emoji: '🔤',
            title: 'Order',
            description: 'Ćwicz szyk zdania.',
          },
          {
            id: 'blue-print',
            emoji: '🗂️',
            title: 'Blue print',
            description: 'Połącz pytania i odpowiedzi.',
          },
        ]}
      />
    );

    render(<ActiveLessonView />);

    await act(async () => {});

    expect(screen.getByTestId('mock-lesson-navigation').parentElement).toHaveClass(
      ...splitClasses(LESSONS_ACTIVE_SECTION_CLASSNAME)
    );

    const hubList = screen.getByRole('list');
    expect(hubList).toHaveClass(...splitClasses(LESSONS_ACTIVE_HUB_COLUMN_CLASSNAME));
    for (const item of screen.getAllByRole('listitem')) {
      expect(item).toHaveClass('w-full');
    }
  });
});
