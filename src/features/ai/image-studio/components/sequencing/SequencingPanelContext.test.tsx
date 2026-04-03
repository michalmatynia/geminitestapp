// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SequencingPanelProvider, useSequencingPanelContext } from './SequencingPanelContext';

const createSequencingPanelValue = () =>
  ({
    handleStartSequence: vi.fn(),
    handleCancelSequence: vi.fn(),
    handleRetryPendingSlotSync: vi.fn(),
    mutateSteps: vi.fn(),
    isSequenceRunning: false,
    projectId: 'project-1',
    workingSlotPresent: true,
    sequencingEnabled: true,
    enabledStepsCount: 1,
    activeSequenceRunId: null,
    activeSequenceStatus: null,
    displayState: 'idle',
    activeStepLabel: null,
    slotSyncWarning: null,
    pendingTerminalSlotId: null,
    sequenceError: null,
    sequenceLog: [],
    editableSequenceSteps: [],
    enabledRuntimeSteps: [],
    activeGenerationModel: 'gpt-image-1',
    sequencerFieldTooltipsEnabled: false,
    cropShapeOptions: [],
    cropShapeGeometryById: {},
  }) satisfies React.ComponentProps<typeof SequencingPanelProvider>['value'];

describe('SequencingPanelContext', () => {
  it('throws outside the provider', () => {
    expect(() => renderHook(() => useSequencingPanelContext())).toThrow(
      'useSequencingPanelContext must be used within SequencingPanelProvider'
    );
  });

  it('returns the provided panel runtime', () => {
    const value = createSequencingPanelValue();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SequencingPanelProvider value={value}>{children}</SequencingPanelProvider>
    );

    const { result } = renderHook(() => useSequencingPanelContext(), { wrapper });

    expect(result.current).toBe(value);
  });
});
