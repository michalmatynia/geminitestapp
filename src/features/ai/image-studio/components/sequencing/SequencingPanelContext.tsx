'use client';

import React from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { ImageStudioSequenceStep } from '@/features/ai/image-studio/utils/studio-settings';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

import type { SequenceRunStatus, SequencerDisplayState } from './sequencing-types';

export interface SequencingPanelContextValue {
  // Actions
  handleStartSequence: () => void;
  handleCancelSequence: () => void;
  handleRetryPendingSlotSync: () => void;
  mutateSteps: (updater: (steps: ImageStudioSequenceStep[]) => ImageStudioSequenceStep[]) => void;

  // State
  isSequenceRunning: boolean;
  projectId: string;
  workingSlotPresent: boolean;
  sequencingEnabled: boolean;
  enabledStepsCount: number;
  activeSequenceRunId: string | null;
  activeSequenceStatus: SequenceRunStatus | null;
  displayState: SequencerDisplayState;
  activeStepLabel: string | null;
  slotSyncWarning: string | null;
  pendingTerminalSlotId: string | null;
  sequenceError: string | null;
  sequenceLog: string[];

  // Data for Stack
  editableSequenceSteps: ImageStudioSequenceStep[];
  enabledRuntimeSteps: ImageStudioSequenceStep[];
  activeGenerationModel: string;
  sequencerFieldTooltipsEnabled: boolean;
  cropShapeOptions: Array<LabeledOptionDto<string>>;
  cropShapeGeometryById: Record<
    string,
    {
      bbox: { x: number; y: number; width: number; height: number } | null;
      polygon: Array<{ x: number; y: number }> | null;
    }
  >;
}

const { Context: SequencingPanelContext, useStrictContext: useSequencingPanelContext } =
  createStrictContext<SequencingPanelContextValue>({
    hookName: 'useSequencingPanelContext',
    providerName: 'SequencingPanelProvider',
    displayName: 'SequencingPanelContext',
    errorFactory: internalError,
  });

export function SequencingPanelProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: SequencingPanelContextValue;
}): React.JSX.Element {
  return (
    <SequencingPanelContext.Provider value={value}>{children}</SequencingPanelContext.Provider>
  );
}
export { useSequencingPanelContext };
