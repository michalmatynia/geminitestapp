/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DEFAULT_KANGUR_AI_TUTOR_CONTENT } from '@/shared/contracts/kangur-ai-tutor-content';

import { useKangurAiTutorGuidedDisplayState } from './KangurAiTutorWidget.display';

import type {
  GuidedTutorTarget,
  PendingSelectionResponse,
} from './KangurAiTutorWidget.types';

type HarnessProps = {
  guidedTutorTarget?: GuidedTutorTarget | null;
  selectionResponsePending?: PendingSelectionResponse | null;
};

function GuidedDisplayHarness({
  guidedTutorTarget = null,
  selectionResponsePending = null,
}: HarnessProps) {
  const guidedState = useKangurAiTutorGuidedDisplayState({
    activeSectionRect: null,
    activeSelectionContainerRect: null,
    activeSelectionPageRect: new DOMRect(120, 180, 140, 26),
    activeSelectionRect: new DOMRect(120, 180, 140, 26),
    askModalVisible: true,
    enabled: true,
    guestTutorAssistantLabel: 'Pomocnik',
    guidedTutorTarget,
    homeOnboardingEligibleContentId: 'game:home',
    homeOnboardingRecordStatus: null,
    homeOnboardingStepIndex: null,
    hoveredSectionAnchorId: null,
    isAuthenticated: true,
    isLoading: false,
    isOpen: true,
    isTutorHidden: false,
    mounted: true,
    persistedSelectionPageRect: null,
    persistedSelectionRect: null,
    sectionResponsePending: null,
    selectionResponsePending,
    sessionContentId: 'lesson-1',
    sessionSurface: 'lesson',
    tutorAnchorContext: null,
    tutorContent: DEFAULT_KANGUR_AI_TUTOR_CONTENT,
    tutorName: 'Pomocnik',
    viewportTick: 0,
  });

  return (
    <>
      <div data-testid='ask-modal-mode'>{String(guidedState.isAskModalMode)}</div>
      <div data-testid='selection-guidance'>{String(guidedState.showSelectionGuidanceCallout)}</div>
      <div data-testid='guided-mode'>{guidedState.guidedMode ?? 'null'}</div>
    </>
  );
}

describe('useKangurAiTutorGuidedDisplayState', () => {
  it('keeps a guided selection target on the inline guidance surface even if ask-modal state is stale', () => {
    render(
      <GuidedDisplayHarness
        guidedTutorTarget={{
          mode: 'selection',
          kind: 'selection_excerpt',
          selectedText: '2 + 2',
        }}
      />
    );

    expect(screen.getByTestId('ask-modal-mode')).toHaveTextContent('false');
    expect(screen.getByTestId('selection-guidance')).toHaveTextContent('true');
    expect(screen.getByTestId('guided-mode')).toHaveTextContent('selection');
  });

  it('keeps the pending selected-text handoff on the inline guidance surface even if ask-modal state is stale', () => {
    render(<GuidedDisplayHarness selectionResponsePending={{ selectedText: '2 + 2' }} />);

    expect(screen.getByTestId('ask-modal-mode')).toHaveTextContent('false');
    expect(screen.getByTestId('selection-guidance')).toHaveTextContent('true');
    expect(screen.getByTestId('guided-mode')).toHaveTextContent('null');
  });
});
