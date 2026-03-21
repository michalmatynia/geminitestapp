/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@/__tests__/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useLessonsMock,
  useKangurMobileBreakpointMock,
  lessonDocumentBackButtonLabelMock,
  lessonDocumentBackClickMock,
  lessonComponentsMock,
} = vi.hoisted(() => ({
  useLessonsMock: vi.fn(),
  useKangurMobileBreakpointMock: vi.fn(),
  lessonDocumentBackButtonLabelMock: vi.fn(() => null),
  lessonDocumentBackClickMock: vi.fn(),
  lessonComponentsMock: {} as Record<string, React.ComponentType<unknown>>,
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
        Wroc do listy lekcji
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
  KangurStatusChip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  KangurSummaryPanel: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock('@/features/kangur/ui/design/tokens', () => ({
  KANGUR_PANEL_GAP_CLASSNAME: 'gap',
}));

vi.mock('@/features/kangur/ui/hooks/useKangurMobileBreakpoint', () => ({
  useKangurMobileBreakpoint: () => useKangurMobileBreakpointMock(),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: () => ({ entry: null }),
}));

vi.mock('@/features/kangur/ui/pages/lessons/LessonsContext', () => ({
  useLessons: () => useLessonsMock(),
}));

import { ActiveLessonView } from '@/features/kangur/ui/pages/lessons/Lessons.ActiveLesson';

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

describe('ActiveLessonView mobile scroll controls', () => {
  let activeLessonContentRef: React.RefObject<HTMLDivElement>;
  let handleSelectLesson: ReturnType<typeof vi.fn>;

  beforeEach(() => {
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

  it('locks vertical scroll and toggles arrow controls on mobile', async () => {
    const { unmount } = render(<ActiveLessonView />);

    await act(async () => {});

    const scrollContainer = screen.getByTestId('kangur-lesson-scroll-container') as HTMLDivElement;
    expect(scrollContainer.parentElement?.className).toContain(
      'var(--kangur-shell-viewport-height,100dvh)-var(--kangur-top-bar-height,88px)'
    );
    expect(scrollContainer.className).toContain('touch-pan-y');
    expect(scrollContainer.className).not.toContain('touch-none');
    Object.defineProperty(scrollContainer, 'clientHeight', { value: 100, configurable: true });
    Object.defineProperty(scrollContainer, 'scrollHeight', { value: 400, configurable: true });
    scrollContainer.scrollTop = 0;

    await act(async () => {
      scrollContainer.dispatchEvent(new Event('scroll'));
    });

    const scrollByMock = vi.fn();
    const scrollToMock = vi.fn();
    scrollContainer.scrollBy = scrollByMock;
    scrollContainer.scrollTo = scrollToMock;

    const downButton = screen.getByRole('button', { name: 'Przewiń w dół' });
    expect(downButton.className).toContain(
      'var(--kangur-mobile-bottom-clearance,env(safe-area-inset-bottom))'
    );

    fireEvent.click(downButton);

    expect(scrollByMock).toHaveBeenCalledWith(
      expect.objectContaining({ top: 240, behavior: 'smooth' })
    );

    expect(screen.queryByRole('button', { name: 'Przewiń w górę' })).toBeNull();

    scrollContainer.scrollTop = 200;
    await act(async () => {
      scrollContainer.dispatchEvent(new Event('scroll'));
    });

    const upButton = screen.getByRole('button', { name: 'Przewiń w górę' });
    const topControls = screen.getByTestId('kangur-lesson-top-controls');

    expect(scrollContainer.contains(topControls)).toBe(true);

    fireEvent.click(upButton);
    expect(scrollByMock).toHaveBeenCalledWith(
      expect.objectContaining({ top: -240, behavior: 'smooth' })
    );

    scrollContainer.scrollTop = 300;
    await act(async () => {
      scrollContainer.dispatchEvent(new Event('scroll'));
    });

    expect(screen.queryByRole('button', { name: 'Przewiń w dół' })).toBeNull();

    expect(document.documentElement.style.overflow).toBe('hidden');
    expect(document.body.style.overflow).toBe('hidden');

    unmount();

    expect(document.documentElement.style.overflow).toBe('');
    expect(document.body.style.overflow).toBe('');
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

    const headerBackButton = screen.getByRole('button', { name: 'Wroc do listy lekcji' });
    fireEvent.click(headerBackButton);

    expect(inContentBackClick).not.toHaveBeenCalled();
    expect(handleSelectLesson).toHaveBeenCalledWith(null);
  });

  it('falls back to listing lesson when no in-content back button is available', async () => {
    useKangurMobileBreakpointMock.mockReturnValue(false);
    render(<ActiveLessonView />);
    await act(async () => {});

    const headerBackButton = screen.getByRole('button', { name: 'Wroc do listy lekcji' });
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

  it('uses the in-content back action from the mobile lesson controls when available', async () => {
    activeLesson.contentMode = 'component';
    lessonComponentsMock[activeLesson.componentId] = () => (
      <button
        type='button'
        data-kangur-lesson-back='true'
        data-kangur-lesson-back-label='Wroc do tematow'
        onClick={() => lessonDocumentBackClickMock()}
      >
        Wroc do tematow
      </button>
    );
    render(<ActiveLessonView />);

    await act(async () => {});
    const mobileBackButton = document.querySelector('button[title="Wroc do tematow"]');
    expect(mobileBackButton).toBeInstanceOf(HTMLButtonElement);

    fireEvent.click(mobileBackButton as HTMLButtonElement);

    expect(lessonDocumentBackClickMock).toHaveBeenCalledTimes(1);
    expect(handleSelectLesson).not.toHaveBeenCalled();
  });
});
