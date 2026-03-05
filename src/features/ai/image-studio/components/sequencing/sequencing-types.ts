import type { ImageStudioSequenceStep } from '@/features/ai/image-studio/utils/studio-settings';
import type {
  ImageStudioSequenceRunStartResponse,
  ImageStudioSequenceRunHistoryEvent,
  ImageStudioSequenceRunStatus,
  RunsTotalResponseDto,
} from '@/shared/contracts/image-studio';

export type SequenceRunStatus = ImageStudioSequenceRunStatus;

export type SequenceRunHistoryEvent = ImageStudioSequenceRunHistoryEvent;

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

export type SequenceRunsListResponse = RunsTotalResponseDto<SequenceRunRecord>;

export type SequenceRunDetailResponse = {
  run: SequenceRunRecord;
  currentSlot?: {
    id: string | null;
    imagePath: string | null;
    renderable: boolean;
  };
};

export type { ImageStudioSequenceRunStartResponse as SequenceRunStartResponse };

export type SequencerDisplayState = 'idle' | 'running' | 'resolving_terminal_slot' | 'terminal';
