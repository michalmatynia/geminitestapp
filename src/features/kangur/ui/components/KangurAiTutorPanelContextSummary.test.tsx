import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  KangurAiTutorPanelBodyProvider,
  type KangurAiTutorPanelBodyContextValue,
} from './KangurAiTutorPanelBody.context';
import { KangurAiTutorPanelContextSummary } from './KangurAiTutorPanelContextSummary';
import {
  KangurAiTutorWidgetStateProvider,
  useKangurAiTutorWidgetState,
} from './KangurAiTutorWidget.state';

import { DEFAULT_KANGUR_AI_TUTOR_CONTENT } from '@/shared/contracts/kangur-ai-tutor-content';

import type { ReactNode } from 'react';

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
      contentId: 'game:home',
      id: 'kangur-game-leaderboard',
      kind: 'leaderboard',
      knowledgeReference: {
        sourceCollection: 'kangur_page_content',
        sourceRecordId: 'game-home-leaderboard',
        sourcePath: 'entry:game-home-leaderboard',
      },
      label: 'Ranking',
      surface: 'game',
    },
    id: 'selection',
    kind: 'selection',
    label: 'Ranking wynikow',
    rect: null,
  },
  activeSectionRect: null,
  activeSelectedText: 'Ranking wynikow',
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
  focusChipLabel: 'Ten fragment',
  handleClearDrawing: vi.fn(),
  handleDetachHighlightedSection: vi.fn(),
  handleDetachSelectedFragment: vi.fn(),
  handleDrawingComplete: vi.fn(),
  handleFollowUpClick: vi.fn(),
  handleFocusHighlightedSection: vi.fn(),
  handleFocusSelectedFragment: vi.fn(),
  handleKeyDown: vi.fn(),
  handleMessageFeedback: vi.fn(),
  handleQuickAction: vi.fn().mockResolvedValue(undefined),
  handleSend: vi.fn().mockResolvedValue(undefined),
  handleStartHomeOnboarding: vi.fn(),
  handleToggleDrawing: vi.fn(),
  handleWebsiteHelpTargetClick: vi.fn(),
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
  showToolboxLayout: false,
  tutorNarrationScript: [],
  tutorNarratorContextRegistry: null,
  tutorSessionKey: 'session-1',
  usageSummary: null,
  visibleProactiveNudge: null,
  visibleQuickActions: [],
  ...overrides,
});

function PanelContextSummaryHarness({
  bodyValue,
}: {
  bodyValue: KangurAiTutorPanelBodyContextValue;
}): ReactNode {
  const widgetState = useKangurAiTutorWidgetState();

  return (
    <KangurAiTutorWidgetStateProvider value={widgetState}>
      <KangurAiTutorPanelBodyProvider value={bodyValue}>
        <KangurAiTutorPanelContextSummary />
      </KangurAiTutorPanelBodyProvider>
    </KangurAiTutorWidgetStateProvider>
  );
}

describe('KangurAiTutorPanelContextSummary', () => {
  it('shows the saved page-content source for section-aware selected text threads', () => {
    render(<PanelContextSummaryHarness bodyValue={createPanelBodyContextValue()} />);

    expect(screen.getByTestId('kangur-ai-tutor-selected-text-source')).toHaveTextContent(
      'Zapisane zrodlo'
    );
    expect(screen.getByTestId('kangur-ai-tutor-selected-text-source')).toHaveTextContent(
      'Ranking'
    );
    expect(screen.getByTestId('kangur-ai-tutor-selected-text-source')).toHaveTextContent(
      'entry:game-home-leaderboard'
    );
  });
});
