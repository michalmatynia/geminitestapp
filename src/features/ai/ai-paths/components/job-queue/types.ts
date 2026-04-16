import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';

import type { 
  QueueHistoryEntry, 
  QueueStatus, 
  RunDetail, 
  StreamConnectionStatus 
} from '../job-queue-panel-utils';

export type JobQueueContextValue = {
  // State
  pathFilter: string;
  setPathFilter: (q: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  pageSize: number;
  setPageSize: (s: number) => void;
  page: number;
  setPage: (p: number) => void;
  expandedRunIds: Set<string>;
  toggleRun: (runId: string) => void;
  runDetails: Record<string, RunDetail | null>;
  runDetailLoading: Set<string>;
  runDetailErrors: Record<string, string>;
  historySelection: Record<string, string>;
  setHistorySelection: (runId: string, nodeId: string) => void;
  streamStatuses: Record<string, StreamConnectionStatus>;
  pausedStreams: Set<string>;
  toggleStream: (runId: string) => void;
  pauseAllStreams: () => void;
  resumeAllStreams: () => void;
  autoRefreshEnabled: boolean;
  setAutoRefreshEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  autoRefreshInterval: number;
  setAutoRefreshInterval: (i: number) => void;
  showMetricsPanel: boolean;
  setShowMetricsPanel: React.Dispatch<React.SetStateAction<boolean>>;
  queueHistory: QueueHistoryEntry[];
  setQueueHistory: React.Dispatch<React.SetStateAction<QueueHistoryEntry[]>>;
  clearScope: 'terminal' | 'all' | null;
  setClearScope: (s: 'terminal' | 'all' | null) => void;
  runToDelete: AiPathRunRecord | null;
  setRunToDelete: (r: AiPathRunRecord | null) => void;

  // Derived
  panelLabel: string;
  panelDescription: string;
  lagThresholdMs: number;
  runs: AiPathRunRecord[];
  total: number;
  totalPages: number;
  queueStatus: QueueStatus | undefined;
  isLoadingRuns: boolean;
  isLoadingQueueStatus: boolean;
  runsQueryError: unknown;
  isClearingRuns: boolean;
  isCancelingRun: (runId: string) => boolean;
  isDeletingRun: (runId: string) => boolean;

  // Actions
  refetchQueueData: () => void;
  handleClearRuns: (scope: 'terminal' | 'all') => Promise<void>;
  handleResumeRun: (runId: string, mode: 'resume' | 'replay') => Promise<void>;
  handleHandoffRun: (runId: string, reason?: string) => Promise<boolean>;
  handleRetryRunNode: (runId: string, nodeId: string) => Promise<void>;
  handleCancelRun: (runId: string) => Promise<void>;
  handleDeleteRun: (runId: string) => Promise<void>;
  loadRunDetail: (runId: string) => Promise<void>;
};

export type JobQueueActionKey =
  | 'setPathFilter'
  | 'setSearchQuery'
  | 'setStatusFilter'
  | 'setPageSize'
  | 'setPage'
  | 'toggleRun'
  | 'setHistorySelection'
  | 'toggleStream'
  | 'pauseAllStreams'
  | 'resumeAllStreams'
  | 'setAutoRefreshEnabled'
  | 'setAutoRefreshInterval'
  | 'setShowMetricsPanel'
  | 'setQueueHistory'
  | 'setClearScope'
  | 'setRunToDelete'
  | 'refetchQueueData'
  | 'handleClearRuns'
  | 'handleResumeRun'
  | 'handleHandoffRun'
  | 'handleRetryRunNode'
  | 'handleCancelRun'
  | 'handleDeleteRun'
  | 'loadRunDetail';

export type JobQueueActionsValue = Pick<JobQueueContextValue, JobQueueActionKey>;
export type JobQueueStateValue = Omit<JobQueueContextValue, JobQueueActionKey>;
