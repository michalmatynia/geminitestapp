import 'server-only';

import type { UnknownRecordDto } from '@/shared/contracts/base';
import type {
  AgentAuditLogRecord,
  AgentBrowserLogRecord,
  AgentBrowserSnapshotRecord,
  AgentRunStatusType,
} from '@/shared/contracts/agent-runtime';

type StoreDelegateArgs = UnknownRecordDto;

export type AgentRuntimeRunRecord = {
  id: string;
  prompt: string;
  model: string | null;
  tools?: unknown;
  searchProvider: string | null;
  memoryKey: string | null;
  personaId: string | null;
  planState: unknown;
  agentBrowser: string | null;
  runHeadless: boolean | null;
  requiresHumanIntervention: boolean | null;
  errorMessage: string | null;
  recordingPath: string | null;
  activeStepId: string | null;
  startedAt: Date | string | null;
  finishedAt: Date | string | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  status: AgentRunStatusType;
};

export type AgentMemoryItemRecord = {
  id?: string;
  content: string;
  metadata?: unknown;
};

export type AgentLongTermMemoryRecord = {
  id: string;
  content: string;
  summary: string | null;
  metadata?: unknown;
  tags?: string[];
  updatedAt?: Date | string | null;
};

type ChatbotAgentRunDelegate = {
  create<TRow = AgentRuntimeRunRecord>(args: StoreDelegateArgs): Promise<TRow>;
  findUnique<TRow = AgentRuntimeRunRecord>(args: StoreDelegateArgs): Promise<TRow | null>;
  findFirst<TRow = AgentRuntimeRunRecord>(args: StoreDelegateArgs): Promise<TRow | null>;
  findMany<TRow = AgentRuntimeRunRecord>(args: StoreDelegateArgs): Promise<TRow[]>;
  update<TRow = AgentRuntimeRunRecord>(args: StoreDelegateArgs): Promise<TRow>;
  delete<TRow = unknown>(args: StoreDelegateArgs): Promise<TRow>;
  deleteMany<TRow = { count: number }>(args: StoreDelegateArgs): Promise<TRow>;
};

type AgentAuditLogDelegate = {
  create<TRow = unknown>(args: StoreDelegateArgs): Promise<TRow>;
  findFirst<TRow = AgentAuditLogRecord>(args: StoreDelegateArgs): Promise<TRow | null>;
  findMany<TRow = AgentAuditLogRecord>(args: StoreDelegateArgs): Promise<TRow[]>;
};

type AgentBrowserSnapshotDelegate = {
  create<TRow = AgentBrowserSnapshotRecord>(args: StoreDelegateArgs): Promise<TRow>;
  findFirst<TRow = AgentBrowserSnapshotRecord>(args: StoreDelegateArgs): Promise<TRow | null>;
  findUnique<TRow = AgentBrowserSnapshotRecord>(args: StoreDelegateArgs): Promise<TRow | null>;
  findMany<TRow = AgentBrowserSnapshotRecord>(args: StoreDelegateArgs): Promise<TRow[]>;
};

type AgentBrowserLogDelegate = {
  create<TRow = unknown>(args: StoreDelegateArgs): Promise<TRow>;
  findMany<TRow = AgentBrowserLogRecord>(args: StoreDelegateArgs): Promise<TRow[]>;
  count(args: StoreDelegateArgs): Promise<number>;
};

type AgentMemoryItemDelegate = {
  create<TRow = AgentMemoryItemRecord>(args: StoreDelegateArgs): Promise<TRow>;
  findMany<TRow = AgentMemoryItemRecord>(args: StoreDelegateArgs): Promise<TRow[]>;
};

type AgentLongTermMemoryDelegate = {
  create<TRow = AgentLongTermMemoryRecord>(args: StoreDelegateArgs): Promise<TRow>;
  findMany<TRow = AgentLongTermMemoryRecord>(args: StoreDelegateArgs): Promise<TRow[]>;
  updateMany<TRow = unknown>(args: StoreDelegateArgs): Promise<TRow>;
};

type ChatbotMessageDelegate = {
  findMany<TRow = unknown>(args: StoreDelegateArgs): Promise<TRow[]>;
};

export const getChatbotAgentRunDelegate = (): ChatbotAgentRunDelegate | null => null;

export const getAgentAuditLogDelegate = (): AgentAuditLogDelegate | null => null;

export const getAgentBrowserSnapshotDelegate = (): AgentBrowserSnapshotDelegate | null => null;

export const getAgentBrowserLogDelegate = (): AgentBrowserLogDelegate | null => null;

export const getAgentMemoryItemDelegate = (): AgentMemoryItemDelegate | null => null;

export const getAgentLongTermMemoryDelegate = (): AgentLongTermMemoryDelegate | null => null;

export const getChatbotMessageDelegate = (): ChatbotMessageDelegate | null => null;
