/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@/__tests__/test-utils';
import { render as rtlRender } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LessonActivityShell from '@/features/kangur/ui/components/lesson-runtime/LessonActivityShell';
import { useOptionalKangurLessonPrint } from '@/features/kangur/ui/context/KangurLessonPrintContext';
import enMessages from '@/i18n/messages/en.json';

vi.mock('next-intl', async () => await vi.importActual<typeof import('next-intl')>('next-intl'));
vi.mock('use-intl', async () => await vi.importActual<typeof import('use-intl')>('use-intl'));

const {
  useLessonsMock,
  useKangurLessonDocumentMock,
  useKangurLessonTemplateMock,
  useKangurMobileBreakpointMock,
  useKangurTutorAnchorMock,
  hasKangurLessonDocumentContentMock,
  lessonDocumentBackButtonLabelMock,
  lessonDocumentBackClickMock,
  lessonDocumentRendererContentMock,
  lessonComponentsMock,
} = vi.hoisted(() => ({
  useLessonsMock: vi.fn(),
  useKangurLessonDocumentMock: vi.fn(),
  useKangurLessonTemplateMock: vi.fn(),
  useKangurMobileBreakpointMock: vi.fn(),
  useKangurTutorAnchorMock: vi.fn(),
  hasKangurLessonDocumentContentMock: vi.fn(() => true),
  lessonDocumentBackButtonLabelMock: vi.fn(() => null),
  lessonDocumentBackClickMock: vi.fn(),
  lessonDocumentRendererContentMock: vi.fn(() => null),
  lessonComponentsMock: {} as Record<string, React.ComponentType<unknown>>,
}));
const emptyPageContentEntryMock = vi.hoisted(() => ({ entry: null }));

vi.mock('@/features/kangur/lesson-documents', () => ({
  hasKangurLessonDocumentContent: (...args: unknown[]) =>
    hasKangurLessonDocumentContentMock(...args),
}));

vi.mock('@/features/kangur/lessons/lesson-ui-registry', () => ({
  LESSON_COMPONENTS: lessonComponentsMock,
}));

vi.mock('@/features/kangur/ui/components/lesson-runtime/KangurActiveLessonHeader', () => ({
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

vi.mock('@/features/kangur/ui/components/lesson-runtime/KangurLessonDocumentRenderer', () => ({
  KangurLessonDocumentRenderer: () => {
    const backButtonLabel = lessonDocumentBackButtonLabelMock();
    const customContent = lessonDocumentRendererContentMock();

    if (customContent) {
      return <>{customContent}</>;
    }

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

vi.mock('@/features/kangur/ui/components/lesson-runtime/KangurLessonNavigationWidget', () => ({
  KangurLessonNavigationWidget: () => <div data-testid='mock-lesson-navigation' />,
}));

vi.mock('@/features/kangur/ui/context/KangurLessonNavigationContext', () => ({
  KangurLessonNavigationProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useKangurLessonSecretPill: () => null,
  useKangurRegisterLessonSubsectionNavigation: () => () => () => {},
  useKangurSyncLessonSubsectionSummary: () => {},
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
  KangurGlassPanel: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
  } & React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  KangurHeadline: ({
    as: Component = 'div',
    children,
    ...props
  }: {
    as?: keyof JSX.IntrinsicElements;
    children: React.ReactNode;
  } & React.HTMLAttributes<HTMLElement>) => <Component {...props}>{children}</Component>,
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
  useKangurPageContentEntry: () => emptyPageContentEntryMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLessons', () => ({
  useKangurLessonDocument: (...args: unknown[]) => useKangurLessonDocumentMock(...args),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLessonTemplates', () => ({
  useKangurLessonTemplate: (...args: unknown[]) => useKangurLessonTemplateMock(...args),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurTutorAnchor', () => ({
  useKangurTutorAnchor: (...args: unknown[]) => useKangurTutorAnchorMock(...args),
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

describe('ActiveLessonView print functionality', () => {
  let activeLessonContentRef: React.RefObject<HTMLDivElement>;
  let handleSelectLesson: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    useKangurMobileBreakpointMock.mockReturnValue(true);
    useKangurTutorAnchorMock.mockReset();
    useKangurLessonDocumentMock.mockReset();
    useKangurLessonDocumentMock.mockReturnValue({
      data: {},
      isPending: false,
      isLoading: false,
      isFetching: false,
      isRefetching: false,
    });
    useKangurLessonTemplateMock.mockReset();
    useKangurLessonTemplateMock.mockReturnValue({
      data: null,
    });
    hasKangurLessonDocumentContentMock.mockReturnValue(true);
    lessonDocumentBackButtonLabelMock.mockReturnValue(null);
    lessonDocumentBackClickMock.mockReset();
    lessonDocumentRendererContentMock.mockReset();
    lessonDocumentRendererContentMock.mockReturnValue(null);
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
      lessonTemplateMap: new Map(),
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

  it('prefers lesson template copy from Mongo in the printable heading', async () => {
    useLessonsMock.mockReturnValue({
      activeLesson,
      handleSelectLesson,
      lessonDocuments: {},
      lessonTemplateMap: new Map(),
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
    useKangurLessonTemplateMock.mockReturnValue({
      data: {
        componentId: 'adding',
        subject: 'maths',
        label: 'Dodawanie z bazy',
        title: 'Dodawanie z bazy',
        description: 'Opis lekcji z bazy',
        emoji: '➕',
        color: 'from-sky-500 to-cyan-400',
        activeBg: 'bg-sky-100',
        sortOrder: 1,
      },
    });

    render(<ActiveLessonView />);

    await act(async () => {});

    expect(
      screen.getByRole('heading', { level: 1, name: 'Dodawanie z bazy' })
    ).toBeInTheDocument();
    expect(screen.getByText('Opis lekcji z bazy')).toBeInTheDocument();
    expect(useKangurLessonTemplateMock).toHaveBeenCalledWith('adding', {
      enabled: true,
    });
  });

  it('renders the loading document fallback title in English on the English route', async () => {
    useKangurMobileBreakpointMock.mockReturnValue(false);
    hasKangurLessonDocumentContentMock.mockReturnValue(false);
    useKangurLessonDocumentMock.mockReturnValue({
      data: undefined,
      isPending: true,
      isLoading: true,
      isFetching: true,
      isRefetching: false,
    });
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

  it('isolates a targeted document lesson panel during printing', async () => {
    activeLesson.contentMode = 'document';
    let printRoot: HTMLElement | null = null;
    let pageWrapper: HTMLElement | null = null;
    let pagePanel: HTMLElement | null = null;
    let titleDuringPrint = '';
    let targetedDuringPrint: string | undefined;
    let wrapperPathDuringPrint: string | undefined;
    let panelSelectedDuringPrint: string | undefined;

    Object.defineProperty(window, 'print', {
      configurable: true,
      writable: true,
      value: vi.fn(() => {
        titleDuringPrint = document.title;
        targetedDuringPrint = printRoot?.dataset.kangurPrintTargeted;
        wrapperPathDuringPrint = pageWrapper?.dataset.kangurPrintTargetPath;
        panelSelectedDuringPrint = pagePanel?.dataset.kangurPrintPanelSelected;
        window.dispatchEvent(new Event('afterprint'));
      }),
    });

    lessonDocumentRendererContentMock.mockImplementation(() => {
      const lessonPrint = useOptionalKangurLessonPrint();

      return (
        <div data-testid='mock-document-page-wrapper'>
          <button
            type='button'
            data-testid='mock-document-page-print-button'
            onClick={() => lessonPrint?.onPrintPanel?.('document-page-2')}
          >
            Drukuj stronę dokumentu
          </button>
          <section
            data-kangur-print-panel='true'
            data-kangur-print-panel-id='document-page-2'
            data-kangur-print-panel-title='Practice page'
            data-testid='mock-document-page-panel'
          >
            Practice page
          </section>
        </div>
      );
    });

    render(<ActiveLessonView />);

    await act(async () => {});

    printRoot = screen.getByTestId('kangur-lesson-print-root');
    pageWrapper = screen.getByTestId('mock-document-page-wrapper');
    pagePanel = screen.getByTestId('mock-document-page-panel');

    fireEvent.click(screen.getByTestId('mock-document-page-print-button'));

    expect(window.print).toHaveBeenCalledTimes(1);
    expect(titleDuringPrint).toBe('StudiQ - Lesson 1 - Practice page');
    expect(targetedDuringPrint).toBe('true');
    expect(wrapperPathDuringPrint).toBe('true');
    expect(panelSelectedDuringPrint).toBe('true');
    expect(printRoot).not.toHaveAttribute('data-kangur-print-targeted');
    expect(pageWrapper).not.toHaveAttribute('data-kangur-print-target-path');
    expect(pagePanel).not.toHaveAttribute('data-kangur-print-panel-selected');
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

  it('routes the lesson shell print button to a nested preferred lesson panel', async () => {
    activeLesson.contentMode = 'component';
    let shellPanel: HTMLElement | null = null;
    let nestedPanel: HTMLElement | null = null;
    let titleDuringPrint = '';
    let shellSelectedDuringPrint: string | undefined;
    let nestedSelectedDuringPrint: string | undefined;
    let nestedTargetedDuringPrint: string | undefined;

    Object.defineProperty(window, 'print', {
      configurable: true,
      writable: true,
      value: vi.fn(() => {
        titleDuringPrint = document.title;
        shellSelectedDuringPrint = shellPanel?.dataset.kangurPrintPanelSelected;
        nestedSelectedDuringPrint = nestedPanel?.dataset.kangurPrintPanelSelected;
        nestedTargetedDuringPrint = nestedPanel?.dataset.kangurPrintTargetPanel;
        window.dispatchEvent(new Event('afterprint'));
      }),
    });

    lessonComponentsMock[activeLesson.componentId] = () => (
      <LessonActivityShell
        accent='indigo'
        icon='🕐'
        onBack={vi.fn()}
        shellTestId='mock-shell-print-panel'
        title='Ćwiczenie: Godziny'
      >
        <section
          data-kangur-print-panel='true'
          data-kangur-print-paged-panel='true'
          data-kangur-print-panel-id='preferred-panel'
          data-kangur-print-panel-title='Preferred Panel'
          data-kangur-print-preferred-target='true'
          data-testid='mock-preferred-print-panel'
        >
          Preferred panel content
        </section>
      </LessonActivityShell>
    );

    render(<ActiveLessonView />);

    await act(async () => {});

    shellPanel = screen.getByTestId('mock-shell-print-panel');
    nestedPanel = screen.getByTestId('mock-preferred-print-panel');

    fireEvent.click(screen.getAllByTestId('lesson-activity-print-button')[0]);

    expect(window.print).toHaveBeenCalledTimes(1);
    expect(titleDuringPrint).toBe('StudiQ - Lesson 1 - Preferred Panel');
    expect(shellSelectedDuringPrint).toBe('true');
    expect(nestedSelectedDuringPrint).toBe('true');
    expect(nestedTargetedDuringPrint).toBe('true');
    expect(shellPanel).not.toHaveAttribute('data-kangur-print-panel-selected');
    expect(nestedPanel).not.toHaveAttribute('data-kangur-print-panel-selected');
    expect(nestedPanel).not.toHaveAttribute('data-kangur-print-target-panel');
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

  it('marks the wrapper path to a targeted lesson panel and cleans it up after printing', async () => {
    activeLesson.contentMode = 'component';
    let wrapper: HTMLElement | null = null;
    let wrapperPathDuringPrint: string | undefined;

    Object.defineProperty(window, 'print', {
      configurable: true,
      writable: true,
      value: vi.fn(() => {
        wrapperPathDuringPrint = wrapper?.dataset.kangurPrintTargetPath;
        window.dispatchEvent(new Event('afterprint'));
      }),
    });

    lessonComponentsMock[activeLesson.componentId] = () => {
      const lessonPrint = useOptionalKangurLessonPrint();

      return (
        <div data-testid='mock-panel-wrapper'>
          <button
            type='button'
            data-testid='mock-wrapped-targeted-print-button'
            onClick={() => lessonPrint?.onPrintPanel?.('wrapped-panel')}
          >
            Drukuj wrapped panel
          </button>
          <section
            data-kangur-print-panel='true'
            data-kangur-print-panel-id='wrapped-panel'
            data-kangur-print-panel-title='Wrapped Panel'
            data-testid='mock-wrapped-panel'
          >
            Wrapped panel
          </section>
        </div>
      );
    };

    render(<ActiveLessonView />);

    await act(async () => {});

    wrapper = screen.getByTestId('mock-panel-wrapper');

    fireEvent.click(screen.getByTestId('mock-wrapped-targeted-print-button'));

    expect(window.print).toHaveBeenCalledTimes(1);
    expect(wrapperPathDuringPrint).toBe('true');
    expect(wrapper).not.toHaveAttribute('data-kangur-print-target-path');
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
    useKangurLessonDocumentMock.mockReturnValue({
      data: undefined,
      isPending: true,
      isLoading: true,
      isFetching: true,
      isRefetching: false,
    });
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
    useKangurLessonDocumentMock.mockReturnValue({
      data: {},
      isPending: false,
      isLoading: false,
      isFetching: false,
      isRefetching: false,
    });
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

    render(<ActiveLessonView />);

    await act(async () => {});

    expect(screen.getByTestId('lessons-empty-document-summary')).toHaveAttribute(
      'data-kangur-print-exclude',
      'true'
    );
    expect(screen.queryByRole('button', { name: /drukuj/i })).toBeNull();
  });
});
