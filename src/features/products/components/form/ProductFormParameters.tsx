'use client';
// ProductFormParameters: parameter panel inside the product editor.
// Renders parameter mapping controls and binds to product form metadata.
// Designed for dynamic parameter schemas per catalog and handles i18n.

import { X } from 'lucide-react';
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
import { subscribeToTrackedAiPathRun } from '@/shared/lib/ai-paths/client-run-tracker';
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
  parameter: { name_en: string; name_pl?: string | null; name_de?: string | null },
  preferredLocale?: string
): string => {
  const preferred = preferredLocale?.toLowerCase();
  if (preferred === 'pl' && parameter.name_pl) return parameter.name_pl;
  if (preferred === 'de' && parameter.name_de) return parameter.name_de;
  return parameter.name_en || parameter.name_pl || parameter.name_de || 'Unnamed parameter';
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
  resolveCurrentRowIndex: (parameterId: string) => number | null;
  updateParameterValueByLanguage: (index: number, languageCode: string, value: string) => void;
};

type PendingParameterValueRun = {
  runId: string;
  parameterId: string;
  languageCode: string;
  selectorType: ProductParameter['selectorType'];
  optionLabels: string[];
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
    resolveCurrentRowIndex,
    updateParameterValueByLanguage,
  } = props;
  const formContext = useFormContext<ProductFormData>();
  const coreState = useContext(ProductFormCoreStateContext);
  const imageContext = useContext(ProductFormImageContext);
  const { fireAiPathTriggerEvent } = useAiPathTriggerEvent();
  const [pendingRun, setPendingRun] = useState<PendingParameterValueRun | null>(null);
  const [isTriggerPending, setIsTriggerPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildCurrentInput = useCallback(() => {
    if (!selectedParameter) return null;
    const values = {
      ...((coreState?.getValues ?? formContext.getValues)() as ProductFormData),
      imageLinks: imageContext?.imageLinks ?? [],
    } as ProductFormData & Record<string, unknown>;

    return buildParameterValueInferenceTriggerInput({
      values,
      imageLinks: imageContext?.imageLinks ?? [],
      row: {
        index: rowIndex,
        parameter: selectedParameter,
        languageCode,
        languageLabel,
        currentValue,
      },
    });
  }, [
    coreState,
    currentValue,
    formContext.getValues,
    imageContext?.imageLinks,
    languageCode,
    languageLabel,
    rowIndex,
    selectedParameter,
  ]);

  const handleParameterValueTrigger = useCallback(async (): Promise<void> => {
    setError(null);
    if (!selectedParameter) {
      setError('Parameter inference failed: select a parameter first.');
      return;
    }

    const triggerInput = buildCurrentInput();
    if (!triggerInput) {
      setError('Parameter inference failed: select a parameter first.');
      return;
    }

    setIsTriggerPending(true);
    try {
      await fireAiPathTriggerEvent({
        triggerEventId: PARAMETER_VALUE_INFERENCE_TRIGGER_BUTTON_ID,
        triggerLabel: FALLBACK_PARAMETER_VALUE_INFERENCE_BUTTON.name,
        preferredPathId: PARAMETER_VALUE_INFERENCE_PATH_ID,
        entityType: 'product',
        entityId: coreState?.product?.id ?? null,
        getEntityJson: () => {
          const values = {
            ...((coreState?.getValues ?? formContext.getValues)() as ProductFormData),
            imageLinks: imageContext?.imageLinks ?? [],
          } as ProductFormData & Record<string, unknown>;
          const entityJson = buildTriggeredProductEntityJson({
            product: coreState?.product,
            draft: coreState?.draft,
            values,
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
        onError: (launchError): void => {
          setError(
            resolveParameterValueLaunchErrorMessage({
              message: launchError,
            })
          );
        },
        onSuccess: (runId: string): void => {
          setPendingRun({
            runId,
            parameterId: selectedParameter.id,
            languageCode,
            selectorType: selectedParameter.selectorType,
            optionLabels,
          });
        },
      });
    } finally {
      setIsTriggerPending(false);
    }
  }, [
    buildCurrentInput,
    coreState?.draft,
    coreState?.getValues,
    coreState?.product,
    fireAiPathTriggerEvent,
    formContext.getValues,
    imageContext?.imageLinks,
    languageCode,
    optionLabels,
    selectedParameter,
  ]);

  useEffect(() => {
    if (!pendingRun) return;

    let active = true;
    let terminalHandled = false;
    const trackedRun = pendingRun;

    const unsubscribe = subscribeToTrackedAiPathRun(trackedRun.runId, (snapshot) => {
      if (!active || terminalHandled || snapshot.trackingState !== 'stopped') return;
      terminalHandled = true;

      void (async (): Promise<void> => {
        if (snapshot.status !== 'completed') {
          if (!active) return;
          setError(
            snapshot.errorMessage ??
              `Parameter inference failed: the AI Path run ${snapshot.status.replace(/_/g, ' ')}.`
          );
          setPendingRun((current) =>
            current?.runId === trackedRun.runId ? null : current
          );
          return;
        }

        let response: Awaited<ReturnType<typeof getAiPathRun>>;
        try {
          response = await getAiPathRun(trackedRun.runId, { timeoutMs: 60_000 });
        } catch {
          if (!active) return;
          setError('Parameter inference failed: unable to load the completed AI Path run details.');
          setPendingRun((current) =>
            current?.runId === trackedRun.runId ? null : current
          );
          return;
        }
        if (!active) return;
        if (!response.ok) {
          setError(
            response.error ||
              'Parameter inference failed: unable to load the completed AI Path run details.'
          );
          setPendingRun((current) =>
            current?.runId === trackedRun.runId ? null : current
          );
          return;
        }

        const result = extractParameterValueInferenceResultFromAiPathRunDetail(response.data);
        if (!result) {
          setError('Parameter inference failed: the AI Path did not return a parameter value.');
          setPendingRun((current) =>
            current?.runId === trackedRun.runId ? null : current
          );
          return;
        }

        if (result.parameterId && result.parameterId !== trackedRun.parameterId) {
          setError('Parameter inference failed: the AI Path returned a value for a different parameter.');
          setPendingRun((current) =>
            current?.runId === trackedRun.runId ? null : current
          );
          return;
        }

        const normalizedValue = normalizeInferredParameterValue({
          value: result.value,
          selectorType: trackedRun.selectorType,
          optionLabels: trackedRun.optionLabels,
        });
        if (normalizedValue === null) {
          setError('Parameter inference failed: the AI Path returned a value outside the allowed options.');
          setPendingRun((current) =>
            current?.runId === trackedRun.runId ? null : current
          );
          return;
        }

        const currentRowIndex = resolveCurrentRowIndex(trackedRun.parameterId);
        if (currentRowIndex === null) {
          setPendingRun((current) =>
            current?.runId === trackedRun.runId ? null : current
          );
          return;
        }

        updateParameterValueByLanguage(
          currentRowIndex,
          trackedRun.languageCode,
          normalizedValue
        );
        setError(null);
        setPendingRun((current) =>
          current?.runId === trackedRun.runId ? null : current
        );
      })();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [pendingRun, resolveCurrentRowIndex, updateParameterValueByLanguage]);

  return (
    <div className='flex shrink-0 flex-col items-start gap-1'>
      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={(): void => {
          void handleParameterValueTrigger();
        }}
        disabled={disabled || isTriggerPending || pendingRun !== null}
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
  const preferredLocale = primaryLanguageCode;
  const selectedIds = useMemo(
    () => parameterValues.map((entry: ProductParameterValue) => entry.parameterId).filter(Boolean),
    [parameterValues]
  );
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
        <div className='mb-2 flex justify-end'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={addParameterValue}
            disabled={parametersLoading || parameters.length === 0}
          >
            Add parameter
          </Button>
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
              const isLinkedParameter = Boolean(selectedParameter?.linkedTitleTermType);
              const linkedTitleTermLabel = getLinkedTitleTermLabel(
                selectedParameter?.linkedTitleTermType ?? null
              );
              const selectorType = selectedParameter?.selectorType ?? 'text';
              const optionLabels = Array.isArray(selectedParameter?.optionLabels)
                ? selectedParameter.optionLabels
                : [];
              const needsOptions = SELECTOR_TYPES_REQUIRING_OPTIONS.has(selectorType);
              const normalizedOptionLabels = Array.from(
                new Set(
                  optionLabels
                    .map((value: string) => value.trim())
                    .filter((value: string) => value.length > 0)
                )
              );
              const getLanguageValue = (languageCode: string): string => {
                return getParameterLanguageValue(entry, languageCode, primaryLanguageCode);
              };
              const activeLanguageValue = getLanguageValue(activeParameterLanguage.code);

              if (
                activeLanguageValue &&
                needsOptions &&
                !normalizedOptionLabels.includes(activeLanguageValue)
              ) {
                normalizedOptionLabels.unshift(activeLanguageValue);
              }
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
                        disabled={isLinkedParameter}
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
                          <ParameterValueInferTrigger
                            rowIndex={index}
                            selectedParameter={selectedParameter}
                            languageCode={activeParameterLanguage.code}
                            languageLabel={activeParameterLanguage.label}
                            currentValue={getLanguageValue(activeParameterLanguage.code)}
                            optionLabels={normalizedOptionLabels}
                            disabled={!entry.parameterId || isLinkedParameter}
                            resolveCurrentRowIndex={resolveCurrentParameterValueRowIndex}
                            updateParameterValueByLanguage={updateParameterValueByLanguage}
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
                                disabled={!entry.parameterId || isLinkedParameter}
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
                                  disabled={!entry.parameterId || isLinkedParameter}
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
                                disabled={!entry.parameterId || isLinkedParameter}
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
                                        disabled={!entry.parameterId || isLinkedParameter}
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
                                disabled={!entry.parameterId || isLinkedParameter}
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
                                disabled={!entry.parameterId || isLinkedParameter}
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
                      disabled={isLinkedParameter}
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
