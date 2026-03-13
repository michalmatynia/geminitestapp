/**
 * @vitest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DEFAULT_KANGUR_AI_TUTOR_CONTENT } from '@/shared/contracts/kangur-ai-tutor-content';

import { useKangurAiTutorPanelDerivedState } from './KangurAiTutorWidget.panel-derived';

import type { KangurAiTutorRuntimeMessage } from '@/shared/contracts/kangur-ai-tutor';

type PanelDerivedInput = Parameters<typeof useKangurAiTutorPanelDerivedState>[0];

const baseInput: PanelDerivedInput = {
  activeFocus: { kind: 'selection', label: 'Zaznaczenie' },
  activeSelectedText: null,
  askModalHelperText: 'Napisz pytanie do tutora',
  bubblePlacementLaunchOrigin: 'dock-bottom-right',
  bubblePlacementMode: 'bubble',
  canStartHomeOnboardingManually: false,
  contextSwitchNotice: null,
  emptyStateMessage: 'Zapytaj tutora',
  focusChipLabel: null,
  guidedTutorTarget: null,
  highlightedSection: null,
  inputValue: '',
  isAskModalMode: false,
  isGuidedTutorMode: false,
  isOpen: true,
  isSectionExplainPendingMode: false,
  isSelectionExplainPendingMode: false,
  messages: [] as KangurAiTutorRuntimeMessage[],
  sessionContext: { contentId: null, surface: null, title: null },
  showSectionExplainCompleteState: false,
  showSelectionExplainCompleteState: false,
  showSources: false,
  shouldRenderGuestIntroUi: false,
  tutorContent: DEFAULT_KANGUR_AI_TUTOR_CONTENT,
  tutorName: 'Pomocnik',
  tutorNarrationObservedText: '',
  usageSummary: null,
  viewportWidth: 1280,
  visibleProactiveNudge: null,
};

describe('useKangurAiTutorPanelDerivedState', () => {
  it('limits ask-modal narration to the input field text', () => {
    const inputValue = 'Ile to 2 + 2?';
    const observedText = 'Pomoc w zadaniu';

    const { result } = renderHook(() =>
      useKangurAiTutorPanelDerivedState({
        ...baseInput,
        isAskModalMode: true,
        inputValue,
        tutorNarrationObservedText: observedText,
      })
    );

    const narrationText = result.current.tutorNarrationScript.segments
      .map((segment) => segment.text)
      .join('\n');

    expect(narrationText).toContain(inputValue);
    expect(narrationText).not.toContain(observedText);
  });
});
