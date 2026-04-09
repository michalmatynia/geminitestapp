'use client';
'use no memo';

import { Languages, Plus, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form';

import { resolveIntegrationDisplayName } from '@/features/integrations/components/listings/product-listings-labels';
import {
  isBaseIntegrationSlug,
  isLinkedInIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import { useIntegrations } from '@/features/integrations/hooks/useIntegrationQueries';
import type { Integration } from '@/shared/contracts/integrations/base';
import type { ProductFormData } from '@/shared/contracts/products/drafts';
import type { MultiSelectOption } from '@/shared/contracts/ui/controls';
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
