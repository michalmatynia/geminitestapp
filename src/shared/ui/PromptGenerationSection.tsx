'use client';

import { CopyIcon } from 'lucide-react';
import { useId, type JSX } from 'react';

import type { LabeledOptionWithDescriptionDto } from '@/shared/contracts/base';
import {
  Badge,
  Button,
  Checkbox,
  Label,
  SelectSimple,
  Textarea,
  UI_GRID_ROOMY_CLASSNAME,
} from '@/shared/ui';
import { cn } from '@/shared/utils';

import { insetPanelVariants } from './InsetPanel';

interface PromptGenerationSectionProps {
  pathNumber: number;
  pathTitle: string;
  inputLabel: string;
  inputValue: string;
  onInputChange: (value: string) => void;
  initialResultLabel: string;
  initialResultValue: string | null;
  onCopyInitialResult: () => void;
  modelLabel: string;
  modelValue: string;
  onModelChange: (value: string) => void;
  modelOptions: Array<LabeledOptionWithDescriptionDto<string>>;
  outputEnabled: boolean;
  onOutputEnabledChange: (enabled: boolean) => void;
  outputPromptLabel: string;
  outputPromptValue: string;
  onOutputPromptChange: (value: string) => void;
  outputPlaceholder: string;
  finalResultLabel: string;
  finalResultValue: string | null;
  onCopyFinalResult: () => void;
  badgeVariant: 'info' | 'secondary';
  badgeTextColor: string;
  outputEnabledCheckboxId: string;
  inputId?: string;
  outputPromptId?: string;
  modelSelectId?: string;
  initialResultId?: string;
  finalResultId?: string;
  initialResultLabelId?: string;
  finalResultLabelId?: string;
}

const resolvePromptRows = (pathNumber: number): number => (pathNumber === 1 ? 4 : 6);

const resolveResultClassName = (pathNumber: number): string =>
  cn(
    insetPanelVariants({ radius: 'compact', padding: 'md' }),
    'mt-1.5 text-sm text-gray-300 overflow-y-auto',
    pathNumber === 1 ? 'h-[100px] font-mono' : 'h-[132px] font-sans'
  );

type PromptGenerationSectionResolvedProps = PromptGenerationSectionProps & {
  inputId: string;
  outputPromptId: string;
  modelSelectId: string;
  initialResultId: string;
  finalResultId: string;
  initialResultLabelId: string;
  finalResultLabelId: string;
};

function PromptGenerationInputPanel({
  inputId,
  inputLabel,
  inputValue,
  onInputChange,
  pathNumber,
}: Pick<
  PromptGenerationSectionResolvedProps,
  'inputId' | 'inputLabel' | 'inputValue' | 'onInputChange' | 'pathNumber'
>): JSX.Element {
  return (
    <div className='space-y-2'>
      <Label htmlFor={inputId}>{inputLabel}</Label>
      <Textarea
        id={inputId}
        rows={resolvePromptRows(pathNumber)}
        value={inputValue}
        onChange={(event) => onInputChange(event.target.value)}
        className='mt-1.5 bg-gray-900 border text-white font-mono text-sm'
      />
    </div>
  );
}

function PromptGenerationInitialResultPanel({
  initialResultId,
  initialResultLabel,
  initialResultLabelId,
  initialResultValue,
  onCopyInitialResult,
  pathNumber,
}: Pick<
  PromptGenerationSectionResolvedProps,
  | 'initialResultId'
  | 'initialResultLabel'
  | 'initialResultLabelId'
  | 'initialResultValue'
  | 'onCopyInitialResult'
  | 'pathNumber'
>): JSX.Element {
  return (
    <div className='space-y-2'>
      <div className='flex items-center justify-between'>
        <Label id={initialResultLabelId}>{initialResultLabel}</Label>
        <Button
          variant='ghost'
          size='sm'
          className='h-6 text-[10px]'
          onClick={onCopyInitialResult}
          aria-label={`Copy ${initialResultLabel}`}
        >
          <CopyIcon className='size-3 mr-1' aria-hidden='true' />
          Copy
        </Button>
      </div>
      <div
        id={initialResultId}
        className={resolveResultClassName(pathNumber)}
        role='status'
        aria-live='polite'
        aria-atomic='true'
        aria-labelledby={initialResultLabelId}
      >
        {initialResultValue ? (
          <div className='whitespace-pre-wrap'>{initialResultValue}</div>
        ) : (
          <span className='text-gray-600 italic text-xs'>No result yet.</span>
        )}
      </div>
    </div>
  );
}

function PromptGenerationModelPanel({
  modelLabel,
  modelOptions,
  modelSelectId,
  modelValue,
  onModelChange,
}: Pick<
  PromptGenerationSectionResolvedProps,
  'modelLabel' | 'modelOptions' | 'modelSelectId' | 'modelValue' | 'onModelChange'
>): JSX.Element {
  return (
    <div className='max-w-md'>
      <Label htmlFor={modelSelectId}>{modelLabel}</Label>
      <SelectSimple
        size='sm'
        value={modelValue}
        onValueChange={onModelChange}
        options={modelOptions}
        id={modelSelectId}
      />
    </div>
  );
}

function PromptGenerationOutputToggle({
  badgeTextColor,
  modelValue,
  onOutputEnabledChange,
  outputEnabled,
  outputEnabledCheckboxId,
}: Pick<
  PromptGenerationSectionResolvedProps,
  | 'badgeTextColor'
  | 'modelValue'
  | 'onOutputEnabledChange'
  | 'outputEnabled'
  | 'outputEnabledCheckboxId'
>): JSX.Element {
  return (
    <div className='flex items-center gap-2'>
      <Checkbox
        id={outputEnabledCheckboxId}
        checked={outputEnabled}
        onCheckedChange={(checked: boolean | 'indeterminate') => onOutputEnabledChange(!!checked)}
      />
      <Label htmlFor={outputEnabledCheckboxId} className={`cursor-pointer ${badgeTextColor}`}>
        Enable Output Prompt (Refinement using {modelValue})
      </Label>
    </div>
  );
}

function PromptGenerationOutputPromptPanel({
  onOutputPromptChange,
  outputPlaceholder,
  outputPromptId,
  outputPromptLabel,
  outputPromptValue,
  pathNumber,
}: Pick<
  PromptGenerationSectionResolvedProps,
  | 'onOutputPromptChange'
  | 'outputPlaceholder'
  | 'outputPromptId'
  | 'outputPromptLabel'
  | 'outputPromptValue'
  | 'pathNumber'
>): JSX.Element {
  return (
    <div className='space-y-2'>
      <Label htmlFor={outputPromptId}>{outputPromptLabel}</Label>
      <Textarea
        id={outputPromptId}
        rows={resolvePromptRows(pathNumber)}
        value={outputPromptValue}
        onChange={(event) => onOutputPromptChange(event.target.value)}
        className='mt-1.5 bg-gray-900 border text-white font-mono text-sm'
        placeholder={outputPlaceholder}
      />
    </div>
  );
}

function PromptGenerationFinalResultPanel({
  finalResultId,
  finalResultLabel,
  finalResultLabelId,
  finalResultValue,
  onCopyFinalResult,
  pathNumber,
}: Pick<
  PromptGenerationSectionResolvedProps,
  | 'finalResultId'
  | 'finalResultLabel'
  | 'finalResultLabelId'
  | 'finalResultValue'
  | 'onCopyFinalResult'
  | 'pathNumber'
>): JSX.Element {
  return (
    <div className='space-y-2'>
      <div className='flex items-center justify-between'>
        <Label id={finalResultLabelId}>{finalResultLabel}</Label>
        <Button
          variant='ghost'
          size='sm'
          className='h-6 text-[10px]'
          onClick={onCopyFinalResult}
          aria-label={`Copy ${finalResultLabel}`}
        >
          <CopyIcon className='size-3 mr-1' aria-hidden='true' />
          Copy
        </Button>
      </div>
      <div
        id={finalResultId}
        className={resolveResultClassName(pathNumber)}
        role='status'
        aria-live='polite'
        aria-atomic='true'
        aria-labelledby={finalResultLabelId}
      >
        {finalResultValue ? (
          <div className='whitespace-pre-wrap'>{finalResultValue}</div>
        ) : (
          <span className='text-gray-600 italic text-xs'>No result yet.</span>
        )}
      </div>
    </div>
  );
}

export function PromptGenerationSection(props: PromptGenerationSectionProps): JSX.Element {
  const baseId = useId().replace(/:/g, '');
  const resolvedProps: PromptGenerationSectionResolvedProps = {
    ...props,
    inputId: props.inputId ?? `${baseId}-input`,
    outputPromptId: props.outputPromptId ?? `${baseId}-output`,
    modelSelectId: props.modelSelectId ?? `${baseId}-model`,
    initialResultId: props.initialResultId ?? `${baseId}-initial-result`,
    finalResultId: props.finalResultId ?? `${baseId}-final-result`,
    initialResultLabelId: props.initialResultLabelId ?? `${baseId}-initial-label`,
    finalResultLabelId: props.finalResultLabelId ?? `${baseId}-final-label`,
  };

  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-2'>
        <Badge
          variant={resolvedProps.badgeVariant}
          className={`h-6 w-6 justify-center p-0 font-bold ${resolvedProps.badgeTextColor}`}
        >
          {resolvedProps.pathNumber}
        </Badge>
        <h3 className='text-md font-medium text-white'>{resolvedProps.pathTitle}</h3>
      </div>

      <div className='pl-8 space-y-6'>
        <div className={`${UI_GRID_ROOMY_CLASSNAME} grid-cols-1 lg:grid-cols-2`}>
          <PromptGenerationInputPanel {...resolvedProps} />
          <PromptGenerationInitialResultPanel {...resolvedProps} />
        </div>

        <PromptGenerationModelPanel {...resolvedProps} />

        <div className='pt-4 border-t border-border/50 space-y-4'>
          <PromptGenerationOutputToggle {...resolvedProps} />
          {resolvedProps.outputEnabled ? (
            <div
              className={`${UI_GRID_ROOMY_CLASSNAME} grid-cols-1 lg:grid-cols-2 animate-in fade-in slide-in-from-top-2 duration-300`}
            >
              <PromptGenerationOutputPromptPanel {...resolvedProps} />
              <PromptGenerationFinalResultPanel {...resolvedProps} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
