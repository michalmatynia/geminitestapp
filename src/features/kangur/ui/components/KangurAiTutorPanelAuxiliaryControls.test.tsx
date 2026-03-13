import { fireEvent, render, screen } from '@testing-library/react';

import { DEFAULT_KANGUR_AI_TUTOR_CONTENT } from '@/shared/contracts/kangur-ai-tutor-content';
import { repairKangurPolishCopy } from '@/shared/lib/i18n/kangur-polish-diacritics';

import {
  KangurAiTutorPanelBodyProvider,
  type KangurAiTutorPanelBodyContextValue,
} from './KangurAiTutorPanelBody.context';
import { KangurAiTutorPanelAuxiliaryControls } from './KangurAiTutorPanelAuxiliaryControls';

vi.mock('@/features/kangur/ui/context/KangurAiTutorContentContext', () => ({
  useKangurAiTutorContent: () => DEFAULT_KANGUR_AI_TUTOR_CONTENT,
}));

vi.mock('./KangurNarratorControl', () => ({
  KangurNarratorControl: () => <div data-testid='kangur-ai-tutor-narrator-shell' />,
}));

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
  drawingImageData: null,
  drawingMode: false,
  guestAuthFormVisible: false,
  emptyStateMessage: 'Pytaj…',
  focusChipLabel: null,
  handleClearDrawing: vi.fn(),
  handleDetachHighlightedSection: vi.fn(),
  handleDetachSelectedFragment: vi.fn(),
  handleFocusHighlightedSection: vi.fn(),
  handleFocusSelectedFragment: vi.fn(),
  handleDrawingComplete: vi.fn(),
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
  it('renders the usage banner and routes proactive nudges through the quick-action handler', () => {
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
    expect(screen.getByTestId('kangur-ai-tutor-proactive-nudge')).toHaveAttribute(
      'data-nudge-mode',
      'gentle'
    );
    expect(screen.getByTestId('kangur-ai-tutor-proactive-nudge')).toHaveClass(
      'kangur-chat-inset',
      'kangur-chat-padding-md',
      'kangur-chat-surface-success'
    );
    expect(screen.getByTestId('kangur-ai-tutor-proactive-nudge')).toHaveTextContent(
      'Sugerowany pierwszy krok'
    );
    expect(screen.getByTestId('kangur-ai-tutor-proactive-nudge')).toHaveTextContent('Ten fragment');
    expect(screen.getByText('Sugerowany pierwszy krok')).toHaveClass(
      '[color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]'
    );
    expect(screen.getByText('Ten fragment')).toHaveClass(
      '[color:var(--kangur-chat-panel-text,var(--kangur-page-text))]'
    );
    expect(
      screen.getByText('Zacznij od wyjaśnienia zaznaczonego fragmentu.')
    ).toHaveClass('[color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]');

    fireEvent.click(screen.getByTestId('kangur-ai-tutor-proactive-nudge-button'));

    expect(handleQuickAction).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'selected-text',
        label: 'Ten fragment',
      }),
      {
        source: 'proactive_nudge',
      }
    );
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
