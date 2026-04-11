import type { LabelValueOptionDto as AiPathRunDisplayModel } from '@/shared/contracts/ui/base';
import type {
  AlertEvidenceContext as WorkerAlertEvidenceContext,
  AlertEvidenceSample as WorkerAlertEvidenceSample,
} from '@/shared/lib/observability/workers/system-log-alerts/types';

export type { AiPathRunDisplayModel };

export type ContextDocumentSectionDisplay = {
  id: string | null;
  kind: string | null;
  title: string;
  summary: string | null;
  text: string | null;
  items: Array<Record<string, string>>;
};

export type ContextDocumentDisplay = {
  id: string;
  entityType: string | null;
  title: string;
  summary: string | null;
  status: string | null;
  tags: string[];
  facts: AiPathRunDisplayModel[];
  sections: ContextDocumentSectionDisplay[];
};

export type ContextRegistryNodeDisplay = {
  id: string;
  kind: string | null;
  name: string;
};

export type ContextRegistryDisplay = {
  refs: string[];
  documents: ContextDocumentDisplay[];
  nodes: ContextRegistryNodeDisplay[];
};

export type AlertEvidenceSampleDisplay = {
  logId: WorkerAlertEvidenceSample['logId'] | null;
  createdAt: WorkerAlertEvidenceSample['createdAt'] | null;
  level: WorkerAlertEvidenceSample['level'] | null;
  source: WorkerAlertEvidenceSample['source'] | null;
  message: WorkerAlertEvidenceSample['message'] | null;
  fingerprint: WorkerAlertEvidenceSample['fingerprint'] | null;
  contextRegistry: ContextRegistryDisplay | null;
};

export type AlertEvidenceDisplay = {
  matchedCount: WorkerAlertEvidenceContext['matchedCount'] | null;
  sampleSize: WorkerAlertEvidenceContext['sampleSize'] | null;
  windowStart: WorkerAlertEvidenceContext['windowStart'] | null;
  windowEnd: WorkerAlertEvidenceContext['windowEnd'] | null;
  lastObservedLog: AlertEvidenceSampleDisplay | null;
  samples: AlertEvidenceSampleDisplay[];
};
