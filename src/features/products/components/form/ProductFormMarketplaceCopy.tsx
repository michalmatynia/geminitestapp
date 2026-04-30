'use client';
'use no memo';

import { Languages, Plus } from 'lucide-react';
import { useCallback, useMemo, useRef } from 'react';
import {
  type Control,
  type FieldArrayWithId,
  useFieldArray,
  useFormContext,
  type UseFieldArrayRemove,
  type UseFormRegister,
  useWatch,
} from 'react-hook-form';

import { useIntegrations } from '@/features/integrations/hooks/useIntegrationQueries';
import type { ProductFormData } from '@/shared/contracts/products/drafts';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { FormSection } from '@/shared/ui/form-section';

import {
  createEmptyMarketplaceCopyOverride,
  type MarketplaceCopyErrorEntry,
  toErrorMessage,
  resolveMarketplaceIntegrationOptions,
} from './ProductFormMarketplaceCopy.helpers';
import { ProductFormMarketplaceCopyRow } from './ProductFormMarketplaceCopyRow';

type MarketplaceCopyIntegrationState = {
  integrationOptions: ReturnType<typeof resolveMarketplaceIntegrationOptions>;
  integrationLabelById: Map<string, string>;
  isLoading: boolean;
};

type MarketplaceCopyRowsProps = {
  fields: FieldArrayWithId<ProductFormData, 'marketplaceContentOverrides', 'id'>[];
  overrideValues: NonNullable<ProductFormData['marketplaceContentOverrides']>;
  overrideErrorEntries: MarketplaceCopyErrorEntry[];
  integrationState: MarketplaceCopyIntegrationState;
  isSubmitting: boolean;
  control: Control<ProductFormData>;
  register: UseFormRegister<ProductFormData>;
  remove: UseFieldArrayRemove;
  resolveCurrentRowIndex: (rowId: string) => number | null;
};

const useMarketplaceCopyIntegrationState = (
  overrideValues: NonNullable<ProductFormData['marketplaceContentOverrides']>
): MarketplaceCopyIntegrationState => {
  const { data: integrations = [], isLoading } = useIntegrations();
  const selectedIntegrationIds = useMemo(
    () =>
      overrideValues.flatMap((entry) =>
        Array.isArray(entry.integrationIds) ? entry.integrationIds : []
      ),
    [overrideValues]
  );
  const integrationOptions = useMemo(
    () => resolveMarketplaceIntegrationOptions({ integrations, selectedIntegrationIds }),
    [integrations, selectedIntegrationIds]
  );
  const integrationLabelById = useMemo(
    () => new Map(integrationOptions.map((option) => [option.value, option.label] as const)),
    [integrationOptions]
  );
  return { integrationOptions, integrationLabelById, isLoading };
};

function MarketplaceCopyAddAction(props: { onAdd: () => void }): React.JSX.Element {
  return (
    <Button type='button' variant='outline' size='sm' onClick={props.onAdd} className='gap-2'>
      <Plus className='h-4 w-4' />
      Add Override
    </Button>
  );
}

function MarketplaceCopyEmptyState(): React.JSX.Element {
  return (
    <div className='rounded-lg border border-dashed border-border/60 bg-background/40 px-4 py-8 text-sm text-muted-foreground'>
      No alternate marketplace copy configured. Add an override to use a different title or
      description on selected marketplaces.
    </div>
  );
}

function ProductFormMarketplaceCopyRows(props: MarketplaceCopyRowsProps): React.JSX.Element {
  return (
    <>
      {props.fields.map((field, index) => (
        <ProductFormMarketplaceCopyRow
          key={field.id}
          fieldId={field.id}
          index={index}
          currentEntry={props.overrideValues[index]}
          entryErrors={props.overrideErrorEntries[index]}
          overrideValues={props.overrideValues}
          integrationOptions={props.integrationState.integrationOptions}
          integrationLabelById={props.integrationState.integrationLabelById}
          isLoading={props.integrationState.isLoading}
          isSubmitting={props.isSubmitting}
          control={props.control}
          register={props.register}
          remove={props.remove}
          resolveCurrentRowIndex={props.resolveCurrentRowIndex}
        />
      ))}
    </>
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
  const integrationState = useMarketplaceCopyIntegrationState(overrideValues);
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
      actions={<MarketplaceCopyAddAction onAdd={() => append(createEmptyMarketplaceCopyOverride())} />}
    >
      {rootOverrideError !== undefined ? (
        <Alert variant='error'>{rootOverrideError}</Alert>
      ) : null}

      {fields.length === 0 ? (
        <MarketplaceCopyEmptyState />
      ) : null}

      <ProductFormMarketplaceCopyRows
        fields={fields}
        overrideValues={overrideValues}
        overrideErrorEntries={overrideErrorEntries}
        integrationState={integrationState}
        isSubmitting={formState.isSubmitting}
        control={control}
        register={register}
        remove={remove}
        resolveCurrentRowIndex={resolveCurrentMarketplaceCopyRowIndex}
      />
    </FormSection>
  );
}
