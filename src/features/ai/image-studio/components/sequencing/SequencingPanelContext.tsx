'use client';

import React, { createContext, useContext } from 'react';
import type { SequenceRunStatus, SequencerDisplayState } from './sequencing-types';
import type { ImageStudioSequenceStep } from '@/features/ai/image-studio/utils/studio-settings';
import { internalError } from '@/shared/errors/app-error';

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
  cropShapeOptions: Array<{ value: string; label: string }>;
  cropShapeGeometryById: Record<
    string,
    {
      bbox: { x: number; y: number; width: number; height: number } | null;
      polygon: Array<{ x: number; y: number }> | null;
    }
  >;
}

const SequencingPanelContext = createContext<SequencingPanelContextValue | null>(null);

export function SequencingPanelProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: SequencingPanelContextValue;
}) {
  return (
    <SequencingPanelContext.Provider value={value}>{children}</SequencingPanelContext.Provider>
  );
}

export function useSequencingPanelContext() {
  const context = useContext(SequencingPanelContext);
  if (!context) {
    throw internalError('useSequencingPanelContext must be used within SequencingPanelProvider');
  }
  return context;
}
