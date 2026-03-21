import { fireEvent, render, screen } from '@/__tests__/test-utils';

import { DEFAULT_KANGUR_AI_TUTOR_CONTENT } from '@/features/kangur/shared/contracts/kangur-ai-tutor-content';
import { repairKangurPolishCopy } from '@/shared/lib/i18n/kangur-polish-diacritics';

import {
  KangurAiTutorPanelBodyProvider,
  type KangurAiTutorPanelBodyContextValue,
} from './KangurAiTutorPanelBody.context';
import { KangurAiTutorPanelAuxiliaryControls } from './KangurAiTutorPanelAuxiliaryControls';

vi.mock('@/features/kangur/ui/context/KangurAiTutorContentContext', () => ({
  useKangurAiTutorContent: () => DEFAULT_KANGUR_AI_TUTOR_CONTENT,
}));

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
  shouldRenderAuxiliaryPanelControls: true,
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

describe('KangurAiTutorPanelAuxiliaryControls', () => {
  it('renders the usage banner and never renders proactive nudges', () => {
    const handleQuickAction = vi.fn().mockResolvedValue(undefined);

    render(
      <KangurAiTutorPanelBodyProvider
        value={createPanelBodyContextValue({
          handleQuickAction,
          remainingMessages: 0,
          usageSummary: {
            dateKey: '2026-03-07',
            messageCount: 5,
            dailyMessageLimit: 5,
            remainingMessages: 0,
          },
          visibleProactiveNudge: {
            mode: 'gentle',
            title: 'Sugerowany pierwszy krok',
            description: 'Zacznij od wyjaśnienia zaznaczonego fragmentu.',
            action: {
              id: 'selected-text',
              label: 'Ten fragment',
              prompt: 'Wytłumacz ten zaznaczony fragment prostymi słowami.',
              promptMode: 'selected_text',
              interactionIntent: 'explain',
            },
          },
        })}
      >
        <KangurAiTutorPanelAuxiliaryControls />
      </KangurAiTutorPanelBodyProvider>
    );

    expect(screen.getByText('Limit dzisiaj: 5/5')).toBeInTheDocument();
    expect(screen.getByText('Limit wyczerpany')).toHaveClass(
      '[color:var(--kangur-chat-kicker-text,var(--kangur-chat-panel-text,var(--kangur-page-text)))]'
    );
    expect(screen.getByText('Limit dzisiaj: 5/5').parentElement?.parentElement).toHaveClass(
      'kangur-chat-surface-warm'
    );
    expect(screen.getByText('Limit dzisiaj: 5/5').parentElement?.parentElement).toHaveClass(
      'kangur-chat-inset',
      'kangur-chat-padding-sm',
      '[color:var(--kangur-chat-panel-text,var(--kangur-page-text))]'
    );
    expect(screen.queryByTestId('kangur-ai-tutor-proactive-nudge')).not.toBeInTheDocument();
    expect(handleQuickAction).not.toHaveBeenCalled();
  });

  it('hides the proactive nudge card when no nudge is available', () => {
    render(
      <KangurAiTutorPanelBodyProvider value={createPanelBodyContextValue()}>
        <KangurAiTutorPanelAuxiliaryControls />
      </KangurAiTutorPanelBodyProvider>
    );

    expect(screen.queryByTestId('kangur-ai-tutor-proactive-nudge')).not.toBeInTheDocument();
  });

  it('renders the freeform toolbox actions without relying on the composer pills', () => {
    const handleQuickAction = vi.fn().mockResolvedValue(undefined);
    const handleToggleDrawing = vi.fn();

    render(
      <KangurAiTutorPanelBodyProvider
        value={createPanelBodyContextValue({
          handleQuickAction,
          handleToggleDrawing,
          shouldRenderAuxiliaryPanelControls: false,
          showToolboxLayout: true,
          visibleQuickActions: [
            {
              id: 'hint',
              label: 'Podpowiedź',
              prompt: 'Daj mi małą podpowiedź.',
              promptMode: 'hint',
              interactionIntent: 'hint',
            },
            {
              id: 'next-step',
              label: 'Co dalej?',
              prompt: 'Powiedz, co dalej.',
              promptMode: 'chat',
              interactionIntent: 'next_step',
            },
          ],
        })}
      >
        <KangurAiTutorPanelAuxiliaryControls />
      </KangurAiTutorPanelBodyProvider>
    );

    expect(screen.getByTestId('kangur-ai-tutor-toolbox')).toHaveTextContent(
      repairKangurPolishCopy('Narzędzia tutora')
    );
    expect(screen.getByTestId('kangur-ai-tutor-toolbox')).toHaveClass(
      'kangur-chat-card',
      'kangur-chat-padding-md'
    );
    expect(screen.getByTestId('kangur-ai-tutor-toolbox')).toHaveTextContent(
      repairKangurPolishCopy(
        'Skróty do wskazówek, rysowania i kolejnych kroków w bieżącej rozmowie.'
      )
    );

    fireEvent.click(screen.getByTestId('kangur-ai-tutor-toolbox-drawing-toggle'));
    fireEvent.click(screen.getByTestId('kangur-ai-tutor-toolbox-action-hint'));

    expect(handleToggleDrawing).toHaveBeenCalledTimes(1);
    expect(handleQuickAction).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'hint',
        label: 'Podpowiedź',
      })
    );
  });
});
