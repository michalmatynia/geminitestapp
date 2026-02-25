import type { ImageStudioSequenceStep } from '../../utils/studio-settings';

export type SequenceRunStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type SequenceRunHistoryEvent = {
  id: string;
  type: string;
  source: 'api' | 'queue' | 'worker' | 'stream' | 'client';
  message: string;
  at: string;
  payload?: Record<string, unknown>;
};

export type SequenceRunRecord = {
  id: string;
  sourceSlotId: string;
  status: SequenceRunStatus;
  currentSlotId: string;
  activeStepIndex: number | null;
  activeStepId: string | null;
  outputSlotIds: string[];
  errorMessage: string | null;
  cancelRequested: boolean;
  request: {
    steps?: ImageStudioSequenceStep[];
  };
  historyEvents: SequenceRunHistoryEvent[];
};

export type SequenceRunsListResponse = {
  runs: SequenceRunRecord[];
  total: number;
};

export type SequenceRunDetailResponse = {
  run: SequenceRunRecord;
  currentSlot?: {
    id: string | null;
    imagePath: string | null;
    renderable: boolean;
  };
};

export type SequenceRunStartResponse = {
  runId: string;
  status: SequenceRunStatus;
  dispatchMode: 'queued' | 'inline';
  currentSlotId: string;
  stepCount: number;
};

export type SequencerDisplayState =
  | 'idle'
  | 'running'
  | 'resolving_terminal_slot'
  | 'terminal';
