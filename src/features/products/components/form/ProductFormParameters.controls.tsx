'use client';

import { Ban, RotateCcw } from 'lucide-react';
import { useCallback, useState } from 'react';

import { Button } from '@/shared/ui/button';

import {
  FALLBACK_PARAMETER_VALUE_INFERENCE_BUTTON,
  getParameterLabel,
  resolveParameterValueInferenceErrorMessage,
} from './ProductFormParameters.helpers';
import type {
  ParameterSequenceInferenceToggleProps,
  ParameterValueInferenceRunRow,
  ParameterValueInferTriggerProps,
  RunParameterValueInference,
} from './ProductFormParameters.types';

const runInferenceRowsSequentially = (
  inferenceRows: ParameterValueInferenceRunRow[],
  runParameterValueInference: RunParameterValueInference
): Promise<void> =>
  inferenceRows.reduce<Promise<void>>(
    (previousRun, inferenceRow) =>
      previousRun.then(() => runParameterValueInference(inferenceRow).then(() => undefined)),
    Promise.resolve()
  );

export function ParameterSequenceInferenceToggle(
  props: ParameterSequenceInferenceToggleProps
): React.JSX.Element {
  const { rowIndex, selectedParameter, isExcluded, disabled, onToggle } = props;
  const parameterLabel =
    selectedParameter === null ? 'parameter' : getParameterLabel(selectedParameter);
  const ariaLabel = isExcluded
    ? `Include ${parameterLabel} in parameter sequence`
    : `Skip ${parameterLabel} in parameter sequence`;
  const Icon = isExcluded ? RotateCcw : Ban;

  return (
    <Button
      type='button'
      variant={isExcluded ? 'warning' : 'outline'}
      size='icon'
      onClick={(): void => {
        if (selectedParameter === null) return;
        onToggle(rowIndex, !isExcluded);
      }}
      disabled={disabled || selectedParameter === null}
      aria-label={ariaLabel}
      aria-pressed={selectedParameter === null ? undefined : isExcluded}
      title={ariaLabel}
      className='h-9 w-9 shrink-0'
    >
      <Icon className='h-4 w-4' aria-hidden='true' />
    </Button>
  );
}

export function ParameterValueInferTrigger(
  props: ParameterValueInferTriggerProps
): React.JSX.Element {
  const {
    selectedParameter,
    inferenceRows,
    disabled,
    runParameterValueInference,
  } = props;
  const [isTriggerPending, setIsTriggerPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleParameterValueTrigger = useCallback(async (): Promise<void> => {
    setError(null);
    if (selectedParameter === null) {
      setError('Parameter inference failed: select a parameter first.');
      return;
    }

    setIsTriggerPending(true);
    try {
      await runInferenceRowsSequentially(inferenceRows, runParameterValueInference);
      setError(null);
    } catch (triggerError) {
      setError(resolveParameterValueInferenceErrorMessage(triggerError));
    } finally {
      setIsTriggerPending(false);
    }
  }, [
    inferenceRows,
    runParameterValueInference,
    selectedParameter,
  ]);

  const ariaLabel =
    selectedParameter === null
      ? 'Trigger parameter inference'
      : `Trigger parameter inference for ${getParameterLabel(selectedParameter)}`;

  return (
    <div className='flex shrink-0 flex-col items-start gap-1'>
      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={(): void => {
          void handleParameterValueTrigger();
        }}
        disabled={disabled || isTriggerPending}
        aria-label={ariaLabel}
        className='h-9 px-3 text-xs'
      >
        {FALLBACK_PARAMETER_VALUE_INFERENCE_BUTTON.display.label}
      </Button>
      {error !== null ? <p className='max-w-40 text-xs text-destructive'>{error}</p> : null}
    </div>
  );
}
