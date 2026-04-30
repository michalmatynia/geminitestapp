export type ScanFailureArtifact = {
  name: string;
  path: string;
  kind: string | null;
  mimeType: string | null;
};

export type ScanRuntimePosture = {
  browserLabel: string | null;
  browserEngine: string | null;
  headless: boolean | null;
  identityProfile: string | null;
  locale: string | null;
  timezoneId: string | null;
  proxyEnabled: boolean | null;
  proxyProviderPreset: string | null;
  proxySessionMode: string | null;
  proxyReason: string | null;
  proxyServerHost: string | null;
  stickyStorageEnabled: boolean | null;
  stickyStorageLoaded: boolean | null;
};

export type ScanDiagnostics = {
  runId: string | null;
  runStatus: string | null;
  imageSearchProvider: string | null;
  imageSearchPageUrl: string | null;
  latestStage: string | null;
  latestStageUrl: string | null;
  amazonAiStages: AmazonAiStageEvidence[];
  failureArtifacts: ScanFailureArtifact[];
  runtimePosture: ScanRuntimePosture | null;
  logTail: string[];
};

export type RecordedDiagnosticArtifact = {
  filename: string;
  sizeBytes: number;
  mtime: string;
  mimeType: string;
};

export type RecordedDiagnosticClassification = {
  kind: string;
  details: {
    reason: string;
    recovery?: {
      automaticRetryAttempted?: boolean;
      automaticRetrySkipped?: boolean;
      manualFallbackOpened?: boolean;
      recoveryPath?: string | null;
      latestCaptchaStage?: string | null;
    };
  };
};

export type RecordedDiagnosticResponse = {
  scanId: string;
  provider: string;
  status: string;
  classification: RecordedDiagnosticClassification;
  artifacts: RecordedDiagnosticArtifact[];
};

export type AmazonAiStageEvidence = {
  stage: 'candidate_triage' | 'probe_evaluate' | 'extraction_evaluate';
  status: string | null;
  model: string | null;
  threshold: number | null;
  candidateRankBefore: number | null;
  candidateRankAfter: number | null;
  recommendedAction: string | null;
  rejectionCategory: string | null;
  pageLanguage: string | null;
  languageAccepted: boolean | null;
  topReasons: string[];
  provider: string | null;
  evaluatedAt: string | null;
};

export type ProductScanDiagnosticFailureSummary = {
  phaseLabel: string;
  sourceLabel: string | null;
  stepLabel: string;
  message: string | null;
  resultCodeLabel: string | null;
  url: string | null;
  timingLabel: string | null;
};
