import { useCallback, useMemo, useRef } from 'react';

import type { ProductParameter } from '@/shared/contracts/products/parameters';
import type { ProductParameterValue } from '@/shared/contracts/products/product';

import {
  buildNormalizedParameterOptionLabels,
  getParameterLabel,
  getParameterLanguageValue,
  resolveParameterValueInferenceErrorMessage,
} from './ProductFormParameters.helpers';
import type {
  CatalogLanguageOption,
  ParameterSequenceState,
  ParameterValueInferenceRunRow,
  RunParameterValueInference,
} from './ProductFormParameters.types';

type ParameterSequenceModel = {
  sequenceState: ParameterSequenceState;
  sequenceStatusMessage: string | null;
  isSequenceRunning: boolean;
  eligibleSequenceRows: ParameterValueInferenceRunRow[];
  toggleParameterSequenceExclusion: (rowIndex: number, isExcluded: boolean) => void;
  handleRunParameterSequence: () => Promise<void>;
};

type RunSequenceRowsArgs = {
  rows: ParameterValueInferenceRunRow[];
  total: number;
  runToken: number;
  preferredLocale: string;
  sequenceRunTokenRef: React.MutableRefObject<number>;
  runParameterValueInference: RunParameterValueInference;
  setSequenceState: (state: ParameterSequenceState) => void;
};

type UseParameterSequenceArgs = {
  sequenceState: ParameterSequenceState;
  setSequenceState: (state: ParameterSequenceState) => void;
  parameterValues: ProductParameterValue[];
  parameterById: Map<string, ProductParameter>;
  activeParameterLanguage: CatalogLanguageOption;
  primaryLanguageCode: string;
  preferredLocale: string;
  runParameterValueInference: RunParameterValueInference;
  updateParameterInferenceSkip: (rowIndex: number, isExcluded: boolean) => void;
};

export const INITIAL_SEQUENCE_STATE: ParameterSequenceState = {
  status: 'idle',
  current: 0,
  total: 0,
  currentLabel: null,
  error: null,
};

const resolveEligibleSequenceRow = (args: {
  entry: ProductParameterValue;
  index: number;
  parameterById: Map<string, ProductParameter>;
  activeParameterLanguage: CatalogLanguageOption;
  primaryLanguageCode: string;
}): ParameterValueInferenceRunRow | null => {
  if (args.entry.parameterId.length === 0) return null;
  if (args.entry.skipParameterInference === true) return null;
  const parameter = args.parameterById.get(args.entry.parameterId);
  const hasLinkedTitleTerm =
    parameter?.linkedTitleTermType !== null && parameter?.linkedTitleTermType !== undefined;
  if (parameter === undefined || hasLinkedTitleTerm) return null;
  const currentValue = getParameterLanguageValue(
    args.entry,
    args.activeParameterLanguage.code,
    args.primaryLanguageCode
  );
  return {
    rowIndex: args.index,
    parameter,
    languageCode: args.activeParameterLanguage.code,
    languageLabel: args.activeParameterLanguage.label,
    currentValue,
    optionLabels: buildNormalizedParameterOptionLabels(parameter, currentValue),
  };
};

const buildEligibleSequenceRows = (args: {
  parameterValues: ProductParameterValue[];
  parameterById: Map<string, ProductParameter>;
  activeParameterLanguage: CatalogLanguageOption;
  primaryLanguageCode: string;
}): ParameterValueInferenceRunRow[] =>
  args.parameterValues.flatMap((entry: ProductParameterValue, index: number) => {
    const row = resolveEligibleSequenceRow({ ...args, entry, index });
    return row === null ? [] : [row];
  });

const buildSequenceStatusMessage = (
  sequenceState: ParameterSequenceState
): string | null => {
  if (sequenceState.status === 'running') {
    const label =
      sequenceState.currentLabel !== null && sequenceState.currentLabel.length > 0
        ? `: ${sequenceState.currentLabel}`
        : '';
    return `Running ${sequenceState.current}/${sequenceState.total}${label}`;
  }
  if (sequenceState.status === 'completed') {
    return `Parameter sequence completed for ${sequenceState.total} parameter${sequenceState.total === 1 ? '' : 's'}.`;
  }
  if (sequenceState.status === 'failed') return sequenceState.error;
  return null;
};

const setSequenceRowRunning = (
  args: RunSequenceRowsArgs,
  index: number,
  parameterLabel: string
): void => {
  args.setSequenceState({
    status: 'running',
    current: index + 1,
    total: args.total,
    currentLabel: parameterLabel,
    error: null,
  });
};

const runSequenceRowsFromIndex = async (
  args: RunSequenceRowsArgs,
  index: number
): Promise<boolean> => {
  const row = args.rows[index];
  if (row === undefined) return true;
  const parameterLabel = getParameterLabel(row.parameter, args.preferredLocale);
  setSequenceRowRunning(args, index, parameterLabel);
  try {
    await args.runParameterValueInference(row);
  } catch (error) {
    if (args.sequenceRunTokenRef.current !== args.runToken) return false;
    const message = resolveParameterValueInferenceErrorMessage(error);
    args.setSequenceState({
      status: 'failed',
      current: index + 1,
      total: args.total,
      currentLabel: parameterLabel,
      error: `${parameterLabel}: ${message}`,
    });
    return false;
  }

  if (args.sequenceRunTokenRef.current !== args.runToken) return false;
  return runSequenceRowsFromIndex(args, index + 1);
};

const useEligibleSequenceRows = (
  args: UseParameterSequenceArgs
): ParameterValueInferenceRunRow[] =>
  useMemo(
    (): ParameterValueInferenceRunRow[] => buildEligibleSequenceRows(args),
    [
      args.activeParameterLanguage,
      args.parameterById,
      args.parameterValues,
      args.primaryLanguageCode,
    ]
  );

const useToggleParameterSequenceExclusion = (
  updateParameterInferenceSkip: (rowIndex: number, isExcluded: boolean) => void
): ((rowIndex: number, isExcluded: boolean) => void) =>
  useCallback(
    (rowIndex: number, isExcluded: boolean): void => {
      updateParameterInferenceSkip(rowIndex, isExcluded);
    },
    [updateParameterInferenceSkip]
  );

const useRunParameterSequence = (args: {
  eligibleSequenceRows: ParameterValueInferenceRunRow[];
  preferredLocale: string;
  runParameterValueInference: RunParameterValueInference;
  sequenceRunTokenRef: React.MutableRefObject<number>;
  setSequenceState: (state: ParameterSequenceState) => void;
}): (() => Promise<void>) =>
  useCallback(async (): Promise<void> => {
    if (args.eligibleSequenceRows.length === 0) {
      args.setSequenceState({
        status: 'failed',
        current: 0,
        total: 0,
        currentLabel: null,
        error: 'Parameter sequence failed: no eligible parameters to run.',
      });
      return;
    }

    const sequenceRunTokenRef = args.sequenceRunTokenRef;
    const runToken = sequenceRunTokenRef.current + 1;
    sequenceRunTokenRef.current = runToken;
    const completed = await runSequenceRowsFromIndex({
      rows: args.eligibleSequenceRows,
      total: args.eligibleSequenceRows.length,
      runToken,
      preferredLocale: args.preferredLocale,
      sequenceRunTokenRef,
      runParameterValueInference: args.runParameterValueInference,
      setSequenceState: args.setSequenceState,
    }, 0);
    if (completed !== true) return;
    args.setSequenceState({
      status: 'completed',
      current: args.eligibleSequenceRows.length,
      total: args.eligibleSequenceRows.length,
      currentLabel: null,
      error: null,
    });
  }, [
    args.eligibleSequenceRows,
    args.preferredLocale,
    args.runParameterValueInference,
    args.sequenceRunTokenRef,
    args.setSequenceState,
  ]);

export const useParameterSequence = (
  args: UseParameterSequenceArgs
): ParameterSequenceModel => {
  const sequenceRunTokenRef = useRef(0);
  const eligibleSequenceRows = useEligibleSequenceRows(args);
  const isSequenceRunning = args.sequenceState.status === 'running';
  const sequenceStatusMessage = useMemo(
    (): string | null => buildSequenceStatusMessage(args.sequenceState),
    [args.sequenceState]
  );
  const toggleParameterSequenceExclusion = useToggleParameterSequenceExclusion(
    args.updateParameterInferenceSkip
  );
  const handleRunParameterSequence = useRunParameterSequence({
    eligibleSequenceRows,
    preferredLocale: args.preferredLocale,
    runParameterValueInference: args.runParameterValueInference,
    sequenceRunTokenRef,
    setSequenceState: args.setSequenceState,
  });

  return {
    sequenceState: args.sequenceState,
    sequenceStatusMessage,
    isSequenceRunning,
    eligibleSequenceRows,
    toggleParameterSequenceExclusion,
    handleRunParameterSequence,
  };
};
