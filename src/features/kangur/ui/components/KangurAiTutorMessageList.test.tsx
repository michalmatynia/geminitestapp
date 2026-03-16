import { fireEvent, render, screen } from '@testing-library/react';
import { useEffect, type ReactNode } from 'react';

import {
  KangurAiTutorPanelBodyProvider,
  type KangurAiTutorPanelBodyContextValue,
} from './KangurAiTutorPanelBody.context';
import { KangurAiTutorMessageList } from './KangurAiTutorMessageList';
import {
  KangurAiTutorWidgetStateProvider,
  useKangurAiTutorWidgetState,
} from './KangurAiTutorWidget.state';
import { getAssistantMessageFeedbackKey } from './KangurAiTutorWidget.helpers';

import type { KangurAiTutorRuntimeMessage as TutorRenderedMessage } from '@/features/kangur/shared/contracts/kangur-ai-tutor';

const EMPTY_FEEDBACK: Record<string, 'helpful' | 'not_helpful'> = {};

const createPanelBodyContextValue = (
  overrides: Partial<KangurAiTutorPanelBodyContextValue> = {}
): KangurAiTutorPanelBodyContextValue => ({
  activeFocus: {
    assignmentId: null,
    conversationFocus: {
      assignmentId: null,
      contentId: null,
      id: null,
      kind: null,
      knowledgeReference: null,
      label: null,
      surface: null,
    },
    rect: null,
    kind: null,
    id: null,
    label: null,
  },
  activeSectionRect: null,
  activeSelectedText: null,
  activeSelectionPageRect: null,
  askModalHelperText: 'Napisz pytanie do tutora',
  basePath: '/kangur',
  bridgeQuickActionId: null,
  bridgeSummaryChipLabel: null,
  canNarrateTutorText: false,
  canSendMessages: true,
  canStartHomeOnboardingManually: false,
  drawingImageData: null,
  drawingMode: false,
  drawingPanelOpen: false,
  drawingPanelAvailable: false,
  guestAuthFormVisible: false,
  emptyStateMessage: 'Pytaj…',
  focusChipLabel: null,
  handleClearDrawing: vi.fn(),
  handleCloseDrawingPanel: vi.fn(),
  handleDetachHighlightedSection: vi.fn(),
  handleDetachSelectedFragment: vi.fn(),
  handleFocusHighlightedSection: vi.fn(),
  handleFocusSelectedFragment: vi.fn(),
  handleDrawingComplete: vi.fn(),
  handleOpenDrawingPanel: vi.fn(),
  handleFollowUpClick: vi.fn(),
  handleKeyDown: vi.fn(),
  handleMessageFeedback: vi.fn(),
  handleWebsiteHelpTargetClick: vi.fn(),
  handleQuickAction: vi.fn().mockResolvedValue(undefined),
  handleSend: vi.fn().mockResolvedValue(undefined),
  handleStartHomeOnboarding: vi.fn(),
  handleToggleDrawing: vi.fn(),
  homeOnboardingReplayLabel: 'Pokaż jeszcze raz',
  inputPlaceholder: 'Pytaj…',
  isAskModalMode: false,
  isLoading: false,
  isMinimalPanelMode: false,
  lastInteractionIntent: null,
  lastPromptMode: null,
  isSectionExplainPendingMode: false,
  isSelectionExplainPendingMode: false,
  isUsageLoading: false,
  messages: [],
  narratorSettings: {
    engine: 'client',
    voice: 'coral',
  },
  panelEmptyStateMessage: 'Czekaj chwilę…',
  remainingMessages: null,
  selectedTextPreview: null,
  sessionSurface: null,
  showToolboxLayout: false,
  shouldRenderAuxiliaryPanelControls: false,
  showSectionExplainCompleteState: false,
  showSelectionExplainCompleteState: false,
  showSources: true,
  tutorNarrationScript: [],
  tutorNarratorContextRegistry: null,
  tutorSessionKey: 'session-1',
  usageSummary: null,
  visibleProactiveNudge: null,
  visibleQuickActions: [],
  ...overrides,
});

function MessageListHarness({
  bodyValue,
  initialFeedbackByKey = EMPTY_FEEDBACK,
}: {
  bodyValue: KangurAiTutorPanelBodyContextValue;
  initialFeedbackByKey?: Record<string, 'helpful' | 'not_helpful'>;
}): ReactNode {
  const widgetState = useKangurAiTutorWidgetState();
  const { setMessageFeedbackByKey } = widgetState;

  useEffect(() => {
    setMessageFeedbackByKey(initialFeedbackByKey);
  }, [initialFeedbackByKey, setMessageFeedbackByKey]);

  return (
    <KangurAiTutorWidgetStateProvider value={widgetState}>
      <KangurAiTutorPanelBodyProvider value={bodyValue}>
        <KangurAiTutorMessageList />
      </KangurAiTutorPanelBodyProvider>
    </KangurAiTutorWidgetStateProvider>
  );
}

describe('KangurAiTutorMessageList', () => {
  it('renders assistant coaching, follow-up cards, and sources', () => {
    const hintQuickAction = {
      id: 'hint',
      label: 'Podpowiedź',
      prompt: 'Daj mi małą podpowiedź, ale bez gotowej odpowiedzi.',
      promptMode: 'hint',
      interactionIntent: 'hint',
    };
    const handleQuickAction = vi.fn().mockResolvedValue(undefined);

    render(
      <MessageListHarness
        bodyValue={createPanelBodyContextValue({
          messages: [
            {
              role: 'assistant',
              content: 'Policz najpierw pierwszą parę.',
              answerResolutionMode: 'page_content',
              coachingFrame: {
                mode: 'hint_ladder',
                label: 'Jeden trop',
                description:
                  'Daj tylko jeden mały krok albo pytanie kontrolne, bez pełnego rozwiązania.',
                rationale:
                  'Uczeń jest w trakcie próby, więc tutor powinien prowadzić bardzo małymi krokami.',
              },
              followUpActions: [
                {
                  id: 'recommendation:strengthen_lesson_mastery',
                  label: 'Otwórz lekcję',
                  page: 'Lessons',
                  query: {
                    focus: 'adding',
                  },
                  reason: 'Powtórz lekcję: Dodawanie',
                },
              ],
              sources: [
                {
                  documentId: 'doc-1',
                  collectionId: 'lesson-library',
                  score: 0.913,
                  text: 'Dodawanie łączy liczby i tworzy sumę.',
                  metadata: {
                    title: 'Dodawanie podstawy',
                  },
                },
              ],
            },
          ],
          visibleQuickActions: [hintQuickAction],
          handleQuickAction,
        })}
      />
    );

    expect(screen.getByTestId('kangur-ai-tutor-coaching-frame')).toHaveAttribute(
      'data-coaching-mode',
      'hint_ladder'
    );
    expect(screen.getByText('Jeden trop')).toBeInTheDocument();
    expect(
      screen.getByText('Daj tylko jeden mały krok albo pytanie kontrolne, bez pełnego rozwiązania.')
    ).toBeInTheDocument();
    expect(screen.getByText('Policz najpierw pierwszą parę.')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-ai-tutor-page-content-answer-badge')).toHaveTextContent(
      'Zapisana treść strony'
    );
    expect(screen.getByText('Kolejny krok')).toBeInTheDocument();
    expect(screen.getByText('Powtórz lekcję: Dodawanie').parentElement).toHaveClass(
      'kangur-chat-surface-warm',
      'kangur-chat-surface-warm-shadow'
    );
    expect(screen.getByText('Potrzebujesz kolejnej podpowiedzi?')).toBeInTheDocument();
    const hintCta = screen.getByTestId('kangur-ai-tutor-hint-followup-cta');
    expect(hintCta).toHaveTextContent('Tak, pomóż mi');
    fireEvent.click(hintCta);
    expect(handleQuickAction).toHaveBeenCalledWith(hintQuickAction);
    expect(screen.getByRole('link', { name: 'Otwórz lekcję' })).toHaveAttribute(
      'href',
      '/kangur/lessons?focus=adding'
    );
    expect(screen.getByText('Źródła')).toBeInTheDocument();
    expect(screen.getByText('Dodawanie podstawy')).toBeInTheDocument();
    expect(screen.getByText('Dodawanie podstawy').parentElement).toHaveClass(
      'kangur-chat-surface-soft',
      'kangur-chat-surface-soft-shadow'
    );
    expect(screen.getByText(/lesson-library · score 0\.913/i)).toBeInTheDocument();
    expect(screen.getByText(/Dodawanie łączy liczby i tworzy sumę\./)).toBeInTheDocument();
  });

  it('hides assistant sources when source display is disabled', () => {
    render(
      <MessageListHarness
        bodyValue={createPanelBodyContextValue({
          messages: [
            {
              role: 'assistant',
              content: 'Policz najpierw pierwszą parę.',
              sources: [
                {
                  documentId: 'doc-1',
                  collectionId: 'lesson-library',
                  score: 0.913,
                  text: 'Dodawanie łączy liczby i tworzy sumę.',
                  metadata: {
                    title: 'Dodawanie podstawy',
                  },
                },
              ],
            },
          ],
          showSources: false,
        })}
      />
    );

    expect(screen.queryByText('Źródła')).not.toBeInTheDocument();
    expect(screen.queryByText('Dodawanie podstawy')).not.toBeInTheDocument();
  });

  it('renders a website-help target link for graph-grounded assistant answers', () => {
    render(
      <MessageListHarness
        bodyValue={createPanelBodyContextValue({
          messages: [
            {
              role: 'assistant',
              content: 'Kliknij przycisk logowania w górnej nawigacji.',
              websiteHelpTarget: {
                nodeId: 'flow:kangur:sign-in',
                label: 'Zaloguj się',
                route: '/',
                anchorId: 'kangur-primary-nav-login',
              },
            },
          ],
        })}
      />
    );

    expect(screen.getByText('Miejsce na stronie')).toBeInTheDocument();
    expect(screen.getByText('Zaloguj się')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Przejdź do tego miejsca' })).toHaveAttribute(
      'href',
      '/kangur#kangur-primary-nav-login'
    );
  });

  it('tracks clicks on website-help target links through the panel-body contract', () => {
    const handleWebsiteHelpTargetClick = vi.fn();

    render(
      <MessageListHarness
        bodyValue={createPanelBodyContextValue({
          handleWebsiteHelpTargetClick,
          messages: [
            {
              role: 'assistant',
              content: 'Kliknij przycisk logowania w górnej nawigacji.',
              websiteHelpTarget: {
                nodeId: 'flow:kangur:sign-in',
                label: 'Zaloguj się',
                route: '/',
                anchorId: 'kangur-primary-nav-login',
              },
            },
          ],
        })}
      />
    );

    fireEvent.click(screen.getByRole('link', { name: 'Przejdź do tego miejsca' }));

    expect(handleWebsiteHelpTargetClick).toHaveBeenCalledWith(
      {
        nodeId: 'flow:kangur:sign-in',
        label: 'Zaloguj się',
        route: '/',
        anchorId: 'kangur-primary-nav-login',
      },
      0,
      '/kangur#kangur-primary-nav-login'
    );
  });

  it('renders user messages in the warm orange tutor bubble styling', () => {
    render(
      <MessageListHarness
        bodyValue={createPanelBodyContextValue({
          messages: [{ role: 'user', content: 'Jak mam to policzyć?' }],
        })}
      />
    );

    expect(screen.getByText('Jak mam to policzyć?')).toHaveClass(
      'tutor-user-bubble',
      'kangur-chat-bubble',
      'kangur-chat-padding-sm'
    );
  });

  it('renders learner drawing attachments and assistant drawing sketches in the thread', () => {
    render(
      <MessageListHarness
        bodyValue={createPanelBodyContextValue({
          messages: [
            {
              role: 'user',
              content: 'Wyjaśnij to rysunkiem.',
              artifacts: [
                {
                  type: 'user_drawing',
                  imageDataUrl: 'data:image/png;base64,AAA',
                  alt: 'Szkic ucznia',
                },
              ],
            },
            {
              role: 'assistant',
              content: 'Policz najpierw lewą parę, potem prawą.',
              artifacts: [
                {
                  type: 'assistant_drawing',
                  title: 'Dwie pary',
                  caption: 'Każda para ma po dwa elementy.',
                  alt: 'Dwie pary kropek ustawione obok siebie.',
                  svgContent:
                    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><circle cx="90" cy="90" r="18" fill="#f59e0b" /><circle cx="130" cy="90" r="18" fill="#f59e0b" /></svg>',
                },
              ],
            },
          ],
        })}
      />
    );

    expect(screen.getByTestId('kangur-ai-tutor-drawing-message-0')).toHaveAttribute(
      'src',
      'data:image/png;base64,AAA'
    );
    expect(
      screen.getByTestId('kangur-ai-tutor-assistant-drawing-message-1-0')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('kangur-ai-tutor-assistant-drawing-message-1-0')
    ).toHaveClass(
      'kangur-chat-card',
      'kangur-chat-surface-soft',
      'kangur-chat-surface-soft-shadow'
    );
    expect(screen.getByText('Dwie pary')).toBeInTheDocument();
    expect(screen.getByText('Każda para ma po dwa elementy.')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Dwie pary kropek ustawione obok siebie.')
    ).toHaveClass('kangur-chat-inset', '[background:var(--kangur-soft-card-background)]');
  });

  it('locks assistant feedback controls after feedback was already submitted', () => {
    const message: TutorRenderedMessage = {
      role: 'assistant',
      content: 'Spróbuj najpierw policzyć dziesiątkę.',
      coachingFrame: {
        mode: 'hint_ladder',
        label: 'Jeden trop',
        description: 'Daj tylko jeden mały krok.',
      },
    };
    const feedbackKey = getAssistantMessageFeedbackKey('session-1', 0, message);

    render(
      <MessageListHarness
        bodyValue={createPanelBodyContextValue({
          messages: [message],
        })}
        initialFeedbackByKey={{
          [feedbackKey]: 'helpful',
        }}
      />
    );

    expect(screen.getByTestId('kangur-ai-tutor-feedback-helpful-0')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByTestId('kangur-ai-tutor-feedback-0')).toHaveClass(
      'kangur-chat-card',
      'kangur-chat-padding-sm',
      'kangur-chat-surface-soft'
    );
    expect(screen.getByTestId('kangur-ai-tutor-feedback-helpful-0')).toBeDisabled();
    expect(screen.getByTestId('kangur-ai-tutor-feedback-not-helpful-0')).toBeDisabled();
    expect(screen.getByTestId('kangur-ai-tutor-feedback-status-0')).toHaveTextContent(
      'Dzięki. To pomaga dopasować kolejne odpowiedzi tutora.'
    );
  });
});
