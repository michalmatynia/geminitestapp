import type { ImageFileRecord } from '@/shared/contracts/files';
import type { ImageStudioRunStatus } from '@/shared/contracts/image-studio/base';
import type { RunStudioEnqueueResult, RunStudioPayload } from '@/shared/contracts/image-studio/run';

import type { UseMutationResult } from '@tanstack/react-query';

export interface GenerationRecord {
  id: string;
  timestamp: string;
  prompt: string;
  maskShapeCount: number;
  maskInvert: boolean;
  maskFeather: number;
  outputs: ImageFileRecord[];
  slotId: string;
  slotName: string;
}

export interface GenerationLandingSlot {
  id: string;
  index: number;
  status: 'pending' | 'completed' | 'failed';
  output: ImageFileRecord | null;
}

export interface GenerationState {
  runMutation: UseMutationResult<RunStudioEnqueueResult, Error, RunStudioPayload>;
  runOutputs: ImageFileRecord[];
  maskEligibleCount: number;
  generationHistory: GenerationRecord[];
  activeRunId: string | null;
  activeRunSourceSlotId: string | null;
  activeRunStatus: ImageStudioRunStatus | null;
  activeRunError: string | null;
  isRunInFlight: boolean;
  landingSlots: GenerationLandingSlot[];
}

export interface GenerationActions {
  handleRunGeneration: () => void;
  restoreGeneration: (record: GenerationRecord) => void;
  clearActiveRunError: () => void;
  removeGenerationRecord: (recordId: string) => Promise<void>;
}
