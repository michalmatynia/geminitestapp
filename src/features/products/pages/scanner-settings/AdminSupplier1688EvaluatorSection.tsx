import type { ChangeEvent, JSX } from 'react';

import { FormField, FormSection, SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { UI_GRID_ROOMY_CLASSNAME } from '@/shared/ui/layout';
import { Input } from '@/shared/ui/primitives.public';

import {
  PRODUCT_SCANNER_1688_CANDIDATE_EVALUATOR_MODE_OPTIONS,
  type ProductScannerSettingsDraft,
} from '../../scanner-settings';
import {
  resolve1688EvaluatorPolicyLines,
  resolve1688EvaluatorSummaryLines,
  toUnitInterval,
} from './adminProductScannerSettings.copy';
import type {
  BrainModelOptionsView,
  ScannerDraftSetter,
  SelectOption,
} from './adminProductScannerSettings.types';

type SupplierEvaluator = ProductScannerSettingsDraft['scanner1688CandidateEvaluator'];

const updateSupplierEvaluator = (
  setDraft: ScannerDraftSetter,
  patch: Partial<SupplierEvaluator>
): void => {
  setDraft((prev) => ({
    ...prev,
    scanner1688CandidateEvaluator: { ...prev.scanner1688CandidateEvaluator, ...patch },
  }));
};

const modeFromValue = (value: string): SupplierEvaluator['mode'] => {
  if (value === 'brain_default' || value === 'model_override') return value;
  return 'disabled';
};

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

const OverrideModelField = (props: {
  evaluator: SupplierEvaluator;
  modelOptions: SelectOption[];
  setDraft: ScannerDraftSetter;
}): JSX.Element | null => {
  if (props.evaluator.mode !== 'model_override') return null;
  return (
    <FormField label='Override Model' description='Choose a vision-capable model from the AI Brain catalog.'>
      <SelectSimple
        size='sm'
        value={props.evaluator.modelId ?? ''}
        onValueChange={(value) => updateSupplierEvaluator(props.setDraft, { modelId: value.trim().length > 0 ? value : null })}
        options={[...props.modelOptions]}
        placeholder='Select evaluator model'
        ariaLabel='Select 1688 supplier evaluator model'
        title='Select 1688 supplier evaluator model'
      />
    </FormField>
  );
};

export const AdminSupplier1688EvaluatorSection = (props: {
  draft: ProductScannerSettingsDraft;
  setDraft: ScannerDraftSetter;
  modelOptions: SelectOption[];
  effectiveModelLabel: string;
  brain: BrainModelOptionsView;
}): JSX.Element => {
  const evaluator = props.draft.scanner1688CandidateEvaluator;
  return (
    <FormSection title='1688 Supplier Evaluator' description='Optional AI gate that reviews the strongest 1688 supplier candidate before the scan is trusted.' className='p-6'>
      <div className={`${UI_GRID_ROOMY_CLASSNAME} md:grid-cols-2`}>
        <FormField label='Evaluator Mode' description='Choose whether the supplier evaluator uses the AI Brain default model or a scanner-specific override.'>
          <SelectSimple
            size='sm'
            value={evaluator.mode}
            onValueChange={(value) => updateSupplierEvaluator(props.setDraft, { mode: modeFromValue(value) })}
            options={[...PRODUCT_SCANNER_1688_CANDIDATE_EVALUATOR_MODE_OPTIONS]}
            placeholder='Select evaluator mode'
            ariaLabel='Select 1688 supplier evaluator mode'
            title='Select 1688 supplier evaluator mode'
          />
        </FormField>
        <FormField label='Resolved Model' description='Current effective model for the 1688 supplier evaluator.'>
          <Input value={props.effectiveModelLabel} readOnly aria-label='Resolved 1688 supplier evaluator model' title='Resolved 1688 supplier evaluator model' />
        </FormField>
        <OverrideModelField evaluator={evaluator} modelOptions={props.modelOptions} setDraft={props.setDraft} />
        <FormField label='Confidence Threshold' description='Minimum evaluator confidence required before a supplier candidate is trusted.'>
          <Input
            type='number'
            min={0}
            max={1}
            step={0.05}
            value={evaluator.threshold}
            onChange={(event: ChangeEvent<HTMLInputElement>) => updateSupplierEvaluator(props.setDraft, { threshold: toUnitInterval(event.target.value, evaluator.threshold) })}
            aria-label='1688 supplier evaluator confidence threshold'
            title='1688 supplier evaluator confidence threshold'
          />
        </FormField>
        <FormField label='Evaluation Scope' description='Run the evaluator only when the heuristic supplier match is still ambiguous.'>
          <label className='inline-flex items-center gap-2 text-sm'>
            <input
              type='checkbox'
              checked={evaluator.onlyForAmbiguousCandidates}
              onChange={(event: ChangeEvent<HTMLInputElement>) => updateSupplierEvaluator(props.setDraft, { onlyForAmbiguousCandidates: event.target.checked })}
              aria-label='Only evaluate ambiguous 1688 supplier candidates'
              title='Only evaluate ambiguous 1688 supplier candidates'
            />
            Only evaluate ambiguous supplier candidates
          </label>
        </FormField>
      </div>
      <div className='mt-4 text-xs text-muted-foreground'>
        {props.brain.isLoading ? 'Loading AI Brain model options.' : props.brain.sourceWarnings[0] ?? 'The evaluator compares the source product image and the strongest 1688 supplier page before the scan is trusted.'}
      </div>
      <LinesPanel title='1688 Evaluator Summary' lines={resolve1688EvaluatorSummaryLines(props.draft, props.effectiveModelLabel)} />
      <LinesPanel title='1688 Evaluator Policy' lines={resolve1688EvaluatorPolicyLines(props.draft)} muted />
    </FormSection>
  );
};
