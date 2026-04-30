'use client';

import { useCallback, useContext, useRef } from 'react';
import { useFormContext, type UseFormReturn } from 'react-hook-form';

import { ProductFormCoreStateContext } from '@/features/products/context/ProductFormCoreContext';
import { ProductFormImageContext } from '@/features/products/context/ProductFormImageContext';
import { buildParameterValueInferenceTriggerInput } from '@/features/products/lib/buildParameterValueInferenceTriggerInput';
import { buildTriggeredProductEntityJson } from '@/features/products/lib/build-triggered-product-entity-json';
import type { ProductFormData } from '@/shared/contracts/products/drafts';
import type { ProductParameterValue } from '@/shared/contracts/products/product';
import { useAiPathTriggerEvent } from '@/shared/lib/ai-paths/hooks/useAiPathTriggerEvent';
import {
  PARAMETER_VALUE_INFERENCE_PATH_ID,
  PARAMETER_VALUE_INFERENCE_TRIGGER_BUTTON_ID,
  PARAMETER_VALUE_INFERENCE_TRIGGER_LOCATION,
} from '@/shared/lib/ai-paths/parameter-value-inference';

import {
  FALLBACK_PARAMETER_VALUE_INFERENCE_BUTTON,
  applyParameterValueToSnapshot,
  resolveParameterInferenceFallbackValue,
  resolveParameterValueLaunchErrorMessage,
  resolveRawLaunchErrorMessage,
} from './ProductFormParameters.helpers';
import { waitForParameterValueInferenceRun } from './ProductFormParameters.inference-run';
import type {
  ParameterSequenceState,
  ParameterValueInferenceAppliedResult,
  ParameterValueInferenceRunRow,
  RunParameterValueInference,
} from './ProductFormParameters.types';

type ProductFormCoreState = React.ContextType<typeof ProductFormCoreStateContext>;
type FireAiPathTriggerEvent = ReturnType<typeof useAiPathTriggerEvent>['fireAiPathTriggerEvent'];
type ParameterValueInferenceTriggerInput = ReturnType<
  typeof buildParameterValueInferenceTriggerInput
>;

type InferenceLaunchArgs = {
  coreState: ProductFormCoreState;
  fireAiPathTriggerEvent: FireAiPathTriggerEvent;
  getFormValuesWithImages: () => ProductFormData & Record<string, unknown>;
  triggerInput: ParameterValueInferenceTriggerInput;
};

type RunInferenceRowArgs = InferenceLaunchArgs & {
  imageLinks: string[];
  parameterValuesSnapshotRef: React.MutableRefObject<ProductParameterValue[]>;
  resolveCurrentParameterValueRowIndex: (parameterId: string) => number | null;
  row: ParameterValueInferenceRunRow;
  updateParameterValueByLanguage: (
    index: number,
    languageCode: string,
    nextValue: string
  ) => void;
};

const buildInferenceEntityJson = (args: InferenceLaunchArgs): Record<string, unknown> => {
  const entityJson = buildTriggeredProductEntityJson({
    product: args.coreState?.product,
    draft: args.coreState?.draft,
    values: args.getFormValuesWithImages(),
  });
  entityJson['parameterValueInferenceInput'] = args.triggerInput;
  return entityJson;
};

const fireParameterValueInferenceTrigger = async (
  args: InferenceLaunchArgs,
  handlers: {
    onError: (error: unknown) => void;
    onSuccess: (runId: string) => void;
  }
): Promise<void> => {
  await args.fireAiPathTriggerEvent({
    triggerEventId: PARAMETER_VALUE_INFERENCE_TRIGGER_BUTTON_ID,
    triggerLabel: FALLBACK_PARAMETER_VALUE_INFERENCE_BUTTON.name,
    preferredPathId: PARAMETER_VALUE_INFERENCE_PATH_ID,
    entityType: 'product',
    entityId: args.coreState?.product?.id ?? null,
    getEntityJson: () => buildInferenceEntityJson(args),
    source: {
      tab: 'product',
      location: PARAMETER_VALUE_INFERENCE_TRIGGER_LOCATION,
    },
    extras: {
      parameterValueInferenceInput: args.triggerInput,
      mode: 'click',
    },
    onError: handlers.onError,
    onSuccess: handlers.onSuccess,
  });
};

const launchParameterValueInferenceRun = (args: InferenceLaunchArgs): Promise<string> =>
  new Promise<string>((resolve, reject): void => {
    let settled = false;
    const resolveRun = (nextRunId: string): void => {
      if (settled) return;
      const normalizedRunId = nextRunId.trim();
      if (normalizedRunId.length === 0) {
        settled = true;
        reject(new Error('Parameter inference failed: unable to start the AI Path run.'));
        return;
      }
      settled = true;
      resolve(normalizedRunId);
    };
    const rejectLaunch = (launchError: unknown): void => {
      if (settled) return;
      settled = true;
      reject(
        new Error(
          resolveParameterValueLaunchErrorMessage({
            message: resolveRawLaunchErrorMessage(launchError),
          })
        )
      );
    };

    void fireParameterValueInferenceTrigger(args, {
      onError: rejectLaunch,
      onSuccess: resolveRun,
    })
      .catch(rejectLaunch)
      .then((): void => {
        if (settled !== true) rejectLaunch('unable to start the AI Path run.');
      });
  });

const runInferenceRow = async (
  args: RunInferenceRowArgs
): Promise<ParameterValueInferenceAppliedResult> => {
  const fallbackValue = resolveParameterInferenceFallbackValue({
    parameter: args.row.parameter,
    productTitle: args.triggerInput.product.title,
  });
  const runId = await launchParameterValueInferenceRun(args);
  const normalizedValue = await waitForParameterValueInferenceRun({
    runId,
    parameterId: args.row.parameter.id,
    languageCode: args.row.languageCode,
    selectorType: args.row.parameter.selectorType,
    optionLabels: args.row.optionLabels,
    fallbackValue,
  });
  const currentRowIndex = args.resolveCurrentParameterValueRowIndex(args.row.parameter.id);
  if (currentRowIndex === null) {
    throw new Error('Parameter inference failed: the parameter row is no longer available.');
  }

  const parameterValuesSnapshotRef = args.parameterValuesSnapshotRef;
  args.updateParameterValueByLanguage(currentRowIndex, args.row.languageCode, normalizedValue);
  parameterValuesSnapshotRef.current = applyParameterValueToSnapshot(
    parameterValuesSnapshotRef.current,
    {
      parameterId: args.row.parameter.id,
      languageCode: args.row.languageCode,
      value: normalizedValue,
    }
  );

  return {
    runId,
    parameterId: args.row.parameter.id,
    rowIndex: currentRowIndex,
    value: normalizedValue,
  };
};

const useParameterValuesSnapshotRef = (args: {
  parameterValues: ProductParameterValue[];
  sequenceStatus: ParameterSequenceState['status'];
}): React.MutableRefObject<ProductParameterValue[]> => {
  const parameterValuesSnapshotRef = useRef<ProductParameterValue[]>(args.parameterValues);
  if (args.sequenceStatus !== 'running') {
    parameterValuesSnapshotRef.current = args.parameterValues;
  }
  return parameterValuesSnapshotRef;
};

const useCurrentParameterValueRowResolver = (
  parameterValues: ProductParameterValue[]
): ((parameterId: string) => number | null) => {
  const parameterValueIndexByParameterIdRef = useRef<Map<string, number>>(new Map());
  parameterValueIndexByParameterIdRef.current = new Map(
    parameterValues.flatMap((entry: ProductParameterValue, index: number) =>
      entry.parameterId.length > 0 ? [[entry.parameterId, index] as const] : []
    )
  );
  return useCallback(
    (parameterId: string): number | null =>
      parameterValueIndexByParameterIdRef.current.get(parameterId) ?? null,
    []
  );
};

const useFormValuesWithImages = (args: {
  coreState: ProductFormCoreState;
  formContext: UseFormReturn<ProductFormData>;
  imageLinks: string[];
  parameterValuesSnapshotRef: React.MutableRefObject<ProductParameterValue[]>;
}): (() => ProductFormData & Record<string, unknown>) =>
  useCallback((): ProductFormData & Record<string, unknown> => ({
    ...((args.coreState?.getValues ?? args.formContext.getValues)()),
    imageLinks: args.imageLinks,
    parameters: args.parameterValuesSnapshotRef.current,
  }), [
    args.coreState?.getValues,
    args.formContext.getValues,
    args.imageLinks,
    args.parameterValuesSnapshotRef,
  ]);

const buildInferenceTriggerInput = (args: {
  getFormValuesWithImages: () => ProductFormData & Record<string, unknown>;
  imageLinks: string[];
  row: ParameterValueInferenceRunRow;
}): ParameterValueInferenceTriggerInput =>
  buildParameterValueInferenceTriggerInput({
    values: args.getFormValuesWithImages(),
    imageLinks: args.imageLinks,
    row: {
      index: args.row.rowIndex,
      parameter: args.row.parameter,
      languageCode: args.row.languageCode,
      languageLabel: args.row.languageLabel,
      currentValue: args.row.currentValue,
    },
  });

export const useParameterValueInferenceRunner = (args: {
  parameterValues: ProductParameterValue[];
  sequenceStatus: ParameterSequenceState['status'];
  updateParameterValueByLanguage: (
    index: number,
    languageCode: string,
    nextValue: string
  ) => void;
}): RunParameterValueInference => {
  const formContext = useFormContext<ProductFormData>();
  const coreState = useContext(ProductFormCoreStateContext);
  const imageContext = useContext(ProductFormImageContext);
  const { fireAiPathTriggerEvent } = useAiPathTriggerEvent();
  const imageLinks = imageContext?.imageLinks ?? [];
  const parameterValuesSnapshotRef = useParameterValuesSnapshotRef(args);
  const getFormValuesWithImages = useFormValuesWithImages({
    coreState,
    formContext,
    imageLinks,
    parameterValuesSnapshotRef,
  });
  const resolveCurrentParameterValueRowIndex = useCurrentParameterValueRowResolver(
    args.parameterValues
  );

  return useCallback<RunParameterValueInference>(
    async (row: ParameterValueInferenceRunRow) => {
      const triggerInput = buildInferenceTriggerInput({
        getFormValuesWithImages,
        imageLinks,
        row,
      });
      return runInferenceRow({
        coreState,
        fireAiPathTriggerEvent,
        getFormValuesWithImages,
        imageLinks,
        parameterValuesSnapshotRef,
        resolveCurrentParameterValueRowIndex,
        row,
        triggerInput,
        updateParameterValueByLanguage: args.updateParameterValueByLanguage,
      });
    },
    [
      args.updateParameterValueByLanguage,
      coreState,
      fireAiPathTriggerEvent,
      getFormValuesWithImages,
      imageLinks,
      resolveCurrentParameterValueRowIndex,
    ]
  );
};
