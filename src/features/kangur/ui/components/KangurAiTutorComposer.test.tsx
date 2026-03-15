/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { useEffect, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_KANGUR_AI_TUTOR_CONTENT } from '@/shared/contracts/kangur-ai-tutor-content';

import {
  KangurAiTutorPanelBodyProvider,
  type KangurAiTutorPanelBodyContextValue,
} from './KangurAiTutorPanelBody.context';
import { KangurAiTutorComposer } from './KangurAiTutorComposer';
import {
  KangurAiTutorWidgetStateProvider,
  useKangurAiTutorWidgetState,
} from './KangurAiTutorWidget.state';

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

function ComposerHarness({
  bodyValue,
  initialInputValue = '',
}: {
  bodyValue: KangurAiTutorPanelBodyContextValue;
  initialInputValue?: string;
}): ReactNode {
  const widgetState = useKangurAiTutorWidgetState();

  useEffect(() => {
    widgetState.setInputValue(initialInputValue);
  }, [initialInputValue, widgetState]);

  return (
    <KangurAiTutorWidgetStateProvider value={widgetState}>
      <KangurAiTutorPanelBodyProvider value={bodyValue}>
        <KangurAiTutorComposer />
      </KangurAiTutorPanelBodyProvider>
    </KangurAiTutorWidgetStateProvider>
  );
}

describe('KangurAiTutorComposer', () => {
  it('renders the composer input and quick actions with shared chat spacing tokens', () => {
    render(
      <ComposerHarness
        bodyValue={createPanelBodyContextValue({
          drawingImageData: 'data:image/png;base64,AAA',
          visibleQuickActions: [
            {
              id: 'hint',
              label: 'Podpowiedź',
              prompt: 'Daj mi małą podpowiedź.',
              promptMode: 'hint',
              interactionIntent: 'hint',
            },
          ],
        })}
      />
    );

    expect(screen.getByAltText('Rysunek')).toHaveClass('kangur-chat-inset');
    expect(screen.getByTestId('kangur-ai-tutor-composer-pills')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Podpowiedź' })).toBeInTheDocument();
    expect(screen.getByLabelText('Wpisz pytanie')).toBeInTheDocument();
  });
});
