import { render, screen } from '@testing-library/react';
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

import type { TutorRenderedMessage } from './KangurAiTutorPanelBody.context';

const EMPTY_FEEDBACK: Record<string, 'helpful' | 'not_helpful'> = {};

const createPanelBodyContextValue = (
  overrides: Partial<KangurAiTutorPanelBodyContextValue> = {}
): KangurAiTutorPanelBodyContextValue => ({
  activeFocus: {
    rect: null,
    kind: null,
    id: null,
    label: null,
    assignmentId: null,
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
  emptyStateMessage: 'Pytaj…',
  focusChipLabel: null,
  handleDetachHighlightedSection: vi.fn(),
  handleDetachSelectedFragment: vi.fn(),
  handleFocusHighlightedSection: vi.fn(),
  handleFocusSelectedFragment: vi.fn(),
  handleFollowUpClick: vi.fn(),
  handleKeyDown: vi.fn(),
  handleMessageFeedback: vi.fn(),
  handleQuickAction: vi.fn().mockResolvedValue(undefined),
  handleSend: vi.fn().mockResolvedValue(undefined),
  handleStartHomeOnboarding: vi.fn(),
  homeOnboardingReplayLabel: 'Pokaż jeszcze raz',
  inputPlaceholder: 'Pytaj…',
  isAskModalMode: false,
  isLoading: false,
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
    render(
      <MessageListHarness
        bodyValue={createPanelBodyContextValue({
          messages: [
            {
              role: 'assistant',
              content: 'Policz najpierw pierwszą parę.',
              coachingFrame: {
                mode: 'hint_ladder',
                label: 'Jeden trop',
                description:
                  'Daj tylko jeden maly krok albo pytanie kontrolne, bez pelnego rozwiazania.',
                rationale:
                  'Uczen jest w trakcie proby, wiec tutor powinien prowadzic bardzo malymi krokami.',
              },
              followUpActions: [
                {
                  id: 'recommendation:strengthen_lesson_mastery',
                  label: 'Otworz lekcje',
                  page: 'Lessons',
                  query: {
                    focus: 'adding',
                  },
                  reason: 'Powtorz lekcje: Dodawanie',
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
        })}
      />
    );

    expect(screen.getByTestId('kangur-ai-tutor-coaching-frame')).toHaveAttribute(
      'data-coaching-mode',
      'hint_ladder'
    );
    expect(screen.getByText('Jeden trop')).toBeInTheDocument();
    expect(
      screen.getByText('Daj tylko jeden maly krok albo pytanie kontrolne, bez pelnego rozwiazania.')
    ).toBeInTheDocument();
    expect(screen.getByText('Policz najpierw pierwszą parę.')).toBeInTheDocument();
    expect(screen.getByText('Kolejny krok')).toBeInTheDocument();
    expect(screen.getByText('Powtorz lekcje: Dodawanie').parentElement).toHaveClass(
      'border-amber-100',
      'bg-amber-50/70'
    );
    expect(screen.getByRole('link', { name: 'Otworz lekcje' })).toHaveAttribute(
      'href',
      '/kangur/lessons?focus=adding'
    );
    expect(screen.getByText('Źródła')).toBeInTheDocument();
    expect(screen.getByText('Dodawanie podstawy')).toBeInTheDocument();
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

  it('renders user messages in the warm orange tutor bubble styling', () => {
    render(
      <MessageListHarness
        bodyValue={createPanelBodyContextValue({
          messages: [{ role: 'user', content: 'Jak mam to policzyc?' }],
        })}
      />
    );

    expect(screen.getByText('Jak mam to policzyc?')).toHaveClass(
      'border-orange-400',
      'bg-gradient-to-br',
      'from-orange-400',
      'to-amber-500'
    );
  });

  it('locks assistant feedback controls after feedback was already submitted', () => {
    const message: TutorRenderedMessage = {
      role: 'assistant',
      content: 'Sprobuj najpierw policzyc dziesiatke.',
      coachingFrame: {
        mode: 'hint_ladder',
        label: 'Jeden trop',
        description: 'Daj tylko jeden maly krok.',
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
    expect(screen.getByTestId('kangur-ai-tutor-feedback-helpful-0')).toBeDisabled();
    expect(screen.getByTestId('kangur-ai-tutor-feedback-not-helpful-0')).toBeDisabled();
    expect(screen.getByTestId('kangur-ai-tutor-feedback-status-0')).toHaveTextContent(
      'Dzięki. To pomaga dopasować kolejne odpowiedzi tutora.'
    );
  });
});
