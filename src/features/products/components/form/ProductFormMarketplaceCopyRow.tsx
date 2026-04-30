'use client';
'use no memo';

import { Trash2 } from 'lucide-react';
import { Controller, type Control, type UseFieldArrayRemove, type UseFormRegister } from 'react-hook-form';

import type { ProductFormData } from '@/shared/contracts/products/drafts';
import type { MultiSelectOption } from '@/shared/contracts/ui/controls';
import { Button } from '@/shared/ui/button';
import { FormField } from '@/shared/ui/form-section';
import { Input } from '@/shared/ui/input';
import { MultiSelect } from '@/shared/ui/multi-select';
import { Textarea } from '@/shared/ui/textarea';

import {
  createEmptyMarketplaceCopyOverride,
  type MarketplaceCopyErrorEntry,
  type MarketplaceCopyFormEntry,
  toErrorMessage,
} from './ProductFormMarketplaceCopy.helpers';
import { MarketplaceCopyDebrandTrigger } from './ProductFormMarketplaceCopyDebrandTrigger';

type ProductFormMarketplaceCopyRowProps = {
  fieldId: string;
  index: number;
  currentEntry: MarketplaceCopyFormEntry | undefined;
  entryErrors: MarketplaceCopyErrorEntry | undefined;
  overrideValues: NonNullable<ProductFormData['marketplaceContentOverrides']>;
  integrationOptions: MultiSelectOption[];
  integrationLabelById: Map<string, string>;
  isLoading: boolean;
  isSubmitting: boolean;
  control: Control<ProductFormData>;
  register: UseFormRegister<ProductFormData>;
  remove: UseFieldArrayRemove;
  resolveCurrentRowIndex: (rowId: string) => number | null;
};

type ResolvedMarketplaceCopyRow = {
  currentEntry: MarketplaceCopyFormEntry;
  selectedIds: string[];
  selectedLabels: string[];
  rowOptions: MultiSelectOption[];
};

const resolveSelectedIds = (entry: MarketplaceCopyFormEntry): string[] =>
  Array.isArray(entry.integrationIds) ? entry.integrationIds : [];

const resolveAssignedElsewhere = (
  overrideValues: NonNullable<ProductFormData['marketplaceContentOverrides']>,
  index: number
): Set<string> =>
  new Set(
    overrideValues.flatMap((entry, entryIndex) => {
      if (entryIndex === index || !Array.isArray(entry.integrationIds)) return [];
      return entry.integrationIds;
    })
  );

const resolveRowOptions = (input: {
  integrationOptions: MultiSelectOption[];
  assignedElsewhere: Set<string>;
}): MultiSelectOption[] =>
  input.integrationOptions.map((option: MultiSelectOption) => ({
    ...option,
    disabled: input.assignedElsewhere.has(option.value),
  }));

const resolveSelectedLabels = (input: {
  selectedIds: string[];
  integrationLabelById: Map<string, string>;
}): string[] =>
  input.selectedIds.map(
    (integrationId: string): string => input.integrationLabelById.get(integrationId) ?? integrationId
  );

const resolveSummary = (selectedLabels: string[]): string =>
  selectedLabels.length > 0
    ? `Effective on: ${selectedLabels.join(', ')}`
    : 'Select one or more marketplace integrations.';

const resolveMarketplaceCopyRow = (
  props: ProductFormMarketplaceCopyRowProps
): ResolvedMarketplaceCopyRow => {
  const currentEntry = props.currentEntry ?? createEmptyMarketplaceCopyOverride();
  const selectedIds = resolveSelectedIds(currentEntry);
  const assignedElsewhere = resolveAssignedElsewhere(props.overrideValues, props.index);
  const rowOptions = resolveRowOptions({
    integrationOptions: props.integrationOptions,
    assignedElsewhere,
  });
  const selectedLabels = resolveSelectedLabels({
    selectedIds,
    integrationLabelById: props.integrationLabelById,
  });
  return { currentEntry, selectedIds, selectedLabels, rowOptions };
};

function ProductFormMarketplaceCopyRowHeader(props: {
  row: ResolvedMarketplaceCopyRow;
  rowProps: ProductFormMarketplaceCopyRowProps;
}): React.JSX.Element {
  return (
    <div className='flex items-start justify-between gap-4'>
      <div className='space-y-1'>
        <div className='text-sm font-semibold text-foreground'>
          Alternate Copy {props.rowProps.index + 1}
        </div>
        <p className='text-xs text-muted-foreground'>{resolveSummary(props.row.selectedLabels)}</p>
      </div>
      <div className='flex flex-wrap items-start justify-end gap-2'>
        <MarketplaceCopyDebrandTrigger
          rowId={props.rowProps.fieldId}
          rowIndex={props.rowProps.index}
          integrationIds={props.row.selectedIds}
          integrationLabels={props.row.selectedLabels}
          currentTitle={props.row.currentEntry.title ?? ''}
          currentDescription={props.row.currentEntry.description ?? ''}
          disabled={props.rowProps.isSubmitting}
          resolveCurrentRowIndex={props.rowProps.resolveCurrentRowIndex}
        />
        <Button
          type='button'
          variant='ghost'
          size='sm'
          onClick={(): void => props.rowProps.remove(props.rowProps.index)}
          className='gap-2 text-muted-foreground hover:text-foreground'
          aria-label={`Remove alternate copy ${props.rowProps.index + 1}`}
          title='Remove alternate copy'
        >
          <Trash2 className='h-4 w-4' />
          Remove
        </Button>
      </div>
    </div>
  );
}

function ProductFormMarketplaceCopyRowFields(props: {
  row: ResolvedMarketplaceCopyRow;
  rowProps: ProductFormMarketplaceCopyRowProps;
}): React.JSX.Element {
  return (
    <div className='grid gap-4 md:grid-cols-2'>
      <FormField
        label='Target Integrations'
        description='Each marketplace integration can only be assigned once.'
        error={toErrorMessage(props.rowProps.entryErrors?.integrationIds)}
        className='md:col-span-2'
      >
        <Controller
          control={props.rowProps.control}
          name={`marketplaceContentOverrides.${props.rowProps.index}.integrationIds`}
          render={({ field: controllerField }) => (
            <MultiSelect
              options={props.row.rowOptions}
              selected={Array.isArray(controllerField.value) ? controllerField.value : []}
              onChange={(values: string[]): void => {
                controllerField.onChange(values);
              }}
              placeholder={props.rowProps.isLoading ? 'Loading integrations...' : 'Choose marketplaces'}
              searchPlaceholder='Search integrations...'
              emptyMessage='No integrations available.'
              loading={props.rowProps.isLoading}
              ariaLabel={`Target integrations for alternate copy ${props.rowProps.index + 1}`}
            />
          )}
        />
      </FormField>

      <FormField
        label='Alternate Title'
        description='Leave blank to use the standard product title.'
        error={toErrorMessage(props.rowProps.entryErrors?.title)}
      >
        <Input
          {...props.rowProps.register(`marketplaceContentOverrides.${props.rowProps.index}.title`)}
          placeholder='Marketplace-specific title'
          aria-label={`Alternate title ${props.rowProps.index + 1}`}
        />
      </FormField>

      <FormField
        label='Alternate Description'
        description='Leave blank to use the standard product description.'
        error={toErrorMessage(props.rowProps.entryErrors?.description)}
      >
        <Textarea
          {...props.rowProps.register(
            `marketplaceContentOverrides.${props.rowProps.index}.description`
          )}
          rows={5}
          placeholder='Marketplace-specific description'
          aria-label={`Alternate description ${props.rowProps.index + 1}`}
        />
      </FormField>
    </div>
  );
}

export function ProductFormMarketplaceCopyRow(
  props: ProductFormMarketplaceCopyRowProps
): React.JSX.Element {
  const row = resolveMarketplaceCopyRow(props);
  return (
    <div className='space-y-4 rounded-xl border border-border/60 bg-background/60 p-4'>
      <ProductFormMarketplaceCopyRowHeader row={row} rowProps={props} />
      <ProductFormMarketplaceCopyRowFields row={row} rowProps={props} />
    </div>
  );
}
