'use client';

import { CopyIcon } from 'lucide-react';
import { useMemo, useId, type JSX } from 'react';

import type { LabeledOptionWithDescriptionDto } from '@/shared/contracts/base';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { Button, Label, Textarea, Checkbox, Badge, SelectSimple } from '@/shared/ui';

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
  pathNumber === 1
    ? 'mt-1.5 rounded-md border border-border/60 bg-card/40 p-4 text-sm text-gray-300 h-[100px] overflow-y-auto font-mono'
    : 'mt-1.5 rounded-md border border-border/60 bg-card/40 p-4 text-sm text-gray-300 h-[132px] overflow-y-auto font-sans';

const {
  Context: PromptGenerationSectionRuntimeContext,
  useStrictContext: usePromptGenerationSectionRuntime,
} = createStrictContext<PromptGenerationSectionProps>({
  hookName: 'usePromptGenerationSectionRuntime',
  providerName: 'PromptGenerationSectionRuntimeProvider',
  displayName: 'PromptGenerationSectionRuntimeContext',
});

function PromptGenerationSectionHeader(): JSX.Element {
  const { badgeVariant, badgeTextColor, pathNumber, pathTitle } =
    usePromptGenerationSectionRuntime();
  return (
    <div className='flex items-center gap-2'>
      <Badge
        variant={badgeVariant}
        className={`h-6 w-6 justify-center p-0 font-bold ${badgeTextColor}`}
      >
        {pathNumber}
      </Badge>
      <h3 className='text-md font-medium text-white'>{pathTitle}</h3>
    </div>
  );
}

function PromptGenerationInputPanel(): JSX.Element {
  const { inputLabel, inputValue, onInputChange, pathNumber, inputId } =
    usePromptGenerationSectionRuntime();
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

function PromptGenerationInitialResultPanel(): JSX.Element {
  const {
    initialResultLabel,
    initialResultValue,
    onCopyInitialResult,
    pathNumber,
    initialResultId,
    initialResultLabelId,
  } = usePromptGenerationSectionRuntime();
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

function PromptGenerationModelPanel(): JSX.Element {
  const { modelLabel, modelOptions, modelValue, onModelChange, modelSelectId } =
    usePromptGenerationSectionRuntime();
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

function PromptGenerationOutputToggle(): JSX.Element {
  const {
    badgeTextColor,
    modelValue,
    onOutputEnabledChange,
    outputEnabled,
    outputEnabledCheckboxId,
  } = usePromptGenerationSectionRuntime();
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

function PromptGenerationOutputPromptPanel(): JSX.Element {
  const {
    outputPlaceholder,
    outputPromptLabel,
    outputPromptValue,
    onOutputPromptChange,
    pathNumber,
    outputPromptId,
  } = usePromptGenerationSectionRuntime();
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

function PromptGenerationFinalResultPanel(): JSX.Element {
  const {
    finalResultLabel,
    finalResultValue,
    onCopyFinalResult,
    pathNumber,
    finalResultId,
    finalResultLabelId,
  } = usePromptGenerationSectionRuntime();
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

function PromptGenerationOutputPanels(): JSX.Element | null {
  const { outputEnabled } = usePromptGenerationSectionRuntime();
  if (!outputEnabled) return null;
  return (
    <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-300'>
      <PromptGenerationOutputPromptPanel />
      <PromptGenerationFinalResultPanel />
    </div>
  );
}

function PromptGenerationSectionRuntime(): JSX.Element {
  return (
    <div className='space-y-4'>
      <PromptGenerationSectionHeader />

      <div className='pl-8 space-y-6'>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          <PromptGenerationInputPanel />
          <PromptGenerationInitialResultPanel />
        </div>

        <PromptGenerationModelPanel />

        <div className='pt-4 border-t border-border/50 space-y-4'>
          <PromptGenerationOutputToggle />
          <PromptGenerationOutputPanels />
        </div>
      </div>
    </div>
  );
}

export function PromptGenerationSection(props: PromptGenerationSectionProps): JSX.Element {
  const baseId = useId().replace(/:/g, '');

  const runtimeValue = useMemo<PromptGenerationSectionProps>(
    () => ({
      ...props,
      inputId: props.inputId ?? `${baseId}-input`,
      outputPromptId: props.outputPromptId ?? `${baseId}-output`,
      modelSelectId: props.modelSelectId ?? `${baseId}-model`,
      initialResultId: props.initialResultId ?? `${baseId}-initial-result`,
      finalResultId: props.finalResultId ?? `${baseId}-final-result`,
      initialResultLabelId: props.initialResultLabelId ?? `${baseId}-initial-label`,
      finalResultLabelId: props.finalResultLabelId ?? `${baseId}-final-label`,
    }),
    [
      props,
      baseId,
      props.inputId,
      props.outputPromptId,
      props.modelSelectId,
      props.initialResultId,
      props.finalResultId,
      props.initialResultLabelId,
      props.finalResultLabelId,
    ]
  );

  return (
    <PromptGenerationSectionRuntimeContext.Provider value={runtimeValue}>
      <PromptGenerationSectionRuntime />
    </PromptGenerationSectionRuntimeContext.Provider>
  );
}
