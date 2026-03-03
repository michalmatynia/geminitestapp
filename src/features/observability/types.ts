export type AiPathRunDisplayModel = {
  label: string;
  value: string;
};

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
  logId: string | null;
  createdAt: string | null;
  level: string | null;
  source: string | null;
  message: string | null;
  fingerprint: string | null;
  contextRegistry: ContextRegistryDisplay | null;
};

export type AlertEvidenceDisplay = {
  matchedCount: number | null;
  sampleSize: number | null;
  windowStart: string | null;
  windowEnd: string | null;
  lastObservedLog: AlertEvidenceSampleDisplay | null;
  samples: AlertEvidenceSampleDisplay[];
};
