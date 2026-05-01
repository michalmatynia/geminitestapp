import type { Dispatch, SetStateAction } from 'react';

import type { ProductScannerSettingsDraft } from '../../scanner-settings';

export type ScannerDraftSetter = Dispatch<SetStateAction<ProductScannerSettingsDraft>>;

export type SelectOption = {
  value: string;
  label: string;
};

export type BrainModelOptionsView = {
  models: string[];
  effectiveModelId: string;
  isLoading: boolean;
  sourceWarnings: string[];
};

export type AmazonEvaluatorKey =
  | 'amazonCandidateEvaluatorTriage'
  | 'amazonCandidateEvaluatorProbe'
  | 'amazonCandidateEvaluatorExtraction';

export type AmazonEvaluatorStage = 'triage' | 'probe' | 'extraction';

export type AmazonEvaluatorConfig = {
  stage: AmazonEvaluatorStage;
  draftKey: AmazonEvaluatorKey;
  title: string;
  description: string;
  modeLabel: string;
  modeAriaLabel: string;
  modelAriaLabel: string;
  thresholdAriaLabel: string;
  similarityAriaLabel: string;
  scopeAriaLabel: string;
  languageGateAriaLabel: string;
  languageDetectionAriaLabel: string;
  allowedLanguageAriaLabel: string;
  modelDescription: string;
  overrideDescription: string;
  thresholdDescription: string;
  scopeDescription: string;
  languageGateDescription: string;
  languageDetectionDescription: string;
  loadingFallback: string;
};
