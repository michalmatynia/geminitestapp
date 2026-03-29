/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_KANGUR_AI_TUTOR_CONTENT } from '@/features/kangur/shared/contracts/kangur-ai-tutor-content';

import { KangurAiTutorGuidedCallout } from './KangurAiTutorGuidedCallout';

import type { HTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

const defaultTutorContentSnapshot = structuredClone(DEFAULT_KANGUR_AI_TUTOR_CONTENT);

const widgetStateContextMock = vi.hoisted(() => ({
  guidedTutorTarget: null,
  homeOnboardingStepIndex: 1,
  selectionConversationContext: null,
  selectionGuidanceHandoffText: null,
  selectionResponsePending: null,
}));

const panelBodyContextMock = vi.hoisted(() => ({
  activeSelectedText: null,
  activeFocus: {
    assignmentId: null,
    rect: null,
    kind: null,
    id: null,
    label: null,
    conversationFocus: {
      assignmentId: null,
      contentId: null,
      id: null,
      kind: null,
      knowledgeReference: null,
      label: null,
      surface: null,
    },
  },
  canSendMessages: true,
  drawingPanelAvailable: false,
  drawingPanelOpen: false,
  handleOpenDrawingPanel: vi.fn(),
  handleQuickAction: vi.fn(),
  handleToggleDrawing: vi.fn(),
  isLoading: false,
  lastInteractionIntent: null,
  lastPromptMode: null,
  isSelectionExplainPendingMode: false,
  messages: [],
  selectedTextPreview: null,
  sessionSurface: null,
  visibleQuickActions: [],
}));

const pageContentQueryMock = vi.hoisted(() => ({
  entry: null as {
    fragments: Array<{
      aliases: string[];
      enabled: boolean;
      explanation: string;
      id: string;
      nativeGuideIds: string[];
      sortOrder: number;
      text: string;
      triggerPhrases: string[];
    }>;
    summary: string;
    title: string;
  } | null,
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({
      animate: _animate,
      children,
      exit: _exit,
      initial: _initial,
      transition: _transition,
      ...props
    }: HTMLAttributes<HTMLDivElement> & {
      animate?: unknown;
      exit?: unknown;
      initial?: unknown;
      transition?: unknown;
    }) => <div {...props}>{children}</div>,
  },
}));

vi.mock('@/features/kangur/ui/context/KangurAiTutorContentContext', () => ({
  useKangurAiTutorContent: () => DEFAULT_KANGUR_AI_TUTOR_CONTENT,
}));

vi.mock('./KangurAiTutorWidget.state', () => ({
  useKangurAiTutorWidgetStateContext: () => widgetStateContextMock,
}));

vi.mock('./KangurAiTutorPanelBody.context', () => ({
  useKangurAiTutorPanelBodyContext: () => panelBodyContextMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: () => pageContentQueryMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

vi.mock('@/features/kangur/ui/design/primitives', () => ({
  KangurButton: ({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
  KangurPanelRow: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => (
    <div {...props}>{children}</div>
  ),
}));

vi.mock('./KangurAiTutorChrome', () => ({
  KangurAiTutorChromeBadge: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => (
    <div {...props}>{children}</div>
  ),
  KangurAiTutorChromeCloseButton: ({
    children,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
  KangurAiTutorChromeKicker: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => (
    <div {...props}>{children}</div>
  ),
  KangurAiTutorWarmInsetCard: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => (
    <div {...props}>{children}</div>
  ),
  KangurAiTutorWarmOverlayPanel: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => (
    <div {...props}>{children}</div>
  ),
}));

describe('KangurAiTutorGuidedCallout', () => {
  beforeEach(() => {
    DEFAULT_KANGUR_AI_TUTOR_CONTENT.locale = defaultTutorContentSnapshot.locale;
    DEFAULT_KANGUR_AI_TUTOR_CONTENT.guidedCallout.selectionSketchCtaLabel =
      defaultTutorContentSnapshot.guidedCallout.selectionSketchCtaLabel;
    DEFAULT_KANGUR_AI_TUTOR_CONTENT.guidedCallout.selectionSketchHint =
      defaultTutorContentSnapshot.guidedCallout.selectionSketchHint;
    widgetStateContextMock.guidedTutorTarget = null;
    widgetStateContextMock.homeOnboardingStepIndex = 1;
    widgetStateContextMock.selectionConversationContext = null;
    widgetStateContextMock.selectionGuidanceHandoffText = null;
    widgetStateContextMock.selectionResponsePending = null;
    panelBodyContextMock.activeFocus = {
      assignmentId: null,
      rect: null,
      kind: null,
      id: null,
      label: null,
      conversationFocus: {
        assignmentId: null,
        contentId: null,
        id: null,
        kind: null,
        knowledgeReference: null,
        label: null,
        surface: null,
      },
    };
    panelBodyContextMock.activeSelectedText = null;
    panelBodyContextMock.isLoading = false;
    panelBodyContextMock.isSelectionExplainPendingMode = false;
    panelBodyContextMock.messages = [];
    panelBodyContextMock.selectedTextPreview = null;
    panelBodyContextMock.sessionSurface = null;
    pageContentQueryMock.entry = null;
  });

  it('renders the mobile home onboarding sheet without hitting a temporal dead zone error', () => {
    render(
      <KangurAiTutorGuidedCallout
        avatarPlacement='bottom'
        calloutKey='home-onboarding'
        calloutTestId='kangur-ai-tutor-guided-callout'
        detail='Dowiedz się, jak korzystać z tutora na telefonie.'
        entryDirection='right'
        headerLabel='Asystent'
        mode='home_onboarding'
        onAction={vi.fn()}
        placement='bottom'
        prefersReducedMotion
        reducedMotionTransitions={{
          instant: { duration: 0 },
          stableState: { opacity: 1, scale: 1, y: 0 },
        }}
        sectionGuidanceLabel={null}
        sectionResponsePendingKind={null}
        selectionPreview={null}
        shouldRender
        showSectionGuidanceCallout={false}
        showSelectionGuidanceCallout={false}
        stepLabel='Krok 2 z 3'
        style={{ bottom: 8, left: 16, position: 'fixed', width: 288 }}
        title='Poznaj mobilny tryb Kangura'
        transitionDuration={0}
        transitionEase={[0.22, 1, 0.36, 1]}
      />
    );

    expect(screen.getByTestId('kangur-ai-tutor-guided-callout')).toHaveTextContent(
      'Poznaj mobilny tryb Kangura'
    );
    expect(screen.getByText('Krok 2 z 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Wstecz' })).toHaveClass(
      'min-h-11',
      'px-4',
      'touch-manipulation'
    );
    expect(screen.getByRole('button', { name: 'Rozumiem' })).toHaveClass(
      'min-h-11',
      'px-4',
      'touch-manipulation'
    );
  });

  it('keeps the guided selection shell and injects the saved source plus resolved answer inline', () => {
    pageContentQueryMock.entry = {
      fragments: [
        {
          aliases: ['MISTRZOSTWO 67% 2/4 odznak'],
          enabled: true,
          explanation: 'Ta ścieżka pokazuje postęp w odznakach i lekcjach dla poziomu mistrzostwa.',
          id: 'badge-track-mastery',
          nativeGuideIds: [],
          sortOrder: 0,
          text: '🏗️ MISTRZOSTWO 67% 2/4 odznak Budowniczy mistrzostwa · 2/3 lekcje',
          triggerPhrases: [],
        },
      ],
      summary: 'Zobacz poziom, serie, skuteczność i najbliższe odznaki w jednym miejscu.',
      title: 'Postępy ucznia',
    };
    widgetStateContextMock.guidedTutorTarget = {
      kind: 'selection_excerpt',
      mode: 'selection',
      selectedText: '🏗️ MISTRZOSTWO 67% 2/4 odznak',
    };
    widgetStateContextMock.selectionConversationContext = {
      focusLabel: 'Postęp gracza',
      knowledgeReference: {
        sourceCollection: 'kangur_page_content',
        sourceRecordId: 'game-home-progress',
        sourcePath: 'entry:game-home-progress#fragment:badge-track-mastery',
      },
      messageStartIndex: 2,
      selectedText: '🏗️ MISTRZOSTWO 67% 2/4 odznak',
    };
    panelBodyContextMock.activeFocus = {
      assignmentId: null,
      rect: null,
      kind: 'selection',
      id: 'selection',
      label: 'Postęp gracza',
      conversationFocus: {
        assignmentId: null,
        contentId: 'game:home',
        id: 'game-home-progress',
        kind: 'selection',
        knowledgeReference: {
          sourceCollection: 'kangur_page_content',
          sourceRecordId: 'game-home-progress',
          sourcePath: 'entry:game-home-progress#fragment:badge-track-mastery',
        },
        label: 'Postęp gracza',
        surface: 'game',
      },
    };
    panelBodyContextMock.activeSelectedText = '🏗️ MISTRZOSTWO 67% 2/4 odznak';
    panelBodyContextMock.sessionSurface = 'game';
    panelBodyContextMock.messages = [
      {
        content: 'Wyjaśnij zaznaczony fragment krok po kroku.',
        role: 'user',
      },
      {
        answerResolutionMode: 'page_content',
        content: 'To ścieżka mistrzostwa pokazuje Twój postęp w odznakach i lekcjach.',
        role: 'assistant',
      },
    ];

    render(
      <KangurAiTutorGuidedCallout
        avatarPlacement='left'
        calloutKey='selection'
        calloutTestId='kangur-ai-tutor-selection-guided-callout'
        detail={null}
        entryDirection='left'
        headerLabel='Janek'
        mode='selection'
        onAction={vi.fn()}
        placement='right'
        prefersReducedMotion
        reducedMotionTransitions={{
          instant: { duration: 0 },
          stableState: { opacity: 1, scale: 1, y: 0 },
        }}
        sectionGuidanceLabel={null}
        sectionResponsePendingKind={null}
        selectionPreview='🏗️ MISTRZOSTWO 67% 2/4 odznak'
        shouldRender
        showSectionGuidanceCallout={false}
        showSelectionGuidanceCallout
        stepLabel={null}
        style={{ left: 16, position: 'fixed', top: 24, width: 320 }}
        title='Wyjaśniam ten fragment.'
        transitionDuration={0}
        transitionEase={[0.22, 1, 0.36, 1]}
      />
    );

    expect(screen.getByText('Wyjaśniam ten fragment.')).toHaveClass('sr-only');
    expect(
      screen.queryByText('🏗️ MISTRZOSTWO 67% 2/4 odznak Budowniczy mistrzostwa · 2/3 lekcje')
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('kangur-ai-tutor-selection-guided-source')).toHaveTextContent(
      'Postęp gracza'
    );
    expect(screen.getByTestId('kangur-ai-tutor-selection-guided-source')).toHaveTextContent(
      'Ta ścieżka pokazuje postęp w odznakach i lekcjach dla poziomu mistrzostwa.'
    );
    expect(
      screen.queryByText('entry:game-home-progress#fragment:badge-track-mastery')
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId('kangur-ai-tutor-selection-guided-page-content-badge')
    ).toHaveTextContent('Zapisana treść strony');
    expect(screen.getByTestId('kangur-ai-tutor-selection-guided-answer')).toHaveTextContent(
      'To ścieżka mistrzostwa pokazuje Twój postęp w odznakach i lekcjach.'
    );
    expect(
      screen.getByRole('region', { name: 'Wyjaśniam ten fragment.' })
    ).toHaveAttribute('aria-live', 'polite');
    expect(screen.queryByText('Za chwilę otworzę wyjaśnienie dokładnie dla zaznaczonego tekstu.')).not.toBeInTheDocument();
    expect(screen.queryByText('Już przygotowuję wyjaśnienie…')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rozumiem' })).toHaveClass(
      'min-h-11',
      'px-4',
      'touch-manipulation'
    );
  });

  it('renders the resolved page-content answer on test surfaces for knowledge-backed selections', () => {
    pageContentQueryMock.entry = {
      fragments: [
        {
          aliases: ['Zadanie 1'],
          enabled: true,
          explanation: 'Ten fragment opisuje warunek zadania.',
          id: 'task-1',
          nativeGuideIds: [],
          sortOrder: 0,
          text: 'Który kwadrat został rozcięty wzdłuż pogrubionych linii?',
          triggerPhrases: [],
        },
      ],
      summary: 'Streszczenie zadania.',
      title: 'Zadanie 1',
    };
    widgetStateContextMock.guidedTutorTarget = {
      kind: 'selection_excerpt',
      mode: 'selection',
      selectedText: 'Który kwadrat został rozcięty wzdłuż pogrubionych linii?',
    };
    widgetStateContextMock.selectionConversationContext = {
      focusLabel: 'Zadanie 1',
      knowledgeReference: {
        sourceCollection: 'kangur_page_content',
        sourceRecordId: 'test-task-1',
        sourcePath: 'entry:test-task-1#fragment:task-1',
      },
      messageStartIndex: 0,
      selectedText: 'Który kwadrat został rozcięty wzdłuż pogrubionych linii?',
    };
    panelBodyContextMock.activeFocus = {
      assignmentId: null,
      rect: null,
      kind: 'selection',
      id: 'selection',
      label: 'Zadanie 1',
      conversationFocus: {
        assignmentId: null,
        contentId: 'test:suite-1',
        id: 'test-task-1',
        kind: 'selection',
        knowledgeReference: {
          sourceCollection: 'kangur_page_content',
          sourceRecordId: 'test-task-1',
          sourcePath: 'entry:test-task-1#fragment:task-1',
        },
        label: 'Zadanie 1',
        surface: 'test',
      },
    };
    panelBodyContextMock.activeSelectedText =
      'Który kwadrat został rozcięty wzdłuż pogrubionych linii?';
    panelBodyContextMock.sessionSurface = 'test';
    panelBodyContextMock.messages = [
      {
        content: 'Wyjaśnij zaznaczony fragment krok po kroku.',
        role: 'user',
      },
      {
        answerResolutionMode: 'page_content',
        content: 'To zadanie sprawdza, czy po rozcięciu powstają dwie identyczne części.',
        role: 'assistant',
      },
    ];

    render(
      <KangurAiTutorGuidedCallout
        avatarPlacement='left'
        calloutKey='selection-test'
        calloutTestId='kangur-ai-tutor-selection-guided-callout'
        detail={null}
        entryDirection='left'
        headerLabel='Janek'
        mode='selection'
        onAction={vi.fn()}
        placement='right'
        prefersReducedMotion
        reducedMotionTransitions={{
          instant: { duration: 0 },
          stableState: { opacity: 1, scale: 1, y: 0 },
        }}
        sectionGuidanceLabel={null}
        sectionResponsePendingKind={null}
        selectionPreview='Który kwadrat został rozcięty wzdłuż pogrubionych linii?'
        shouldRender
        showSectionGuidanceCallout={false}
        showSelectionGuidanceCallout
        stepLabel={null}
        style={{ left: 16, position: 'fixed', top: 24, width: 320 }}
        title='Wyjaśniam ten fragment.'
        transitionDuration={0}
        transitionEase={[0.22, 1, 0.36, 1]}
      />
    );

    expect(
      screen.getByTestId('kangur-ai-tutor-selection-guided-page-content-badge')
    ).toHaveTextContent('Zapisana treść strony');
    expect(screen.getByTestId('kangur-ai-tutor-selection-guided-answer')).toHaveTextContent(
      'To zadanie sprawdza, czy po rozcięciu powstają dwie identyczne części.'
    );
    expect(
      screen.queryByTestId('kangur-ai-tutor-selection-hint-followup')
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rozumiem' })).toHaveClass(
      'min-h-11',
      'px-4',
      'touch-manipulation'
    );
  });

  it('shows the saved page-content fragment in the first guided modal before the answer resolves', () => {
    pageContentQueryMock.entry = {
      fragments: [
        {
          aliases: ['MISTRZOSTWO 67% 2/4 odznak'],
          enabled: true,
          explanation: 'Ta ścieżka zbiera odznaki mistrzostwa i pokazuje, ile lekcji zostało do ukończenia.',
          id: 'badge-track-mastery',
          nativeGuideIds: [],
          sortOrder: 0,
          text: '🏗️ MISTRZOSTWO 67% 2/4 odznak Budowniczy mistrzostwa · 2/3 lekcje',
          triggerPhrases: [],
        },
      ],
      summary: 'Zobacz poziom, serie, skuteczność i najbliższe odznaki w jednym miejscu.',
      title: 'Postępy ucznia',
    };
    widgetStateContextMock.guidedTutorTarget = {
      kind: 'selection_excerpt',
      mode: 'selection',
      selectedText: '🏗️ MISTRZOSTWO 67% 2/4 odznak Budowniczy mistrzostwa · 2/3 lekcje',
    };
    widgetStateContextMock.selectionConversationContext = {
      focusLabel: 'Postęp gracza',
      knowledgeReference: {
        sourceCollection: 'kangur_page_content',
        sourceRecordId: 'game-home-progress',
        sourcePath: 'entry:game-home-progress#fragment:badge-track-mastery',
      },
      messageStartIndex: 1,
      selectedText: '🏗️ MISTRZOSTWO 67% 2/4 odznak Budowniczy mistrzostwa · 2/3 lekcje',
    };
    panelBodyContextMock.activeSelectedText =
      '🏗️ MISTRZOSTWO 67% 2/4 odznak Budowniczy mistrzostwa · 2/3 lekcje';
    panelBodyContextMock.isLoading = true;
    panelBodyContextMock.isSelectionExplainPendingMode = true;
    panelBodyContextMock.activeFocus = {
      assignmentId: null,
      rect: null,
      kind: 'selection',
      id: 'selection',
      label: 'Postęp gracza',
      conversationFocus: {
        assignmentId: null,
        contentId: 'game:home',
        id: 'game-home-progress',
        kind: 'selection',
        knowledgeReference: {
          sourceCollection: 'kangur_page_content',
          sourceRecordId: 'game-home-progress',
          sourcePath: 'entry:game-home-progress#fragment:badge-track-mastery',
        },
        label: 'Postęp gracza',
        surface: 'game',
      },
    };
    panelBodyContextMock.sessionSurface = 'game';

    render(
      <KangurAiTutorGuidedCallout
        avatarPlacement='left'
        calloutKey='selection-pending'
        calloutTestId='kangur-ai-tutor-selection-guided-callout'
        detail={null}
        entryDirection='left'
        headerLabel='Janek'
        mode='selection'
        onAction={vi.fn()}
        placement='right'
        prefersReducedMotion
        reducedMotionTransitions={{
          instant: { duration: 0 },
          stableState: { opacity: 1, scale: 1, y: 0 },
        }}
        sectionGuidanceLabel={null}
        sectionResponsePendingKind={null}
        selectionPreview='🏗️ MISTRZOSTWO 67% 2/4 odznak'
        shouldRender
        showSectionGuidanceCallout={false}
        showSelectionGuidanceCallout
        stepLabel={null}
        style={{ left: 16, position: 'fixed', top: 24, width: 320 }}
        title='Wyjaśniam ten fragment.'
        transitionDuration={0}
        transitionEase={[0.22, 1, 0.36, 1]}
      />
    );

    expect(screen.getByTestId('kangur-ai-tutor-selection-guided-source')).toHaveTextContent(
      'Postęp gracza'
    );
    expect(screen.getByTestId('kangur-ai-tutor-selection-guided-source')).toHaveTextContent(
      'Ta ścieżka zbiera odznaki mistrzostwa i pokazuje, ile lekcji zostało do ukończenia.'
    );
    expect(
      screen.queryByText('🏗️ MISTRZOSTWO 67% 2/4 odznak Budowniczy mistrzostwa · 2/3 lekcje')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('entry:game-home-progress#fragment:badge-track-mastery')
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('kangur-ai-tutor-selection-guided-answer')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Za chwilę otworzę wyjaśnienie dokładnie dla zaznaczonego tekstu.')
    ).not.toBeInTheDocument();
  });

  it('uses English fallback labels when the English tutor content is missing sketch copy', () => {
    DEFAULT_KANGUR_AI_TUTOR_CONTENT.locale = 'en';
    DEFAULT_KANGUR_AI_TUTOR_CONTENT.guidedCallout.selectionSketchCtaLabel = '';
    DEFAULT_KANGUR_AI_TUTOR_CONTENT.guidedCallout.selectionSketchHint = '';

    pageContentQueryMock.entry = {
      fragments: [
        {
          aliases: ['Mastery 67%'],
          enabled: true,
          explanation: 'This fragment explains the current mastery track.',
          id: 'badge-track-mastery',
          nativeGuideIds: [],
          sortOrder: 0,
          text: 'Mastery 67%',
          triggerPhrases: [],
        },
      ],
      summary: 'See the current mastery path.',
      title: 'Learner progress',
    };
    widgetStateContextMock.guidedTutorTarget = {
      kind: 'selection_excerpt',
      mode: 'selection',
      selectedText: 'Mastery 67%',
    };
    widgetStateContextMock.selectionConversationContext = {
      focusLabel: 'Learner progress',
      knowledgeReference: {
        sourceCollection: 'kangur_page_content',
        sourceRecordId: 'game-home-progress',
        sourcePath: 'entry:game-home-progress#fragment:badge-track-mastery',
      },
      messageStartIndex: 0,
      selectedText: 'Mastery 67%',
    };
    panelBodyContextMock.activeFocus = {
      assignmentId: null,
      rect: null,
      kind: 'selection',
      id: 'selection',
      label: 'Learner progress',
      conversationFocus: {
        assignmentId: null,
        contentId: 'game:home',
        id: 'game-home-progress',
        kind: 'selection',
        knowledgeReference: {
          sourceCollection: 'kangur_page_content',
          sourceRecordId: 'game-home-progress',
          sourcePath: 'entry:game-home-progress#fragment:badge-track-mastery',
        },
        label: 'Learner progress',
        surface: 'game',
      },
    };
    panelBodyContextMock.activeSelectedText = 'Mastery 67%';
    panelBodyContextMock.sessionSurface = 'game';
    panelBodyContextMock.messages = [
      {
        content: 'Explain the selected fragment step by step.',
        role: 'user',
      },
      {
        answerResolutionMode: 'page_content',
        content: 'This mastery track shows how close you are to the next badge.',
        role: 'assistant',
      },
    ];

    render(
      <KangurAiTutorGuidedCallout
        avatarPlacement='left'
        calloutKey='selection-en'
        calloutTestId='kangur-ai-tutor-selection-guided-callout'
        detail={null}
        entryDirection='left'
        headerLabel='Jamie'
        mode='selection'
        onAction={vi.fn()}
        placement='right'
        prefersReducedMotion
        reducedMotionTransitions={{
          instant: { duration: 0 },
          stableState: { opacity: 1, scale: 1, y: 0 },
        }}
        sectionGuidanceLabel={null}
        sectionResponsePendingKind={null}
        selectionPreview='Mastery 67%'
        shouldRender
        showSectionGuidanceCallout={false}
        showSelectionGuidanceCallout
        stepLabel={null}
        style={{ left: 16, position: 'fixed', top: 24, width: 320 }}
        title='I am explaining this fragment.'
        transitionDuration={0}
        transitionEase={[0.22, 1, 0.36, 1]}
      />
    );

    expect(
      screen.getByTestId('kangur-ai-tutor-selection-guided-page-content-badge')
    ).toHaveTextContent('Saved page content');
    expect(screen.getByTestId('kangur-ai-tutor-selection-guided-source')).toHaveTextContent(
      'Knowledge base fragment'
    );
    expect(
      screen.getByRole('button', { name: 'Sketch it out for me' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('The explanation uses the saved page content for this selection.')
    ).toBeInTheDocument();
  });
});
