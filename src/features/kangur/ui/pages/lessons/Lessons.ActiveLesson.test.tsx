/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@/__tests__/test-utils';
import { render as rtlRender } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LessonHub from '@/features/kangur/ui/components/LessonHub';
import { useOptionalKangurLessonPrint } from '@/features/kangur/ui/context/KangurLessonPrintContext';
import {
  LESSONS_ACTIVE_HUB_COLUMN_CLASSNAME,
  LESSONS_ACTIVE_SECTION_CLASSNAME,
} from '@/features/kangur/ui/pages/lessons/Lessons.constants';
import enMessages from '@/i18n/messages/en.json';

vi.mock('next-intl', async () => await vi.importActual<typeof import('next-intl')>('next-intl'));
vi.mock('use-intl', async () => await vi.importActual<typeof import('use-intl')>('use-intl'));

const {
  useLessonsMock,
  useKangurMobileBreakpointMock,
  useKangurTutorAnchorMock,
  hasKangurLessonDocumentContentMock,
  lessonDocumentBackButtonLabelMock,
  lessonDocumentBackClickMock,
  lessonComponentsMock,
} = vi.hoisted(() => ({
  useLessonsMock: vi.fn(),
  useKangurMobileBreakpointMock: vi.fn(),
  useKangurTutorAnchorMock: vi.fn(),
  hasKangurLessonDocumentContentMock: vi.fn(() => true),
  lessonDocumentBackButtonLabelMock: vi.fn(() => null),
  lessonDocumentBackClickMock: vi.fn(),
  lessonComponentsMock: {} as Record<string, React.ComponentType<unknown>>,
}));

vi.mock('@/features/kangur/lesson-documents', () => ({
  hasKangurLessonDocumentContent: (...args: unknown[]) =>
    hasKangurLessonDocumentContentMock(...args),
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
  KangurSummaryPanel: ({
    accent: _accent,
    align: _align,
    label: _label,
    labelAccent: _labelAccent,
    tone: _tone,
    title,
    ...props
  }: {
    accent?: string;
    align?: string;
    label?: string;
    labelAccent?: string;
    tone?: string;
    title: string;
  } & React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{title}</div>,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurMobileBreakpoint', () => ({
  useKangurMobileBreakpoint: () => useKangurMobileBreakpointMock(),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: () => ({ entry: null }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurTutorAnchor', () => ({
  useKangurTutorAnchor: (...args: unknown[]) => useKangurTutorAnchorMock(...args),
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
    useKangurMobileBreakpointMock.mockReturnValue(true);
    useKangurTutorAnchorMock.mockReset();
    hasKangurLessonDocumentContentMock.mockReturnValue(true);
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

    Object.defineProperty(window, 'print', {
      configurable: true,
      writable: true,
      value: vi.fn(() => {
        window.dispatchEvent(new Event('afterprint'));
      }),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('keeps native page scroll on mobile while showing the back control', async () => {
    const { unmount } = render(<ActiveLessonView />);

    await act(async () => {});

    const backToLessonsButton = screen.getByRole('button', { name: 'Wróć do lekcji' });

    expect(backToLessonsButton).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Przewiń w górę' })).toBeNull();
    const topControls = screen.getByTestId('kangur-lesson-top-controls');
    const activeLessonTransition = screen.getByTestId('lessons-active-transition');
    const printRoot = screen.getByTestId('kangur-lesson-print-root');
    const printHeading = screen.getByTestId('kangur-lesson-print-heading');
    const printBrand = screen.getByTestId('kangur-lesson-print-brand');
    const printBrandLogo = screen.getByTestId('kangur-lesson-print-brand-logo');

    expect(activeLessonTransition.contains(topControls)).toBe(true);
    expect(topControls).toHaveAttribute('data-kangur-print-exclude', 'true');
    expect(screen.getByTestId('mock-lesson-navigation').parentElement).toHaveClass(
      ...splitClasses(LESSONS_ACTIVE_SECTION_CLASSNAME)
    );
    expect(screen.getByTestId('mock-lesson-navigation').parentElement).toHaveAttribute(
      'data-kangur-print-exclude',
      'true'
    );
    expect(printRoot).toHaveAttribute('data-kangur-print-root', 'true');
    expect(printRoot.contains(printHeading)).toBe(true);
    expect(printHeading).toHaveAttribute('data-kangur-print-masthead', 'true');
    expect(printRoot.contains(printBrand)).toBe(true);
    expect(printBrand).toHaveAttribute('data-kangur-print-brand', 'true');
    expect(printBrand).toHaveAttribute('aria-label', 'StudiQ');
    expect(printBrandLogo.querySelector('svg')).not.toBeNull();
    expect(printHeading).toHaveTextContent('Lekcje');
    expect(printHeading).toHaveTextContent('Lesson 1');
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

  it('renders the loading document fallback title in English on the English route', async () => {
    useKangurMobileBreakpointMock.mockReturnValue(false);
    hasKangurLessonDocumentContentMock.mockReturnValue(false);
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
      isActiveLessonDocumentLoading: true,
    });

    rtlRender(
      <NextIntlClientProvider locale='en' messages={enMessages} onError={() => {}}>
        <ActiveLessonView />
      </NextIntlClientProvider>
    );

    await act(async () => {});

    expect(screen.getByTestId('lessons-loading-document-summary')).toHaveTextContent(
      'Loading material'
    );
    expect(screen.getByTestId('kangur-lesson-print-heading')).toHaveTextContent('Lessons');
  });

  it('registers lesson tutor anchors so selected text can resolve to the lesson knowledge base', async () => {
    useKangurMobileBreakpointMock.mockReturnValue(false);
    useLessonsMock.mockReturnValue({
      activeLesson,
      handleSelectLesson,
      lessonDocuments: {},
      lessonAssignmentsByComponent: new Map([[activeLesson.componentId, { id: 'assignment-1' }]]),
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

    render(<ActiveLessonView />);

    await act(async () => {});

    expect(useKangurTutorAnchorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'kangur-lesson-header',
        kind: 'lesson_header',
        surface: 'lesson',
        enabled: true,
        metadata: expect.objectContaining({
          contentId: 'lesson-1',
          assignmentId: 'assignment-1',
        }),
      })
    );
    expect(useKangurTutorAnchorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'kangur-lesson-assignment',
        kind: 'assignment',
        surface: 'lesson',
        enabled: true,
        metadata: expect.objectContaining({
          contentId: 'lesson-1',
          assignmentId: 'assignment-1',
        }),
      })
    );
    expect(useKangurTutorAnchorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'kangur-lesson-navigation',
        kind: 'navigation',
        surface: 'lesson',
        enabled: true,
        metadata: expect.objectContaining({
          contentId: 'lesson-1',
          assignmentId: 'assignment-1',
        }),
      })
    );
    expect(useKangurTutorAnchorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'kangur-lesson-document',
        kind: 'document',
        surface: 'lesson',
        enabled: true,
        metadata: expect.objectContaining({
          contentId: 'lesson-1',
          assignmentId: 'assignment-1',
        }),
      })
    );
  });

  it('marks the lesson content as the printable root and only toggles print mode around lesson printing', async () => {
    activeLesson.contentMode = 'component';
    document.title = 'Kangur app';
    let titleDuringPrint = '';
    Object.defineProperty(window, 'print', {
      configurable: true,
      writable: true,
      value: vi.fn(() => {
        titleDuringPrint = document.title;
        window.dispatchEvent(new Event('afterprint'));
      }),
    });
    lessonComponentsMock[activeLesson.componentId] = () => {
      const lessonPrint = useOptionalKangurLessonPrint();

      return lessonPrint?.onPrintPanel ? (
        <button
          type='button'
          data-testid='mock-nested-lesson-print-button'
          onClick={lessonPrint.onPrintPanel}
        >
          Drukuj panel lekcji
        </button>
      ) : null;
    };

    render(<ActiveLessonView />);

    await act(async () => {});

    expect(document.body.classList.contains('kangur-print-mode')).toBe(false);
    expect(screen.getByTestId('kangur-lesson-print-root')).toHaveAttribute(
      'data-kangur-print-root',
      'true'
    );
    expect(screen.getByTestId('kangur-lesson-print-brand-logo').querySelector('svg')).not.toBeNull();
    expect(screen.getByTestId('kangur-lesson-print-heading')).toHaveTextContent('Lesson 1');

    fireEvent.click(screen.getByTestId('mock-nested-lesson-print-button'));

    expect(window.print).toHaveBeenCalledTimes(1);
    expect(titleDuringPrint).toBe('StudiQ - Lesson 1');
    expect(document.body.classList.contains('kangur-print-mode')).toBe(false);
    expect(document.title).toBe('Kangur app');
  });

  it('provides the shared print action to nested lesson panels', async () => {
    activeLesson.contentMode = 'component';
    lessonComponentsMock[activeLesson.componentId] = () => {
      const lessonPrint = useOptionalKangurLessonPrint();

      return lessonPrint?.onPrintPanel ? (
        <button
          type='button'
          data-testid='mock-nested-lesson-print-button'
          onClick={lessonPrint.onPrintPanel}
        >
          Drukuj panel lekcji
        </button>
      ) : null;
    };

    render(<ActiveLessonView />);

    await act(async () => {});

    fireEvent.click(screen.getByTestId('mock-nested-lesson-print-button'));

    expect(window.print).toHaveBeenCalledTimes(1);
  });

  it('targets a nested lesson panel and uses its title in the print document title', async () => {
    activeLesson.contentMode = 'component';
    let printRoot: HTMLElement | null = null;
    let firstPanel: HTMLElement | null = null;
    let secondPanel: HTMLElement | null = null;
    let titleDuringPrint = '';
    let targetedDuringPrint: string | undefined;
    let firstSelectedDuringPrint: string | undefined;
    let secondSelectedDuringPrint: string | undefined;
    let secondTargetedDuringPrint: string | undefined;

    Object.defineProperty(window, 'print', {
      configurable: true,
      writable: true,
      value: vi.fn(() => {
        titleDuringPrint = document.title;
        targetedDuringPrint = printRoot?.dataset.kangurPrintTargeted;
        firstSelectedDuringPrint = firstPanel?.dataset.kangurPrintPanelSelected;
        secondSelectedDuringPrint = secondPanel?.dataset.kangurPrintPanelSelected;
        secondTargetedDuringPrint = secondPanel?.dataset.kangurPrintTargetPanel;
        window.dispatchEvent(new Event('afterprint'));
      }),
    });

    lessonComponentsMock[activeLesson.componentId] = () => {
      const lessonPrint = useOptionalKangurLessonPrint();

      return (
        <div>
          <button
            type='button'
            data-testid='mock-targeted-lesson-print-button'
            onClick={() => lessonPrint?.onPrintPanel?.('panel-two')}
          >
            Drukuj drugi panel
          </button>
          <section
            data-kangur-print-panel='true'
            data-kangur-print-panel-id='panel-one'
            data-kangur-print-panel-title='Panel One'
            data-testid='mock-panel-one'
          >
            Panel one
          </section>
          <section
            data-kangur-print-panel='true'
            data-kangur-print-panel-id='panel-two'
            data-kangur-print-panel-title='Panel Two'
            data-testid='mock-panel-two'
          >
            Panel two
          </section>
        </div>
      );
    };

    render(<ActiveLessonView />);

    await act(async () => {});

    printRoot = screen.getByTestId('kangur-lesson-print-root');
    firstPanel = screen.getByTestId('mock-panel-one');
    secondPanel = screen.getByTestId('mock-panel-two');

    fireEvent.click(screen.getByTestId('mock-targeted-lesson-print-button'));

    expect(window.print).toHaveBeenCalledTimes(1);
    expect(titleDuringPrint).toBe('StudiQ - Lesson 1 - Panel Two');
    expect(targetedDuringPrint).toBe('true');
    expect(firstSelectedDuringPrint).toBe('false');
    expect(secondSelectedDuringPrint).toBe('true');
    expect(secondTargetedDuringPrint).toBe('true');
    expect(printRoot).not.toHaveAttribute('data-kangur-print-targeted');
    expect(firstPanel).not.toHaveAttribute('data-kangur-print-panel-selected');
    expect(secondPanel).not.toHaveAttribute('data-kangur-print-panel-selected');
    expect(secondPanel).not.toHaveAttribute('data-kangur-print-target-panel');
  });

  it('keeps a parent print panel visible when targeting a nested child panel', async () => {
    activeLesson.contentMode = 'component';
    let parentPanel: HTMLElement | null = null;
    let childPanel: HTMLElement | null = null;
    let parentSelectedDuringPrint: string | undefined;
    let childSelectedDuringPrint: string | undefined;

    Object.defineProperty(window, 'print', {
      configurable: true,
      writable: true,
      value: vi.fn(() => {
        parentSelectedDuringPrint = parentPanel?.dataset.kangurPrintPanelSelected;
        childSelectedDuringPrint = childPanel?.dataset.kangurPrintPanelSelected;
        window.dispatchEvent(new Event('afterprint'));
      }),
    });

    lessonComponentsMock[activeLesson.componentId] = () => {
      const lessonPrint = useOptionalKangurLessonPrint();

      return (
        <section
          data-kangur-print-panel='true'
          data-kangur-print-panel-id='parent-panel'
          data-kangur-print-panel-title='Parent Panel'
          data-testid='mock-parent-panel'
        >
          <button
            type='button'
            data-testid='mock-child-targeted-print-button'
            onClick={() => lessonPrint?.onPrintPanel?.('child-panel')}
          >
            Drukuj child panel
          </button>
          <div
            data-kangur-print-panel='true'
            data-kangur-print-panel-id='child-panel'
            data-kangur-print-panel-title='Child Panel'
            data-testid='mock-child-panel'
          >
            Child panel
          </div>
        </section>
      );
    };

    render(<ActiveLessonView />);

    await act(async () => {});

    parentPanel = screen.getByTestId('mock-parent-panel');
    childPanel = screen.getByTestId('mock-child-panel');

    fireEvent.click(screen.getByTestId('mock-child-targeted-print-button'));

    expect(window.print).toHaveBeenCalledTimes(1);
    expect(parentSelectedDuringPrint).toBe('true');
    expect(childSelectedDuringPrint).toBe('true');
    expect(parentPanel).not.toHaveAttribute('data-kangur-print-panel-selected');
    expect(childPanel).not.toHaveAttribute('data-kangur-print-panel-selected');
  });

  it('cleans up print mode when browser focus returns without an afterprint event', async () => {
    activeLesson.contentMode = 'component';
    vi.useFakeTimers();
    Object.defineProperty(window, 'print', {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
    lessonComponentsMock[activeLesson.componentId] = () => {
      const lessonPrint = useOptionalKangurLessonPrint();

      return lessonPrint?.onPrintPanel ? (
        <button
          type='button'
          data-testid='mock-nested-lesson-print-button'
          onClick={lessonPrint.onPrintPanel}
        >
          Drukuj panel lekcji
        </button>
      ) : null;
    };

    render(<ActiveLessonView />);

    await act(async () => {});

    fireEvent.click(screen.getByTestId('mock-nested-lesson-print-button'));

    expect(window.print).toHaveBeenCalledTimes(1);
    expect(document.body.classList.contains('kangur-print-mode')).toBe(true);

    window.dispatchEvent(new Event('focus'));
    await act(async () => {
      vi.runAllTimers();
    });

    expect(document.body.classList.contains('kangur-print-mode')).toBe(false);
  });

  it('hides the print action while a document lesson is still loading', async () => {
    hasKangurLessonDocumentContentMock.mockReturnValue(false);
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
      isActiveLessonDocumentLoading: true,
    });

    render(<ActiveLessonView />);

    await act(async () => {});

    expect(screen.getByTestId('lessons-loading-document-summary')).toHaveAttribute(
      'data-kangur-print-exclude',
      'true'
    );
    expect(screen.queryByRole('button', { name: /drukuj/i })).toBeNull();
  });

  it('hides the print action when a document lesson has no saved content', async () => {
    hasKangurLessonDocumentContentMock.mockReturnValue(false);
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
      isActiveLessonDocumentLoading: false,
    });

    render(<ActiveLessonView />);

    await act(async () => {});

    expect(screen.getByTestId('lessons-empty-document-summary')).toHaveAttribute(
      'data-kangur-print-exclude',
      'true'
    );
    expect(screen.queryByRole('button', { name: /drukuj/i })).toBeNull();
  });

  it('uses an icon-only back control for mobile lessons', async () => {
    render(<ActiveLessonView />);

    await act(async () => {});

    const backToLessonsButton = screen.getByRole('button', { name: 'Wróć do lekcji' });
    expect(backToLessonsButton).toBeInTheDocument();
    expect(backToLessonsButton).not.toHaveTextContent('Wróć do lekcji');
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
