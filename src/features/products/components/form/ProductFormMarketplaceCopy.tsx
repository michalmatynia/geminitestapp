'use client';
'use no memo';

import { Languages, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form';

import { useProductFormCore } from '@/features/products/context/ProductFormCoreContext';
import { buildMarketplaceCopyDebrandTriggerInput } from '@/features/products/lib/buildMarketplaceCopyDebrandTriggerInput';
import { buildTriggeredProductEntityJson } from '@/features/products/lib/build-triggered-product-entity-json';
import { extractDebrandedMarketplaceCopyResultFromAiPathRunDetail } from '@/features/products/lib/extractDebrandedMarketplaceCopyFromAiPathRunDetail';
import { resolveIntegrationDisplayName } from '@/features/integrations/components/listings/product-listings-labels';
import {
  isBaseIntegrationSlug,
  isLinkedInIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import { useIntegrations } from '@/features/integrations/hooks/useIntegrationQueries';
import type { AiTriggerButtonRecord } from '@/shared/contracts/ai-trigger-buttons';
import type { Integration } from '@/shared/contracts/integrations/base';
import type { ProductFormData } from '@/shared/contracts/products/drafts';
import type { MultiSelectOption } from '@/shared/contracts/ui/controls';
import { getAiPathRun } from '@/shared/lib/ai-paths/api/client';
import { subscribeToTrackedAiPathRun } from '@/shared/lib/ai-paths/client-run-tracker';
import { useAiPathTriggerEvent } from '@/shared/lib/ai-paths/hooks/useAiPathTriggerEvent';
import {
  MARKETPLACE_COPY_DEBRAND_PATH_ID,
  MARKETPLACE_COPY_DEBRAND_TRIGGER_BUTTON_ID,
  MARKETPLACE_COPY_DEBRAND_TRIGGER_LOCATION,
  MARKETPLACE_COPY_DEBRAND_TRIGGER_NAME,
  MARKETPLACE_COPY_DEBRAND_TRIGGER_SORT_INDEX,
} from '@/shared/lib/ai-paths/marketplace-copy-debrand';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { FormField, FormSection } from '@/shared/ui/form-section';
import { Input } from '@/shared/ui/input';
import { MultiSelect } from '@/shared/ui/multi-select';
import { Textarea } from '@/shared/ui/textarea';

type MarketplaceCopyFormEntry = NonNullable<ProductFormData['marketplaceContentOverrides']>[number];
type MarketplaceCopyErrorEntry = {
  integrationIds?: unknown;
  title?: unknown;
  description?: unknown;
};
type MarketplaceCopyDebrandTriggerProps = {
  rowId: string;
  rowIndex: number;
  integrationIds: string[];
  integrationLabels: string[];
  currentTitle: string;
  currentDescription: string;
  disabled: boolean;
  resolveCurrentRowIndex: (rowId: string) => number | null;
};

const FALLBACK_MARKETPLACE_COPY_DEBRAND_BUTTON: AiTriggerButtonRecord = {
  id: MARKETPLACE_COPY_DEBRAND_TRIGGER_BUTTON_ID,
  name: MARKETPLACE_COPY_DEBRAND_TRIGGER_NAME,
  pathId: MARKETPLACE_COPY_DEBRAND_PATH_ID,
  locations: [MARKETPLACE_COPY_DEBRAND_TRIGGER_LOCATION],
  mode: 'click',
  display: {
    label: MARKETPLACE_COPY_DEBRAND_TRIGGER_NAME,
    showLabel: true,
  },
  enabled: true,
  sortIndex: MARKETPLACE_COPY_DEBRAND_TRIGGER_SORT_INDEX,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const createEmptyMarketplaceCopyOverride = (): NonNullable<
  ProductFormData['marketplaceContentOverrides']
>[number] => ({
  integrationIds: [],
  title: '',
  description: '',
});

const toErrorMessage = (value: unknown): string | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const message = (value as { message?: unknown }).message;
  return typeof message === 'string' ? message : undefined;
};

const resolveDebrandLaunchErrorMessage = (payload: {
  error?: string | null | undefined;
  message?: string | null | undefined;
}): string => {
  const explicitMessage =
    typeof payload.message === 'string' ? payload.message.trim() : '';
  if (explicitMessage.length > 0) {
    return explicitMessage.startsWith('Debrand failed:')
      ? explicitMessage
      : `Debrand failed: ${explicitMessage}`;
  }

  switch (payload.error) {
    case 'preferred_path_missing':
      return 'Debrand failed: the configured AI Path is missing.';
    case 'trigger_node_not_found':
      return 'Debrand failed: the selected AI Path no longer contains the Debrand trigger node.';
    case 'path_disabled':
      return 'Debrand failed: all AI Paths for this trigger are disabled.';
    case 'ambiguous_path_selection':
      return 'Debrand failed: multiple active AI Paths match this trigger.';
    case 'no_path_configured':
      return 'Debrand failed: no AI Path is configured for this trigger.';
    default:
      return 'Debrand failed: unable to start the AI Path run.';
  }
};

const resolveMarketplaceIntegrationOptions = ({
  integrations,
  selectedIntegrationIds,
}: {
  integrations: Integration[];
  selectedIntegrationIds: string[];
}): MultiSelectOption[] => {
  const eligibleOptions = integrations
    .filter((integration: Integration) => {
      const slug = integration.slug?.trim() ?? '';
      return !isBaseIntegrationSlug(slug) && !isLinkedInIntegrationSlug(slug);
    })
    .map((integration: Integration) => ({
      value: integration.id,
      label: resolveIntegrationDisplayName(integration.name, integration.slug) ?? integration.name,
    }));

  const seen = new Set(eligibleOptions.map((option) => option.value));
  const unknownSelectedOptions = selectedIntegrationIds.flatMap((integrationId) => {
    if (!integrationId || seen.has(integrationId)) return [];
    seen.add(integrationId);
    return [
      {
        value: integrationId,
        label: `Unknown integration (${integrationId})`,
      },
    ];
  });

  return [...eligibleOptions, ...unknownSelectedOptions].sort((left, right) =>
    left.label.localeCompare(right.label)
  );
};

function MarketplaceCopyDebrandTrigger(
  props: MarketplaceCopyDebrandTriggerProps
): React.JSX.Element | null {
  const {
    rowId,
    rowIndex,
    integrationIds,
    integrationLabels,
    currentTitle,
    currentDescription,
    disabled,
    resolveCurrentRowIndex,
  } = props;
  const { product, draft, getValues, setValue } = useProductFormCore();
  const { fireAiPathTriggerEvent } = useAiPathTriggerEvent();
  const [pendingRunId, setPendingRunId] = useState<string | null>(null);
  const [isTriggerPending, setIsTriggerPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const persistedProductId = product?.id ?? null;

  const getEntityJson = useCallback((): Record<string, unknown> => {
    const values = getValues();
    const entityJson = buildTriggeredProductEntityJson({
      product,
      draft,
      values,
    });

    entityJson['marketplaceCopyDebrandInput'] = buildMarketplaceCopyDebrandTriggerInput({
      values,
      row: {
        id: rowId,
        index: rowIndex,
        integrationIds,
        integrationNames: integrationLabels,
        currentAlternateTitle: currentTitle,
        currentAlternateDescription: currentDescription,
      },
    });

    return entityJson;
  }, [
    currentDescription,
    currentTitle,
    draft,
    getValues,
    integrationIds,
    integrationLabels,
    product,
    rowId,
    rowIndex,
  ]);

  const getTriggerExtras = useCallback((): Record<string, unknown> => {
    const values = getValues();
    return {
      marketplaceCopyDebrandInput: buildMarketplaceCopyDebrandTriggerInput({
        values,
        row: {
          id: rowId,
          index: rowIndex,
          integrationIds,
          integrationNames: integrationLabels,
          currentAlternateTitle: currentTitle,
          currentAlternateDescription: currentDescription,
        },
      }),
    };
  }, [
    currentDescription,
    currentTitle,
    getValues,
    integrationIds,
    integrationLabels,
    rowId,
    rowIndex,
  ]);

  const handleRunQueued = useCallback(
    (args: {
      button: AiTriggerButtonRecord;
      runId: string;
      entityId?: string | null | undefined;
      entityType: 'product' | 'note' | 'custom';
    }): void => {
      if (args.entityType !== 'product') return;
      setError(null);
      setPendingRunId(args.runId);
    },
    []
  );

  const handleDebrandTrigger = useCallback(async (): Promise<void> => {
    setError(null);
    setIsTriggerPending(true);

    const customExtras = getTriggerExtras();

    try {
      await fireAiPathTriggerEvent({
        triggerEventId: MARKETPLACE_COPY_DEBRAND_TRIGGER_BUTTON_ID,
        triggerLabel: FALLBACK_MARKETPLACE_COPY_DEBRAND_BUTTON.name,
        preferredPathId: MARKETPLACE_COPY_DEBRAND_PATH_ID,
        entityType: 'product',
        entityId: product?.id ?? null,
        getEntityJson,
        source: {
          tab: 'product',
          location: MARKETPLACE_COPY_DEBRAND_TRIGGER_LOCATION,
        },
        extras: {
          ...(customExtras ?? {}),
          mode: 'click',
        },
        onError: (launchError): void => {
          setError(
            resolveDebrandLaunchErrorMessage({
              message: launchError,
            })
          );
        },
        onSuccess: (runId: string): void => {
          handleRunQueued({
            button: FALLBACK_MARKETPLACE_COPY_DEBRAND_BUTTON,
            runId,
            entityId: product?.id ?? null,
            entityType: 'product',
          });
        },
      });
    } finally {
      setIsTriggerPending(false);
    }
  }, [fireAiPathTriggerEvent, getEntityJson, getTriggerExtras, handleRunQueued, product?.id]);

  useEffect(() => {
    if (!pendingRunId) return;

    let active = true;
    let terminalHandled = false;
    const trackedRunId = pendingRunId;

    const unsubscribe = subscribeToTrackedAiPathRun(trackedRunId, (snapshot) => {
      if (!active || terminalHandled || snapshot.trackingState !== 'stopped') return;
      terminalHandled = true;

      void (async (): Promise<void> => {
        if (snapshot.status !== 'completed') {
          if (persistedProductId) {
            if (!active) return;
            setError(
              snapshot.errorMessage ??
                `Debrand failed: the AI Path run ${snapshot.status.replace(/_/g, ' ')}.`
            );
            setPendingRunId((current) => (current === trackedRunId ? null : current));
            return;
          }
        }

        let response: Awaited<ReturnType<typeof getAiPathRun>>;
        try {
          response = await getAiPathRun(trackedRunId, { timeoutMs: 60_000 });
        } catch {
          if (!active) return;
          setError('Debrand failed: unable to load the completed AI Path run details.');
          setPendingRunId((current) => (current === trackedRunId ? null : current));
          return;
        }
        if (!active) return;
        if (!response.ok) {
          setError(
            response.error ||
              'Debrand failed: unable to load the completed AI Path run details.'
          );
          setPendingRunId((current) => (current === trackedRunId ? null : current));
          return;
        }

        const result = extractDebrandedMarketplaceCopyResultFromAiPathRunDetail(response.data);
        if (!result || (!result.title && !result.description)) {
          setError(
            snapshot.status !== 'completed'
              ? snapshot.errorMessage ??
                  `Debrand failed: the AI Path run ${snapshot.status.replace(/_/g, ' ')}.`
              : 'Debrand failed: the AI Path did not return an alternate title or description.'
          );
          setPendingRunId((current) => (current === trackedRunId ? null : current));
          return;
        }

        const currentRowIndex = resolveCurrentRowIndex(rowId);
        if (currentRowIndex === null) {
          setPendingRunId((current) => (current === trackedRunId ? null : current));
          return;
        }

        if (result.title !== null) {
          const titleFieldName = `marketplaceContentOverrides.${currentRowIndex}.title` as const;
          setValue(titleFieldName, result.title, {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
          });
        }
        if (result.description !== null) {
          const descriptionFieldName =
            `marketplaceContentOverrides.${currentRowIndex}.description` as const;
          setValue(descriptionFieldName, result.description, {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
          });
        }
        setError(null);
        setPendingRunId((current) => (current === trackedRunId ? null : current));
      })();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [pendingRunId, persistedProductId, resolveCurrentRowIndex, rowId, setValue]);

  return (
    <div className='flex min-w-0 flex-col items-end gap-2'>
      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={(): void => {
          void handleDebrandTrigger();
        }}
        disabled={disabled || isTriggerPending || pendingRunId !== null}
        className='gap-2'
      >
        {FALLBACK_MARKETPLACE_COPY_DEBRAND_BUTTON.display.label}
      </Button>
      {error ? <p className='text-right text-xs text-destructive'>{error}</p> : null}
    </div>
  );
}

export default function ProductFormMarketplaceCopy(): React.JSX.Element {
  const { control, register, formState } = useFormContext<ProductFormData>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'marketplaceContentOverrides',
  });
  const overrideValues =
    useWatch<ProductFormData, 'marketplaceContentOverrides'>({
      control,
      name: 'marketplaceContentOverrides',
    }) ?? [];
  const { data: integrations = [], isLoading } = useIntegrations();

  const selectedIntegrationIds = useMemo(
    () =>
      overrideValues.flatMap((entry) =>
        Array.isArray(entry?.integrationIds) ? entry.integrationIds : []
      ),
    [overrideValues]
  );

  const integrationOptions = useMemo(
    () =>
      resolveMarketplaceIntegrationOptions({
        integrations,
        selectedIntegrationIds,
      }),
    [integrations, selectedIntegrationIds]
  );
  const integrationLabelById = useMemo(
    () => new Map(integrationOptions.map((option) => [option.value, option.label] as const)),
    [integrationOptions]
  );
  const marketplaceCopyRowIndexByIdRef = useRef<Map<string, number>>(new Map());
  marketplaceCopyRowIndexByIdRef.current = new Map(
    fields.map((field, index) => [field.id, index] as const)
  );
  const resolveCurrentMarketplaceCopyRowIndex = useCallback(
    (rowId: string): number | null => marketplaceCopyRowIndexByIdRef.current.get(rowId) ?? null,
    []
  );
  const overrideErrors = formState.errors.marketplaceContentOverrides;
  const overrideErrorEntries: MarketplaceCopyErrorEntry[] = Array.isArray(overrideErrors)
    ? (overrideErrors as MarketplaceCopyErrorEntry[])
    : [];
  const rootOverrideError = toErrorMessage(overrideErrors);
  return (
    <FormSection
      title='Marketplace Copy'
      titleIcon={<Languages className='h-4 w-4' />}
      description='Create alternate titles and descriptions for selected marketplace integrations. These values override the standard product copy only when a listing runs for the assigned integration.'
      actions={
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={(): void => append(createEmptyMarketplaceCopyOverride())}
          className='gap-2'
        >
          <Plus className='h-4 w-4' />
          Add Override
        </Button>
      }
    >
      {rootOverrideError ? <Alert variant='error'>{rootOverrideError}</Alert> : null}

      {fields.length === 0 ? (
        <div className='rounded-lg border border-dashed border-border/60 bg-background/40 px-4 py-8 text-sm text-muted-foreground'>
          No alternate marketplace copy configured. Add an override to use a different title or
          description on selected marketplaces.
        </div>
      ) : null}

      {fields.map((field, index) => {
        const currentEntry: MarketplaceCopyFormEntry =
          overrideValues[index] ?? createEmptyMarketplaceCopyOverride();
        const selectedIds = Array.isArray(currentEntry?.integrationIds)
          ? currentEntry.integrationIds
          : [];
        const assignedElsewhere = new Set(
          overrideValues.flatMap((entry, entryIndex) => {
            if (entryIndex === index || !Array.isArray(entry?.integrationIds)) return [];
            return entry.integrationIds;
          })
        );
        const rowOptions = integrationOptions.map((option) => ({
          ...option,
          disabled: assignedElsewhere.has(option.value),
        }));
        const selectedLabels = selectedIds.map(
          (integrationId) => integrationLabelById.get(integrationId) ?? integrationId
        );
        const summary =
          selectedLabels.length > 0
            ? `Effective on: ${selectedLabels.join(', ')}`
            : 'Select one or more marketplace integrations.';
        const entryErrors = overrideErrorEntries[index];

        return (
          <div
            key={field.id}
            className='space-y-4 rounded-xl border border-border/60 bg-background/60 p-4'
          >
            <div className='flex items-start justify-between gap-4'>
              <div className='space-y-1'>
                <div className='text-sm font-semibold text-foreground'>Alternate Copy {index + 1}</div>
                <p className='text-xs text-muted-foreground'>{summary}</p>
              </div>
              <div className='flex flex-wrap items-start justify-end gap-2'>
                <MarketplaceCopyDebrandTrigger
                  rowId={field.id}
                  rowIndex={index}
                  integrationIds={selectedIds}
                  integrationLabels={selectedLabels}
                  currentTitle={currentEntry?.title ?? ''}
                  currentDescription={currentEntry?.description ?? ''}
                  disabled={formState.isSubmitting}
                  resolveCurrentRowIndex={resolveCurrentMarketplaceCopyRowIndex}
                />
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  onClick={(): void => remove(index)}
                  className='gap-2 text-muted-foreground hover:text-foreground'
                  aria-label={`Remove alternate copy ${index + 1}`}
                  title='Remove alternate copy'
                >
                  <Trash2 className='h-4 w-4' />
                  Remove
                </Button>
              </div>
            </div>

            <div className='grid gap-4 md:grid-cols-2'>
              <FormField
                label='Target Integrations'
                description='Each marketplace integration can only be assigned once.'
                error={toErrorMessage(entryErrors?.integrationIds)}
                className='md:col-span-2'
              >
                <Controller
                  control={control}
                  name={`marketplaceContentOverrides.${index}.integrationIds`}
                  render={({ field: controllerField }) => (
                    <MultiSelect
                      options={rowOptions}
                      selected={Array.isArray(controllerField.value) ? controllerField.value : []}
                      onChange={(values: string[]): void => {
                        controllerField.onChange(values);
                      }}
                      placeholder={isLoading ? 'Loading integrations...' : 'Choose marketplaces'}
                      searchPlaceholder='Search integrations...'
                      emptyMessage='No integrations available.'
                      loading={isLoading}
                      ariaLabel={`Target integrations for alternate copy ${index + 1}`}
                    />
                  )}
                />
              </FormField>

              <FormField
                label='Alternate Title'
                description='Leave blank to use the standard product title.'
                error={toErrorMessage(entryErrors?.title)}
              >
                <Input
                  {...register(`marketplaceContentOverrides.${index}.title`)}
                  placeholder='Marketplace-specific title'
                  aria-label={`Alternate title ${index + 1}`}
                />
              </FormField>

              <FormField
                label='Alternate Description'
                description='Leave blank to use the standard product description.'
                error={toErrorMessage(entryErrors?.description)}
              >
                <Textarea
                  {...register(`marketplaceContentOverrides.${index}.description`)}
                  rows={5}
                  placeholder='Marketplace-specific description'
                  aria-label={`Alternate description ${index + 1}`}
                />
              </FormField>
            </div>
          </div>
        );
      })}
    </FormSection>
  );
}
