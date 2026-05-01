import type { ChangeEvent, JSX } from 'react';

import { FormField, FormSection, Hint, SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { UI_GRID_ROOMY_CLASSNAME } from '@/shared/ui/layout';
import { Input } from '@/shared/ui/primitives.public';

import {
  PRODUCT_SCANNER_AMAZON_CANDIDATE_EVALUATOR_LANGUAGE_DETECTION_MODE_OPTIONS,
  PRODUCT_SCANNER_AMAZON_CANDIDATE_EVALUATOR_MODE_OPTIONS,
  PRODUCT_SCANNER_AMAZON_CANDIDATE_EVALUATOR_SIMILARITY_MODE_OPTIONS,
  type ProductScannerSettingsDraft,
} from '../../scanner-settings';
import {
  resolveAmazonEvaluatorPolicyLines,
  resolveAmazonEvaluatorSummaryLines,
  toUnitInterval,
} from './adminProductScannerSettings.copy';
import type {
  AmazonEvaluatorConfig,
  AmazonEvaluatorKey,
  BrainModelOptionsView,
  ScannerDraftSetter,
  SelectOption,
} from './adminProductScannerSettings.types';

const AMAZON_EVALUATOR_CONFIGS: Record<AmazonEvaluatorKey, AmazonEvaluatorConfig> = {
  amazonCandidateEvaluatorTriage: {
    stage: 'triage',
    draftKey: 'amazonCandidateEvaluatorTriage',
    title: 'Amazon Candidate Triage',
    description: 'Lightweight AI review of Google-returned Amazon candidates before any Amazon page is opened.',
    modeLabel: 'Triage Mode',
    modeAriaLabel: 'Select Amazon candidate triage mode',
    modelAriaLabel: 'Select Amazon candidate triage model',
    thresholdAriaLabel: 'Amazon candidate triage confidence threshold',
    similarityAriaLabel: 'Select Amazon candidate triage similarity decision mode',
    scopeAriaLabel: 'Only evaluate ambiguous Amazon triage candidates',
    languageGateAriaLabel: 'Reject non-English Amazon content in triage stage',
    languageDetectionAriaLabel: 'Select Amazon candidate triage language detection mode',
    allowedLanguageAriaLabel: 'Allowed Amazon triage content language',
    modelDescription: 'Current effective model for the triage checkpoint.',
    overrideDescription: 'Choose a lightweight text-capable model from the AI Brain catalog.',
    thresholdDescription: 'Minimum evaluator confidence required before a Google candidate stays in the queue.',
    scopeDescription: 'Run triage only when Google-returned Amazon candidates are ambiguous.',
    languageGateDescription: 'Discard Amazon candidates from non-English marketplaces when visible content is unlikely to be acceptable.',
    languageDetectionDescription: 'Choose whether marketplace/domain hints can reject non-English candidates before AI runs.',
    loadingFallback: 'The triage evaluator reviews only Google result metadata so cost and latency stay below full Amazon page evaluation.',
  },
  amazonCandidateEvaluatorProbe: {
    stage: 'probe',
    draftKey: 'amazonCandidateEvaluatorProbe',
    title: 'Amazon Probe Evaluator',
    description: 'Optional AI gate that reviews each Amazon candidate before extraction is attempted.',
    modeLabel: 'Probe Evaluator Mode',
    modeAriaLabel: 'Select Amazon probe evaluator mode',
    modelAriaLabel: 'Select Amazon probe evaluator model',
    thresholdAriaLabel: 'Amazon probe evaluator confidence threshold',
    similarityAriaLabel: 'Select Amazon probe evaluator similarity decision mode',
    scopeAriaLabel: 'Only evaluate ambiguous Amazon probe candidates',
    languageGateAriaLabel: 'Reject non-English Amazon content in probe stage',
    languageDetectionAriaLabel: 'Select Amazon probe evaluator language detection mode',
    allowedLanguageAriaLabel: 'Allowed Amazon content language',
    modelDescription: 'Current effective model for the evaluator checkpoint.',
    overrideDescription: 'Choose a vision-capable model from the AI Brain catalog.',
    thresholdDescription: 'Minimum evaluator confidence required before trusting the Amazon page.',
    scopeDescription: 'Run the evaluator only when Amazon candidates are ambiguous.',
    languageGateDescription: 'Reject matching Amazon pages when their visible content is not English.',
    languageDetectionDescription: 'Choose whether probe hints can reject non-English pages before AI runs.',
    loadingFallback: 'The probe evaluator compares the Amazon page image and text before extraction is trusted.',
  },
  amazonCandidateEvaluatorExtraction: {
    stage: 'extraction',
    draftKey: 'amazonCandidateEvaluatorExtraction',
    title: 'Amazon Extraction Evaluator',
    description: 'AI gate that validates the extracted Amazon product page before ASIN update.',
    modeLabel: 'Extraction Evaluator Mode',
    modeAriaLabel: 'Select Amazon extraction evaluator mode',
    modelAriaLabel: 'Select Amazon extraction evaluator model',
    thresholdAriaLabel: 'Amazon extraction evaluator confidence threshold',
    similarityAriaLabel: 'Select Amazon extraction evaluator similarity decision mode',
    scopeAriaLabel: 'Only evaluate ambiguous Amazon extraction candidates',
    languageGateAriaLabel: 'Reject non-English Amazon content in extraction stage',
    languageDetectionAriaLabel: 'Select Amazon extraction evaluator language detection mode',
    allowedLanguageAriaLabel: 'Allowed Amazon content language',
    modelDescription: 'Current effective model for the evaluator checkpoint.',
    overrideDescription: 'Choose a vision-capable model from the AI Brain catalog.',
    thresholdDescription: 'Minimum evaluator confidence required before trusting the Amazon page.',
    scopeDescription: 'Run the evaluator only when Amazon candidates are ambiguous.',
    languageGateDescription: 'Reject matching Amazon pages when their visible content is not English.',
    languageDetectionDescription: 'Choose whether probe hints can reject non-English pages before AI runs.',
    loadingFallback: 'The extraction evaluator confirms the same product before updating product data.',
  },
};

type AmazonEvaluator = ProductScannerSettingsDraft[AmazonEvaluatorKey];

const updateEvaluator = (
  setDraft: ScannerDraftSetter,
  key: AmazonEvaluatorKey,
  patch: Partial<AmazonEvaluator>
): void => {
  setDraft((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
};

const modeFromValue = (value: string): AmazonEvaluator['mode'] => {
  if (value === 'brain_default' || value === 'model_override') return value;
  return 'disabled';
};

const similarityFromValue = (value: string): AmazonEvaluator['candidateSimilarityMode'] =>
  value === 'deterministic_then_ai' ? 'deterministic_then_ai' : 'ai_only';

const EvaluatorModeField = (props: {
  config: AmazonEvaluatorConfig;
  evaluator: AmazonEvaluator;
  setDraft: ScannerDraftSetter;
}): JSX.Element => (
  <FormField label={props.config.modeLabel} description='Choose whether this scanner step uses the AI Brain default model or a scanner-specific override.'>
    <SelectSimple
      size='sm'
      value={props.evaluator.mode}
      onValueChange={(value) => updateEvaluator(props.setDraft, props.config.draftKey, { mode: modeFromValue(value) })}
      options={[...PRODUCT_SCANNER_AMAZON_CANDIDATE_EVALUATOR_MODE_OPTIONS]}
      placeholder='Select evaluator mode'
      ariaLabel={props.config.modeAriaLabel}
      title={props.config.modeAriaLabel}
    />
  </FormField>
);

const OverrideModelField = (props: {
  config: AmazonEvaluatorConfig;
  evaluator: AmazonEvaluator;
  modelOptions: SelectOption[];
  setDraft: ScannerDraftSetter;
}): JSX.Element | null => {
  if (props.evaluator.mode !== 'model_override') return null;
  return (
    <FormField label='Override Model' description={props.config.overrideDescription}>
      <SelectSimple
        size='sm'
        value={props.evaluator.modelId ?? ''}
        onValueChange={(value) => updateEvaluator(props.setDraft, props.config.draftKey, { modelId: value.trim().length > 0 ? value : null })}
        options={[...props.modelOptions]}
        placeholder='Select evaluator model'
        ariaLabel={props.config.modelAriaLabel}
        title={props.config.modelAriaLabel}
      />
    </FormField>
  );
};

const SimilarityField = (props: {
  config: AmazonEvaluatorConfig;
  evaluator: AmazonEvaluator;
  setDraft: ScannerDraftSetter;
}): JSX.Element => (
  <FormField label='Similarity Decision' description='Choose whether deterministic identifier matches can bypass AI review.'>
    <SelectSimple
      size='sm'
      value={props.evaluator.candidateSimilarityMode}
      onValueChange={(value) => {
        const nextMode = similarityFromValue(value);
        updateEvaluator(props.setDraft, props.config.draftKey, {
          candidateSimilarityMode: nextMode,
          onlyForAmbiguousCandidates: nextMode === 'ai_only' ? false : props.evaluator.onlyForAmbiguousCandidates,
        });
      }}
      options={[...PRODUCT_SCANNER_AMAZON_CANDIDATE_EVALUATOR_SIMILARITY_MODE_OPTIONS]}
      placeholder='Select similarity decision mode'
      ariaLabel={props.config.similarityAriaLabel}
      title={props.config.similarityAriaLabel}
    />
  </FormField>
);

const ScopeField = (props: {
  config: AmazonEvaluatorConfig;
  evaluator: AmazonEvaluator;
  setDraft: ScannerDraftSetter;
}): JSX.Element => (
  <FormField label='Evaluation Scope' description={props.config.scopeDescription}>
    <label className='inline-flex items-center gap-2 text-sm'>
      <input
        type='checkbox'
        checked={props.evaluator.onlyForAmbiguousCandidates}
        disabled={props.evaluator.candidateSimilarityMode === 'ai_only'}
        onChange={(event: ChangeEvent<HTMLInputElement>) => updateEvaluator(props.setDraft, props.config.draftKey, { onlyForAmbiguousCandidates: event.target.checked })}
        aria-label={props.config.scopeAriaLabel}
        title={props.config.scopeAriaLabel}
      />
      Only evaluate ambiguous candidates
    </label>
    {props.evaluator.candidateSimilarityMode === 'ai_only' ? (
      <Hint>AI-only similarity review always evaluates every Amazon candidate.</Hint>
    ) : null}
  </FormField>
);

const ThresholdField = (props: {
  config: AmazonEvaluatorConfig;
  evaluator: AmazonEvaluator;
  setDraft: ScannerDraftSetter;
}): JSX.Element => (
  <FormField label='Confidence Threshold' description={props.config.thresholdDescription}>
    <Input
      type='number'
      min={0}
      max={1}
      step={0.05}
      value={props.evaluator.threshold}
      onChange={(event: ChangeEvent<HTMLInputElement>) => updateEvaluator(props.setDraft, props.config.draftKey, { threshold: toUnitInterval(event.target.value, props.evaluator.threshold) })}
      aria-label={props.config.thresholdAriaLabel}
      title={props.config.thresholdAriaLabel}
    />
  </FormField>
);

const LanguageFields = (props: {
  config: AmazonEvaluatorConfig;
  evaluator: AmazonEvaluator;
  setDraft: ScannerDraftSetter;
}): JSX.Element => (
  <>
    <FormField label='Allowed Content Language' description='Trusted extraction currently targets English product fields.'>
      <Input value='English' readOnly aria-label={props.config.allowedLanguageAriaLabel} />
    </FormField>
    <FormField label='Language Gate' description={props.config.languageGateDescription}>
      <label className='inline-flex items-center gap-2 text-sm'>
        <input
          type='checkbox'
          checked={props.evaluator.rejectNonEnglishContent}
          onChange={(event: ChangeEvent<HTMLInputElement>) => updateEvaluator(props.setDraft, props.config.draftKey, { rejectNonEnglishContent: event.target.checked })}
          aria-label={props.config.languageGateAriaLabel}
          title={props.config.languageGateAriaLabel}
        />
        Reject non-English Amazon content
      </label>
    </FormField>
    <FormField label='Language Detection' description={props.config.languageDetectionDescription}>
      <SelectSimple
        size='sm'
        value={props.evaluator.languageDetectionMode}
        onValueChange={(value) => updateEvaluator(props.setDraft, props.config.draftKey, { languageDetectionMode: value === 'ai_only' ? 'ai_only' : 'deterministic_then_ai' })}
        options={[...PRODUCT_SCANNER_AMAZON_CANDIDATE_EVALUATOR_LANGUAGE_DETECTION_MODE_OPTIONS]}
        placeholder='Select language detection mode'
        ariaLabel={props.config.languageDetectionAriaLabel}
        title={props.config.languageDetectionAriaLabel}
      />
    </FormField>
  </>
);

const LinesPanel = (props: { title: string; lines: string[]; muted?: boolean }): JSX.Element => (
  <div className={`mt-4 space-y-2 rounded-md border border-border/60 ${props.muted === true ? 'bg-muted/20' : 'bg-background/70'} px-3 py-3 text-xs text-muted-foreground`}>
    <p className='font-medium uppercase tracking-wide text-foreground'>{props.title}</p>
    <ul className='space-y-1'>
      {props.lines.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  </div>
);

export const AdminAmazonEvaluatorSection = (props: {
  draftKey: AmazonEvaluatorKey;
  draft: ProductScannerSettingsDraft;
  setDraft: ScannerDraftSetter;
  modelOptions: SelectOption[];
  effectiveModelLabel: string;
  brain: BrainModelOptionsView;
}): JSX.Element => {
  const config = AMAZON_EVALUATOR_CONFIGS[props.draftKey];
  const evaluator = props.draft[props.draftKey];
  return (
    <FormSection title={config.title} description={config.description} className='p-6'>
      <div className={`${UI_GRID_ROOMY_CLASSNAME} md:grid-cols-2`}>
        <EvaluatorModeField config={config} evaluator={evaluator} setDraft={props.setDraft} />
        <FormField label='Resolved Model' description={config.modelDescription}>
          <Input value={props.effectiveModelLabel} readOnly aria-label={`Resolved ${config.title.toLowerCase()} model`} title={`Resolved ${config.title.toLowerCase()} model`} />
        </FormField>
        <OverrideModelField config={config} evaluator={evaluator} modelOptions={props.modelOptions} setDraft={props.setDraft} />
        <ThresholdField config={config} evaluator={evaluator} setDraft={props.setDraft} />
        <SimilarityField config={config} evaluator={evaluator} setDraft={props.setDraft} />
        <ScopeField config={config} evaluator={evaluator} setDraft={props.setDraft} />
        <LanguageFields config={config} evaluator={evaluator} setDraft={props.setDraft} />
      </div>
      <div className='mt-4 text-xs text-muted-foreground'>
        {props.brain.isLoading ? 'Loading AI Brain model options.' : props.brain.sourceWarnings[0] ?? config.loadingFallback}
      </div>
      <LinesPanel title='Evaluator Summary' lines={resolveAmazonEvaluatorSummaryLines(evaluator, props.effectiveModelLabel)} />
      <LinesPanel title='Runtime Policy' lines={resolveAmazonEvaluatorPolicyLines(evaluator)} muted />
    </FormSection>
  );
};
