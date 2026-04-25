'use client';
// ProductFormParameters: parameter panel inside the product editor.
// Renders parameter mapping controls and binds to product form metadata.
// Designed for dynamic parameter schemas per catalog and handles i18n.

import { Ban, RotateCcw, X } from 'lucide-react';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';

import { ProductFormCoreStateContext } from '@/features/products/context/ProductFormCoreContext';
import { ProductFormImageContext } from '@/features/products/context/ProductFormImageContext';
import { useProductFormMetadata } from '@/features/products/context/ProductFormMetadataContext';
import { useProductFormParameters } from '@/features/products/context/ProductFormParameterContext';
import { buildParameterValueInferenceTriggerInput } from '@/features/products/lib/buildParameterValueInferenceTriggerInput';
import { buildTriggeredProductEntityJson } from '@/features/products/lib/build-triggered-product-entity-json';
import { extractParameterValueInferenceResultFromAiPathRunDetail } from '@/features/products/lib/extractParameterValueInferenceFromAiPathRunDetail';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { AiTriggerButtonRecord } from '@/shared/contracts/ai-trigger-buttons';
import type { Language } from '@/shared/contracts/internationalization';
import type { ProductFormData } from '@/shared/contracts/products/drafts';
import type { ProductParameter } from '@/shared/contracts/products/parameters';
import type { ProductParameterValue } from '@/shared/contracts/products/product';
import { getAiPathRun } from '@/shared/lib/ai-paths/api/client';
import {
  subscribeToTrackedAiPathRun,
  type TrackedAiPathRunSnapshot,
} from '@/shared/lib/ai-paths/client-run-tracker';
import { useAiPathTriggerEvent } from '@/shared/lib/ai-paths/hooks/useAiPathTriggerEvent';
import {
  PARAMETER_VALUE_INFERENCE_PATH_ID,
  PARAMETER_VALUE_INFERENCE_TRIGGER_BUTTON_ID,
  PARAMETER_VALUE_INFERENCE_TRIGGER_LOCATION,
  PARAMETER_VALUE_INFERENCE_TRIGGER_NAME,
  PARAMETER_VALUE_INFERENCE_TRIGGER_SORT_INDEX,
} from '@/shared/lib/ai-paths/parameter-value-inference';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { CompactEmptyState } from '@/shared/ui/empty-state';
import { FormSection } from '@/shared/ui/form-section';
import { Input } from '@/shared/ui/input';
import { insetPanelVariants } from '@/shared/ui/InsetPanel';
import { Label } from '@/shared/ui/label';
import { LoadingState } from '@/shared/ui/LoadingState';
import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group';
import { SelectSimple } from '@/shared/ui/select-simple';
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Textarea } from '@/shared/ui/textarea';
import { ToggleRow } from '@/shared/ui/toggle-row';

const getParameterLabel = (
  parameter: {
    id?: string | null;
    name_en: string;
    name_pl?: string | null;
    name_de?: string | null;
  },
  preferredLocale?: string
): string => {
  const preferred = preferredLocale?.toLowerCase();
  if (preferred === 'pl' && parameter.name_pl) return parameter.name_pl;
  if (preferred === 'de' && parameter.name_de) return parameter.name_de;
  if (
    (preferred === 'en' || preferred === 'default' || !preferred) &&
    !parameter.name_pl &&
    isLikelyPolishParameterLabel(parameter.name_en)
  ) {
    return formatParameterIdFallbackLabel(parameter.id) ?? 'Imported parameter';
  }
  return parameter.name_en || parameter.name_pl || parameter.name_de || 'Unnamed parameter';
};

const POLISH_PARAMETER_LABEL_PATTERN =
  /(?:[ąćęłńóśźż]|\b(?:cecha|cechy|długość|kolor|materiał|modelu|nazwa|numer|producent|rodzaj|rozmiar|szerokość|stan|waga|wysokość)\b)/i;

const isLikelyPolishParameterLabel = (value: unknown): boolean =>
  typeof value === 'string' && POLISH_PARAMETER_LABEL_PATTERN.test(value.trim());

const formatParameterIdFallbackLabel = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const words = value
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-zA-Z0-9 ]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((part: string): boolean => part.length > 0);
  if (words.length === 0) return null;
  return words
    .map((word: string): string => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const buildParameterOptions = (
  parameters: ProductParameter[],
  preferredLocale?: string
): Array<LabeledOptionDto<string>> =>
  parameters.map((parameter) => ({
    value: parameter.id,
    label: getParameterLabel(parameter, preferredLocale),
  }));

const buildLabelOptions = (labels: string[]): Array<LabeledOptionDto<string>> =>
  labels.map((label) => ({ value: label, label }));

const SELECTOR_TYPES_REQUIRING_OPTIONS = new Set<ProductParameter['selectorType']>([
  'radio',
  'select',
  'dropdown',
  'checklist',
]);

type CatalogLanguageOption = {
  code: string;
  label: string;
};

const normalizeLanguageCode = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
};

const getParameterLanguageValue = (
  entry: ProductParameterValue,
  languageCode: string,
  primaryLanguageCode: string
): string => {
  const normalizedLanguageCode = normalizeLanguageCode(languageCode);
  if (!normalizedLanguageCode) return '';
  const valuesByLanguage =
    entry.valuesByLanguage &&
    typeof entry.valuesByLanguage === 'object' &&
    !Array.isArray(entry.valuesByLanguage)
      ? entry.valuesByLanguage
      : null;
  const hasLocalizedValues = Boolean(valuesByLanguage && Object.keys(valuesByLanguage).length > 0);
  const localizedValue = valuesByLanguage?.[normalizedLanguageCode];
  if (typeof localizedValue === 'string') return localizedValue;
  if (hasLocalizedValues) return '';
  if (normalizedLanguageCode !== primaryLanguageCode) return '';
  return typeof entry.value === 'string' ? entry.value : '';
};

const parseChecklistValues = (value: string): string[] => {
  const seen = new Set<string>();
  return value
    .split(/[,;\n]/)
    .map((entry: string) => entry.trim())
    .filter((entry: string) => {
      if (!entry) return false;
      const key = entry.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const formatChecklistValues = (values: string[]): string => values.join(', ');

const getLinkedTitleTermLabel = (
  value: ProductParameter['linkedTitleTermType']
): string | null => {
  if (!value) return null;
  if (value === 'size') return 'Size';
  if (value === 'material') return 'Material';
  if (value === 'theme') return 'Theme';
  return value;
};

type ParameterValueInferTriggerProps = {
  rowIndex: number;
  selectedParameter: ProductParameter | null;
  languageCode: string;
  languageLabel: string;
  currentValue: string;
  optionLabels: string[];
  disabled: boolean;
  runParameterValueInference: RunParameterValueInference;
};

type ParameterSequenceInferenceToggleProps = {
  selectedParameter: ProductParameter | null;
  isExcluded: boolean;
  disabled: boolean;
  onToggle: (parameterId: string) => void;
};

type ParameterValueInferenceRunRow = {
  rowIndex: number;
  parameter: ProductParameter;
  languageCode: string;
  languageLabel: string;
  currentValue: string;
  optionLabels: string[];
};

type ParameterValueInferenceTrackedRun = {
  runId: string;
  parameterId: string;
  languageCode: string;
  selectorType: ProductParameter['selectorType'];
  optionLabels: string[];
};

type ParameterValueInferenceAppliedResult = {
  runId: string;
  parameterId: string;
  rowIndex: number;
  value: string;
};

type RunParameterValueInference = (
  row: ParameterValueInferenceRunRow
) => Promise<ParameterValueInferenceAppliedResult>;

type ParameterSequenceState = {
  status: 'idle' | 'running' | 'completed' | 'failed';
  current: number;
  total: number;
  currentLabel: string | null;
  error: string | null;
};

const FALLBACK_PARAMETER_VALUE_INFERENCE_BUTTON: AiTriggerButtonRecord = {
  id: PARAMETER_VALUE_INFERENCE_TRIGGER_BUTTON_ID,
  name: PARAMETER_VALUE_INFERENCE_TRIGGER_NAME,
  pathId: PARAMETER_VALUE_INFERENCE_PATH_ID,
  locations: [PARAMETER_VALUE_INFERENCE_TRIGGER_LOCATION],
  mode: 'click',
  display: {
    label: PARAMETER_VALUE_INFERENCE_TRIGGER_NAME,
    showLabel: true,
  },
  enabled: true,
  sortIndex: PARAMETER_VALUE_INFERENCE_TRIGGER_SORT_INDEX,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const resolveParameterValueLaunchErrorMessage = (payload: {
  error?: string | null | undefined;
  message?: string | null | undefined;
}): string => {
  const explicitMessage =
    typeof payload.message === 'string' ? payload.message.trim() : '';
  if (explicitMessage.length > 0) {
    return explicitMessage.startsWith('Parameter inference failed:')
      ? explicitMessage
      : `Parameter inference failed: ${explicitMessage}`;
  }

  switch (payload.error) {
    case 'preferred_path_missing':
      return 'Parameter inference failed: the configured AI Path is missing.';
    case 'trigger_node_not_found':
      return 'Parameter inference failed: the selected AI Path no longer contains the trigger node.';
    case 'path_disabled':
      return 'Parameter inference failed: all AI Paths for this trigger are disabled.';
    case 'ambiguous_path_selection':
      return 'Parameter inference failed: multiple active AI Paths match this trigger.';
    case 'no_path_configured':
      return 'Parameter inference failed: no AI Path is configured for this trigger.';
    default:
      return 'Parameter inference failed: unable to start the AI Path run.';
  }
};

const findAllowedOptionLabel = (value: string, optionLabels: string[]): string | null => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  return (
    optionLabels.find((optionLabel: string): boolean =>
      optionLabel.trim().toLowerCase() === normalized
    ) ?? null
  );
};

const normalizeInferredParameterValue = (args: {
  value: string;
  selectorType: ProductParameter['selectorType'];
  optionLabels: string[];
}): string | null => {
  const trimmedValue = args.value.trim();
  const optionLabels = args.optionLabels
    .map((optionLabel: string): string => optionLabel.trim())
    .filter((optionLabel: string): boolean => optionLabel.length > 0);

  if (args.selectorType === 'checkbox') {
    if (!trimmedValue) return '';
    const matchedOption = findAllowedOptionLabel(trimmedValue, optionLabels);
    if (matchedOption) return matchedOption;
    const normalized = trimmedValue.toLowerCase();
    if (['false', '0', 'no', 'off', 'none', 'unknown', 'unsupported'].includes(normalized)) {
      return '';
    }
    if (['true', '1', 'yes', 'on'].includes(normalized)) {
      return optionLabels[0] ?? 'true';
    }
    return optionLabels.length === 0 ? trimmedValue : null;
  }

  if (args.selectorType === 'checklist') {
    if (!trimmedValue) return '';
    const inferredValues = parseChecklistValues(trimmedValue);
    if (optionLabels.length === 0) return formatChecklistValues(inferredValues);

    const normalizedValues = inferredValues
      .map((value: string): string | null => findAllowedOptionLabel(value, optionLabels))
      .filter((value: string | null): value is string => value !== null);
    if (normalizedValues.length === 0) return null;
    return formatChecklistValues(Array.from(new Set(normalizedValues)));
  }

  if (
    args.selectorType === 'radio' ||
    args.selectorType === 'select' ||
    args.selectorType === 'dropdown'
  ) {
    if (!trimmedValue) return '';
    const matchedOption = findAllowedOptionLabel(trimmedValue, optionLabels);
    if (matchedOption) return matchedOption;
    return optionLabels.length === 0 ? trimmedValue : null;
  }

  return trimmedValue;
};

const resolveParameterValueInferenceErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  if (typeof error === 'string' && error.trim().length > 0) {
    return error.trim();
  }
  return 'Parameter inference failed: unexpected error.';
};

const resolveRawLaunchErrorMessage = (launchError: unknown): string | null => {
  if (typeof launchError === 'string') return launchError;
  if (launchError instanceof Error) return launchError.message;
  return null;
};

const buildNormalizedParameterOptionLabels = (
  parameter: ProductParameter,
  currentValue: string
): string[] => {
  const selectorType = parameter.selectorType ?? 'text';
  const optionLabels = Array.isArray(parameter.optionLabels) ? parameter.optionLabels : [];
  const normalizedOptionLabels = Array.from(
    new Set(
      optionLabels
        .map((value: string) => value.trim())
        .filter((value: string) => value.length > 0)
    )
  );

  if (
    currentValue.length > 0 &&
    SELECTOR_TYPES_REQUIRING_OPTIONS.has(selectorType) &&
    !normalizedOptionLabels.includes(currentValue)
  ) {
    normalizedOptionLabels.unshift(currentValue);
  }

  return normalizedOptionLabels;
};

const applyParameterValueToSnapshot = (
  values: ProductParameterValue[],
  update: { parameterId: string; languageCode: string; value: string }
): ProductParameterValue[] =>
  values.map((entry: ProductParameterValue): ProductParameterValue => {
    if (entry.parameterId !== update.parameterId) return entry;

    const currentValuesByLanguage = entry.valuesByLanguage ?? {};
    const nextValuesByLanguage =
      update.value.length > 0
        ? {
            ...currentValuesByLanguage,
            [update.languageCode]: update.value,
          }
        : Object.fromEntries(
            Object.entries(currentValuesByLanguage).filter(
              ([languageCode]: [string, string]): boolean => languageCode !== update.languageCode
            )
          );

    const nextEntry: ProductParameterValue = {
      ...entry,
      value: update.value,
    };

    if (Object.keys(nextValuesByLanguage).length > 0) {
      return {
        ...nextEntry,
        valuesByLanguage: nextValuesByLanguage,
      };
    }

    return {
      parameterId: nextEntry.parameterId,
      value: nextEntry.value,
    };
  });

const waitForParameterValueInferenceRun = (
  trackedRun: ParameterValueInferenceTrackedRun
): Promise<string> =>
  new Promise<string>((resolve, reject): void => {
    let unsubscribe: (() => void) | null = null;
    let cleanupAfterSubscribe = false;
    let terminalHandled = false;

    const cleanup = (): void => {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
        return;
      }
      cleanupAfterSubscribe = true;
    };

    const handleTerminalSnapshot = async (
      snapshot: TrackedAiPathRunSnapshot
    ): Promise<void> => {
      try {
        if (snapshot.status !== 'completed') {
          throw new Error(
            snapshot.errorMessage ??
              `Parameter inference failed: the AI Path run ${snapshot.status.replace(/_/g, ' ')}.`
          );
        }

        let response: Awaited<ReturnType<typeof getAiPathRun>>;
        try {
          response = await getAiPathRun(trackedRun.runId, { timeoutMs: 60_000 });
        } catch {
          throw new Error(
            'Parameter inference failed: unable to load the completed AI Path run details.'
          );
        }

        if (!response.ok) {
          throw new Error(
            response.error ||
              'Parameter inference failed: unable to load the completed AI Path run details.'
          );
        }

        const result = extractParameterValueInferenceResultFromAiPathRunDetail(response.data);
        if (!result) {
          throw new Error('Parameter inference failed: the AI Path did not return a parameter value.');
        }

        if (result.parameterId && result.parameterId !== trackedRun.parameterId) {
          throw new Error(
            'Parameter inference failed: the AI Path returned a value for a different parameter.'
          );
        }

        const normalizedValue = normalizeInferredParameterValue({
          value: result.value,
          selectorType: trackedRun.selectorType,
          optionLabels: trackedRun.optionLabels,
        });
        if (normalizedValue === null) {
          throw new Error(
            'Parameter inference failed: the AI Path returned a value outside the allowed options.'
          );
        }

        resolve(normalizedValue);
      } catch (error) {
        reject(error);
      } finally {
        cleanup();
      }
    };

    unsubscribe = subscribeToTrackedAiPathRun(trackedRun.runId, (snapshot) => {
      if (terminalHandled || snapshot.trackingState !== 'stopped') return;
      terminalHandled = true;
      void handleTerminalSnapshot(snapshot);
    });

    if (cleanupAfterSubscribe) {
      cleanup();
    }
  });

function ParameterSequenceInferenceToggle(
  props: ParameterSequenceInferenceToggleProps
): React.JSX.Element {
  const { selectedParameter, isExcluded, disabled, onToggle } = props;
  const parameterLabel = selectedParameter ? getParameterLabel(selectedParameter) : 'parameter';
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
        if (!selectedParameter) return;
        onToggle(selectedParameter.id);
      }}
      disabled={disabled || selectedParameter === null}
      aria-label={ariaLabel}
      aria-pressed={selectedParameter ? isExcluded : undefined}
      title={ariaLabel}
      className='h-9 w-9 shrink-0'
    >
      <Icon className='h-4 w-4' aria-hidden='true' />
    </Button>
  );
}

function ParameterValueInferTrigger(
  props: ParameterValueInferTriggerProps
): React.JSX.Element {
  const {
    rowIndex,
    selectedParameter,
    languageCode,
    languageLabel,
    currentValue,
    optionLabels,
    disabled,
    runParameterValueInference,
  } = props;
  const [isTriggerPending, setIsTriggerPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleParameterValueTrigger = useCallback(async (): Promise<void> => {
    setError(null);
    if (!selectedParameter) {
      setError('Parameter inference failed: select a parameter first.');
      return;
    }

    setIsTriggerPending(true);
    try {
      await runParameterValueInference({
        rowIndex,
        parameter: selectedParameter,
        languageCode,
        languageLabel,
        currentValue,
        optionLabels,
      });
      setError(null);
    } catch (triggerError) {
      setError(resolveParameterValueInferenceErrorMessage(triggerError));
    } finally {
      setIsTriggerPending(false);
    }
  }, [
    currentValue,
    languageCode,
    languageLabel,
    optionLabels,
    rowIndex,
    runParameterValueInference,
    selectedParameter,
  ]);

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
        aria-label={
          selectedParameter
            ? `Trigger parameter inference for ${getParameterLabel(selectedParameter)}`
            : 'Trigger parameter inference'
        }
        className='h-9 px-3 text-xs'
      >
        {FALLBACK_PARAMETER_VALUE_INFERENCE_BUTTON.display.label}
      </Button>
      {error ? <p className='max-w-40 text-xs text-destructive'>{error}</p> : null}
    </div>
  );
}

export default function ProductFormParameters(): React.JSX.Element {
  const {
    parameters,
    parametersLoading,
    parameterValues,
    addParameterValue,
    updateParameterId,
    updateParameterValueByLanguage,
    removeParameterValue,
  } = useProductFormParameters();

  const { selectedCatalogIds, filteredLanguages } = useProductFormMetadata();
  const formContext = useFormContext<ProductFormData>();
  const coreState = useContext(ProductFormCoreStateContext);
  const imageContext = useContext(ProductFormImageContext);
  const { fireAiPathTriggerEvent } = useAiPathTriggerEvent();
  const [sequenceState, setSequenceState] = useState<ParameterSequenceState>({
    status: 'idle',
    current: 0,
    total: 0,
    currentLabel: null,
    error: null,
  });
  const [sequenceExcludedParameterIds, setSequenceExcludedParameterIds] = useState<Set<string>>(
    () => new Set<string>()
  );
  const sequenceRunTokenRef = useRef(0);

  const catalogLanguages = useMemo((): CatalogLanguageOption[] => {
    const byCode = new Map<string, CatalogLanguageOption>();
    filteredLanguages.forEach((language: Language) => {
      const code = normalizeLanguageCode(language.code);
      if (!code || byCode.has(code)) return;
      const label =
        (typeof language.name === 'string' && language.name.trim()) ||
        (typeof language.nativeName === 'string' && language.nativeName.trim()) ||
        code.toUpperCase();
      byCode.set(code, {
        code,
        label,
      });
    });
    if (byCode.size === 0) {
      byCode.set('default', { code: 'default', label: 'Default' });
    }
    return Array.from(byCode.values());
  }, [filteredLanguages]);
  const primaryLanguageCode = catalogLanguages[0]?.code ?? 'default';
  const languageTabValues = useMemo(
    () => catalogLanguages.map((language: CatalogLanguageOption) => language.code),
    [catalogLanguages]
  );
  const firstLanguageTab = languageTabValues[0] ?? 'default';
  const [activeParameterLanguageTab, setActiveParameterLanguageTab] =
    useState<string>(firstLanguageTab);
  useEffect(() => {
    setActiveParameterLanguageTab((prev: string) =>
      prev && languageTabValues.includes(prev) ? prev : firstLanguageTab
    );
  }, [firstLanguageTab, languageTabValues]);
  const resolvedActiveParameterLanguageTab =
    activeParameterLanguageTab && languageTabValues.includes(activeParameterLanguageTab)
      ? activeParameterLanguageTab
      : firstLanguageTab;
  const activeParameterLanguage = catalogLanguages.find(
    (language: CatalogLanguageOption) => language.code === resolvedActiveParameterLanguageTab
  ) ??
    catalogLanguages[0] ?? { code: 'default', label: 'Default' };
  const preferredLocale = activeParameterLanguage.code;
  const selectedIds = useMemo(
    () => parameterValues.map((entry: ProductParameterValue) => entry.parameterId).filter(Boolean),
    [parameterValues]
  );
  useEffect(() => {
    const currentParameterIds = new Set(
      parameterValues
        .map((entry: ProductParameterValue): string => entry.parameterId)
        .filter((parameterId: string): boolean => parameterId.length > 0)
    );
    setSequenceExcludedParameterIds((current: Set<string>): Set<string> => {
      const next = new Set<string>();
      current.forEach((parameterId: string): void => {
        if (currentParameterIds.has(parameterId)) {
          next.add(parameterId);
        }
      });
      return next.size === current.size ? current : next;
    });
  }, [parameterValues]);
  const hasParameterValueByLanguage = useMemo((): Record<string, boolean> => {
    const result: Record<string, boolean> = {};
    languageTabValues.forEach((languageCode: string) => {
      result[languageCode] = parameterValues.some(
        (entry: ProductParameterValue): boolean =>
          getParameterLanguageValue(entry, languageCode, primaryLanguageCode).trim().length > 0
      );
    });
    return result;
  }, [languageTabValues, parameterValues, primaryLanguageCode]);
  const parameterById = useMemo(() => {
    const map = new Map<string, ProductParameter>();
    parameters.forEach((parameter: ProductParameter) => {
      map.set(parameter.id, parameter);
    });
    return map;
  }, [parameters]);
  const parameterValueIndexByParameterIdRef = useRef<Map<string, number>>(new Map());
  parameterValueIndexByParameterIdRef.current = new Map(
    parameterValues.flatMap((entry: ProductParameterValue, index: number) =>
      entry.parameterId ? [[entry.parameterId, index] as const] : []
    )
  );
  const resolveCurrentParameterValueRowIndex = useCallback(
    (parameterId: string): number | null =>
      parameterValueIndexByParameterIdRef.current.get(parameterId) ?? null,
    []
  );
  const parameterValuesSnapshotRef = useRef<ProductParameterValue[]>(parameterValues);
  if (sequenceState.status !== 'running') {
    parameterValuesSnapshotRef.current = parameterValues;
  }
  const getFormValuesWithImages = useCallback((): ProductFormData & Record<string, unknown> => {
    const values: ProductFormData & Record<string, unknown> = {
      ...((coreState?.getValues ?? formContext.getValues)()),
      imageLinks: imageContext?.imageLinks ?? [],
      parameters: parameterValuesSnapshotRef.current,
    };
    return values;
  }, [coreState?.getValues, formContext.getValues, imageContext?.imageLinks]);
  const runParameterValueInference = useCallback<RunParameterValueInference>(
    async (row: ParameterValueInferenceRunRow): Promise<ParameterValueInferenceAppliedResult> => {
      const triggerInput = buildParameterValueInferenceTriggerInput({
        values: getFormValuesWithImages(),
        imageLinks: imageContext?.imageLinks ?? [],
        row: {
          index: row.rowIndex,
          parameter: row.parameter,
          languageCode: row.languageCode,
          languageLabel: row.languageLabel,
          currentValue: row.currentValue,
        },
      });

      const runId = await new Promise<string>((resolve, reject): void => {
        let settled = false;
        const resolveRun = (nextRunId: string): void => {
          if (settled) return;
          const normalizedRunId = nextRunId.trim();
          if (!normalizedRunId) {
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

        void (async (): Promise<void> => {
          try {
            await fireAiPathTriggerEvent({
              triggerEventId: PARAMETER_VALUE_INFERENCE_TRIGGER_BUTTON_ID,
              triggerLabel: FALLBACK_PARAMETER_VALUE_INFERENCE_BUTTON.name,
              preferredPathId: PARAMETER_VALUE_INFERENCE_PATH_ID,
              entityType: 'product',
              entityId: coreState?.product?.id ?? null,
              getEntityJson: () => {
                const entityJson = buildTriggeredProductEntityJson({
                  product: coreState?.product,
                  draft: coreState?.draft,
                  values: getFormValuesWithImages(),
                });
                entityJson['parameterValueInferenceInput'] = triggerInput;
                return entityJson;
              },
              source: {
                tab: 'product',
                location: PARAMETER_VALUE_INFERENCE_TRIGGER_LOCATION,
              },
              extras: {
                parameterValueInferenceInput: triggerInput,
                mode: 'click',
              },
              onError: rejectLaunch,
              onSuccess: resolveRun,
            });
          } catch (error) {
            rejectLaunch(error);
            return;
          }

          if (!settled) {
            rejectLaunch('unable to start the AI Path run.');
          }
        })();
      });

      const normalizedValue = await waitForParameterValueInferenceRun({
        runId,
        parameterId: row.parameter.id,
        languageCode: row.languageCode,
        selectorType: row.parameter.selectorType,
        optionLabels: row.optionLabels,
      });
      const currentRowIndex = resolveCurrentParameterValueRowIndex(row.parameter.id);
      if (currentRowIndex === null) {
        throw new Error('Parameter inference failed: the parameter row is no longer available.');
      }

      updateParameterValueByLanguage(currentRowIndex, row.languageCode, normalizedValue);
      parameterValuesSnapshotRef.current = applyParameterValueToSnapshot(
        parameterValuesSnapshotRef.current,
        {
          parameterId: row.parameter.id,
          languageCode: row.languageCode,
          value: normalizedValue,
        }
      );

      return {
        runId,
        parameterId: row.parameter.id,
        rowIndex: currentRowIndex,
        value: normalizedValue,
      };
    },
    [
      coreState?.draft,
      coreState?.product,
      fireAiPathTriggerEvent,
      getFormValuesWithImages,
      imageContext?.imageLinks,
      resolveCurrentParameterValueRowIndex,
      updateParameterValueByLanguage,
    ]
  );
  const toggleParameterSequenceExclusion = useCallback((parameterId: string): void => {
    setSequenceExcludedParameterIds((current: Set<string>): Set<string> => {
      const next = new Set(current);
      if (next.has(parameterId)) {
        next.delete(parameterId);
      } else {
        next.add(parameterId);
      }
      return next;
    });
  }, []);
  const eligibleSequenceRows = useMemo(
    (): ParameterValueInferenceRunRow[] =>
      parameterValues.flatMap((entry: ProductParameterValue, index: number) => {
        if (entry.parameterId.length === 0) return [];
        if (sequenceExcludedParameterIds.has(entry.parameterId)) return [];
        const parameter = parameterById.get(entry.parameterId);
        const hasLinkedTitleTerm =
          parameter?.linkedTitleTermType !== null &&
          parameter?.linkedTitleTermType !== undefined;
        if (parameter === undefined || hasLinkedTitleTerm) return [];
        const currentValue = getParameterLanguageValue(
          entry,
          activeParameterLanguage.code,
          primaryLanguageCode
        );
        return [
          {
            rowIndex: index,
            parameter,
            languageCode: activeParameterLanguage.code,
            languageLabel: activeParameterLanguage.label,
            currentValue,
            optionLabels: buildNormalizedParameterOptionLabels(parameter, currentValue),
          },
        ];
      }),
    [
      activeParameterLanguage.code,
      activeParameterLanguage.label,
      parameterById,
      parameterValues,
      primaryLanguageCode,
      sequenceExcludedParameterIds,
    ]
  );
  const isSequenceRunning = sequenceState.status === 'running';
  const sequenceStatusMessage = useMemo((): string | null => {
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
    if (sequenceState.status === 'failed') {
      return sequenceState.error;
    }
    return null;
  }, [sequenceState]);
  const handleRunParameterSequence = useCallback(async (): Promise<void> => {
    if (eligibleSequenceRows.length === 0) {
      setSequenceState({
        status: 'failed',
        current: 0,
        total: 0,
        currentLabel: null,
        error: 'Parameter sequence failed: no eligible parameters to run.',
      });
      return;
    }

    const runToken = sequenceRunTokenRef.current + 1;
    sequenceRunTokenRef.current = runToken;
    const total = eligibleSequenceRows.length;

    for (let index = 0; index < eligibleSequenceRows.length; index += 1) {
      const row = eligibleSequenceRows[index];
      if (row === undefined) continue;
      const parameterLabel = getParameterLabel(row.parameter, preferredLocale);
      setSequenceState({
        status: 'running',
        current: index + 1,
        total,
        currentLabel: parameterLabel,
        error: null,
      });

      try {
        // eslint-disable-next-line no-await-in-loop -- the sequence must apply each value before launching the next run.
        await runParameterValueInference(row);
      } catch (error) {
        if (sequenceRunTokenRef.current !== runToken) return;
        const message = resolveParameterValueInferenceErrorMessage(error);
        setSequenceState({
          status: 'failed',
          current: index + 1,
          total,
          currentLabel: parameterLabel,
          error: `${parameterLabel}: ${message}`,
        });
        return;
      }

      if (sequenceRunTokenRef.current !== runToken) return;
    }

    setSequenceState({
      status: 'completed',
      current: total,
      total,
      currentLabel: null,
      error: null,
    });
  }, [eligibleSequenceRows, preferredLocale, runParameterValueInference]);

  if (selectedCatalogIds.length === 0) {
    return (
      <Alert variant='warning' className='mb-6'>
        <p className='text-sm'>Select a catalog to manage product parameters.</p>
      </Alert>
    );
  }

  return (
    <div className='space-y-6'>
      <FormSection
        title='Parameters'
        description='Choose parameters and provide values for this product.'
      >
        <div className='mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
          <div className='min-h-4 text-xs text-muted-foreground'>
            {sequenceStatusMessage !== null ? (
              <span
                className={
                  sequenceState.status === 'failed' ? 'text-destructive' : undefined
                }
              >
                {sequenceStatusMessage}
              </span>
            ) : null}
          </div>
          <div className='flex justify-end gap-2'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={(): void => {
                void handleRunParameterSequence();
              }}
              disabled={
                parametersLoading ||
                parameters.length === 0 ||
                eligibleSequenceRows.length === 0 ||
                isSequenceRunning
              }
            >
              Run parameter sequence
            </Button>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={addParameterValue}
              disabled={parametersLoading || parameters.length === 0 || isSequenceRunning}
            >
              Add parameter
            </Button>
          </div>
        </div>

        {parametersLoading ? (
          <LoadingState message='Loading parameters...' className='py-8 border border-dashed' />
        ) : parameters.length === 0 ? (
          <CompactEmptyState
            title='No parameters'
            description='No parameters available for the selected catalog(s).'
            className='bg-card/20 py-8'
           />
        ) : parameterValues.length === 0 ? (
          <CompactEmptyState
            title='No values'
            description='Add your first parameter to start building values.'
            className='bg-card/20 py-8'
           />
        ) : (
          <div className='space-y-3'>
            <Tabs
              value={resolvedActiveParameterLanguageTab}
              onValueChange={setActiveParameterLanguageTab}
              className='w-full'
            >
              <TabsList className='mb-1' aria-label='Product parameter language tabs'>
                {catalogLanguages.map((language: CatalogLanguageOption) => (
                  <TabsTrigger
                    key={language.code}
                    value={language.code}
                    className={
                      !hasParameterValueByLanguage[language.code]
                        ? 'text-muted-foreground/90 data-[state=active]:text-muted-foreground/90'
                        : 'text-foreground data-[state=inactive]:text-foreground font-medium'
                    }
                  >
                    {language.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            {parameterValues.map((entry: ProductParameterValue, index: number) => {
              const availableOptions = parameters.filter(
                (param: ProductParameter) =>
                  (!selectedIds.includes(param.id) || param.id === entry.parameterId) &&
                  (!param.linkedTitleTermType || param.id === entry.parameterId)
              );
              const parameterOptions = buildParameterOptions(availableOptions, preferredLocale);
              const selectedParameter = entry.parameterId
                ? (parameterById.get(entry.parameterId) ?? null)
                : null;
              const isSequenceExcluded =
                entry.parameterId.length > 0 && sequenceExcludedParameterIds.has(entry.parameterId);
              const isLinkedParameter = Boolean(selectedParameter?.linkedTitleTermType);
              const linkedTitleTermLabel = getLinkedTitleTermLabel(
                selectedParameter?.linkedTitleTermType ?? null
              );
              const selectorType = selectedParameter?.selectorType ?? 'text';
              const needsOptions = SELECTOR_TYPES_REQUIRING_OPTIONS.has(selectorType);
              const getLanguageValue = (languageCode: string): string => {
                return getParameterLanguageValue(entry, languageCode, primaryLanguageCode);
              };
              const activeLanguageValue = getLanguageValue(activeParameterLanguage.code);
              const normalizedOptionLabels = selectedParameter
                ? buildNormalizedParameterOptionLabels(selectedParameter, activeLanguageValue)
                : [];
              const handleLanguageValueChange = (languageCode: string, nextValue: string): void => {
                updateParameterValueByLanguage(index, languageCode, nextValue);
              };
              const currentChecklistValues = parseChecklistValues(activeLanguageValue);
              const optionLookup = new Map<string, string>();
              normalizedOptionLabels.forEach((label: string) => {
                optionLookup.set(label.trim().toLowerCase(), label);
              });
              const checklistValues = currentChecklistValues.map(
                (value: string): string => optionLookup.get(value.trim().toLowerCase()) ?? value
              );
              const checklistValueKeys = new Set<string>(
                checklistValues.map((value: string) => value.trim().toLowerCase())
              );
              const checklistOptions = [...normalizedOptionLabels];
              checklistValues.forEach((value: string) => {
                const key = value.trim().toLowerCase();
                const alreadyIncluded = checklistOptions.some(
                  (option: string) => option.trim().toLowerCase() === key
                );
                if (!alreadyIncluded) {
                  checklistOptions.push(value);
                }
              });
              const selectLabelOptions = buildLabelOptions(normalizedOptionLabels);

              return (
                <div
                  key={`${entry.parameterId || 'new'}-${index}`}
                  className={`${insetPanelVariants({ radius: 'compact', padding: 'sm' })} flex flex-col gap-3 border-border`}
                >
                  <div className='flex flex-col gap-3 md:flex-row md:items-center'>
                    <div className='w-full md:w-64'>
                      <SelectSimple
                        size='sm'
                        value={entry.parameterId}
                        onValueChange={(value: string) => updateParameterId(index, value)}
                        options={parameterOptions}
                        placeholder='Select parameter'
                        ariaLabel='Parameter'
                        triggerClassName='h-9 bg-gray-900 border-border/50'
                        disabled={isLinkedParameter || isSequenceRunning}
                       title='Select parameter'/>
                    </div>
                    <div className='flex-1 space-y-3'>
                      {isLinkedParameter && linkedTitleTermLabel ? (
                        <div className='flex items-center gap-2 text-xs text-emerald-300'>
                          <span className='rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 font-medium tracking-wide'>
                            Synced from English Title
                          </span>
                          <span>{linkedTitleTermLabel} term</span>
                        </div>
                      ) : null}
                      <div className='space-y-1'>
                        <Label className='text-[11px] font-medium uppercase tracking-wider text-gray-400'>
                          {activeParameterLanguage.label}
                        </Label>
                        <div className='flex items-start gap-2'>
                          <ParameterSequenceInferenceToggle
                            selectedParameter={selectedParameter}
                            isExcluded={isSequenceExcluded}
                            disabled={!entry.parameterId || isLinkedParameter || isSequenceRunning}
                            onToggle={toggleParameterSequenceExclusion}
                          />
                          <ParameterValueInferTrigger
                            rowIndex={index}
                            selectedParameter={selectedParameter}
                            languageCode={activeParameterLanguage.code}
                            languageLabel={activeParameterLanguage.label}
                            currentValue={getLanguageValue(activeParameterLanguage.code)}
                            optionLabels={normalizedOptionLabels}
                            disabled={
                              !entry.parameterId ||
                              isLinkedParameter ||
                              isSequenceExcluded ||
                              isSequenceRunning
                            }
                            runParameterValueInference={runParameterValueInference}
                          />
                          <div className='min-w-0 flex-1'>
                            {selectorType === 'textarea' ? (
                              <Textarea
                                value={getLanguageValue(activeParameterLanguage.code)}
                                onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                                  handleLanguageValueChange(
                                    activeParameterLanguage.code,
                                    event.target.value
                                  )
                                }
                                aria-label={`Value (${activeParameterLanguage.label})`}
                                placeholder={`Value (${activeParameterLanguage.label})`}
                                disabled={!entry.parameterId || isLinkedParameter || isSequenceRunning}
                                className='min-h-[84px] bg-gray-900'
                               title={`Value (${activeParameterLanguage.label})`}/>
                            ) : selectorType === 'radio' ? (
                              <div className='rounded-md border border-border/50 bg-gray-900/50 p-3'>
                                <RadioGroup
                                  value={getLanguageValue(activeParameterLanguage.code)}
                                  onValueChange={(value: string): void =>
                                    handleLanguageValueChange(activeParameterLanguage.code, value)
                                  }
                                  className='gap-2'
                                  disabled={!entry.parameterId || isLinkedParameter || isSequenceRunning}
                                >
                                  {normalizedOptionLabels.map((optionLabel: string) => {
                                    const radioId = `product-param-${index}-${activeParameterLanguage.code}-${optionLabel}`;
                                    return (
                                      <div key={optionLabel} className='flex items-center gap-2'>
                                        <RadioGroupItem value={optionLabel} id={radioId} />
                                        <Label htmlFor={radioId} className='text-sm text-gray-200'>
                                          {optionLabel}
                                        </Label>
                                      </div>
                                    );
                                  })}
                                </RadioGroup>
                              </div>
                            ) : selectorType === 'checkbox' ? (
                              <ToggleRow
                                label={normalizedOptionLabels[0] ?? 'Enabled'}
                                checked={((): boolean => {
                                  const currentValue = getLanguageValue(activeParameterLanguage.code)
                                    .trim()
                                    .toLowerCase();
                                  const optionValue =
                                    normalizedOptionLabels[0]?.trim().toLowerCase() ?? '';
                                  return (
                                    currentValue === 'true' ||
                                    currentValue === '1' ||
                                    currentValue === 'yes' ||
                                    currentValue === 'on' ||
                                    (optionValue ? currentValue === optionValue : false)
                                  );
                                })()}
                                onCheckedChange={(checked: boolean): void =>
                                  handleLanguageValueChange(
                                    activeParameterLanguage.code,
                                    checked ? (normalizedOptionLabels[0] ?? 'true') : ''
                                  )
                                }
                                disabled={!entry.parameterId || isLinkedParameter || isSequenceRunning}
                                className='bg-gray-900/50'
                              />
                            ) : selectorType === 'checklist' ? (
                              <div className='rounded-md border border-border/50 bg-gray-900/50 p-3'>
                                <div className='space-y-2'>
                                  {checklistOptions.map((optionLabel: string) => {
                                    const optionKey = optionLabel.trim().toLowerCase();
                                    return (
                                      <ToggleRow
                                        key={optionLabel}
                                        label={optionLabel}
                                        checked={checklistValueKeys.has(optionKey)}
                                        onCheckedChange={(checked: boolean): void => {
                                          const nextValues = checked
                                            ? [...checklistValues, optionLabel]
                                            : checklistValues.filter(
                                              (value: string) =>
                                                value.trim().toLowerCase() !== optionKey
                                            );
                                          handleLanguageValueChange(
                                            activeParameterLanguage.code,
                                            formatChecklistValues(
                                              Array.from(
                                                new Map<string, string>(
                                                  nextValues.map((value: string) => [
                                                    value.trim().toLowerCase(),
                                                    value,
                                                  ])
                                                ).values()
                                              )
                                            )
                                          );
                                        }}
                                        disabled={
                                          !entry.parameterId ||
                                          isLinkedParameter ||
                                          isSequenceRunning
                                        }
                                        className='border-none bg-transparent p-0 hover:bg-transparent'
                                      />
                                    );
                                  })}
                                </div>
                              </div>
                            ) : selectorType === 'select' || selectorType === 'dropdown' ? (
                              <SelectSimple
                                size='sm'
                                value={getLanguageValue(activeParameterLanguage.code)}
                                onValueChange={(value: string): void =>
                                  handleLanguageValueChange(activeParameterLanguage.code, value)
                                }
                                options={selectLabelOptions}
                                ariaLabel={`Value (${activeParameterLanguage.label})`}
                                placeholder={`Select value (${activeParameterLanguage.label})`}
                                triggerClassName='h-9 bg-gray-900 border-border/50'
                                disabled={!entry.parameterId || isLinkedParameter || isSequenceRunning}
                               title={`Select value (${activeParameterLanguage.label})`}/>
                            ) : (
                              <Input
                                value={getLanguageValue(activeParameterLanguage.code)}
                                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                  handleLanguageValueChange(
                                    activeParameterLanguage.code,
                                    event.target.value
                                  )
                                }
                                aria-label={`Value (${activeParameterLanguage.label})`}
                                placeholder={`Value (${activeParameterLanguage.label})`}
                                disabled={!entry.parameterId || isLinkedParameter || isSequenceRunning}
                                className='h-9'
                               title={`Value (${activeParameterLanguage.label})`}/>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className='h-9 w-9 text-gray-500 hover:text-red-400'
                      aria-label='Remove parameter'
                      onClick={() => removeParameterValue(index)}
                      disabled={isLinkedParameter || isSequenceRunning}
                      title={
                        isLinkedParameter
                          ? 'Linked parameters are synced from English Title'
                          : 'Remove parameter'
                      }
                    >
                      <X className='h-4 w-4' />
                    </Button>
                  </div>
                  {needsOptions && normalizedOptionLabels.length === 0 && entry.parameterId ? (
                    <Alert variant='warning' className='py-2'>
                      <p className='text-xs'>
                        This parameter has no option labels configured yet. Add labels in Product
                        Settings.
                      </p>
                    </Alert>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </FormSection>
    </div>
  );
}
