import { Button } from '@/shared/ui/button';
import {
  ProductScanAmazonDetails,
  ProductScanAmazonProvenanceSummary,
  ProductScanAmazonQualitySummary,
} from './ProductScanAmazonDetails';
import { applyMatchedAttributeMappings } from './ProductScanAmazonExtractedFieldsPanel.actions';
import { resolveAmazonMappedFieldKey } from './ProductScanAmazonExtractedFieldsPanel.mappings';
import type {
  ProductScanAmazonAttributeMappingRow,
  ProductScanAmazonExtractedFieldsModel,
  ProductScanAmazonFormBindings,
  ProductScanAmazonTextAction,
} from './ProductScanAmazonExtractedFieldsPanel.types';

type ProductScanAmazonExtractedFieldsViewProps = {
  model: ProductScanAmazonExtractedFieldsModel;
};

export function ProductScanAmazonExtractedFieldsView(
  props: ProductScanAmazonExtractedFieldsViewProps
): React.JSX.Element {
  const { model } = props;
  return (
    <div className='space-y-3'>
      <ProductScanAmazonQualitySummary scan={model.scan} />
      <ProductScanAmazonProvenanceSummary scan={model.scan} />
      <ProductScanAmazonEditableSections model={model} />
      <ProductScanAmazonDetails scan={model.scan} />
    </div>
  );
}

function ProductScanAmazonEditableSections(
  props: ProductScanAmazonExtractedFieldsViewProps
): React.JSX.Element | null {
  const { model } = props;
  if (model.formBindings === null) return null;
  return (
    <>
      <ProductScanAmazonActionButtons model={model} />
      <ProductScanAmazonMatchedMappings model={model} formBindings={model.formBindings} />
      <ProductScanAmazonUnmappedFields model={model} />
    </>
  );
}

function ProductScanAmazonActionButtons(
  props: ProductScanAmazonExtractedFieldsViewProps
): React.JSX.Element {
  const { model } = props;
  return (
    <div className='flex flex-wrap gap-2'>
      {model.textActions.map((action) => (
        <ProductScanAmazonTextButton
          action={action}
          formBindings={model.formBindings}
          key={action.field}
        />
      ))}
      <ProductScanAmazonWeightButton model={model} />
      <ProductScanAmazonDimensionsButton model={model} />
      <ProductScanAmazonApplyMappingsButton model={model} />
    </div>
  );
}

function ProductScanAmazonTextButton(props: {
  action: ProductScanAmazonTextAction;
  formBindings: ProductScanAmazonFormBindings | null;
}): React.JSX.Element | null {
  const { action, formBindings } = props;
  if (formBindings === null) return null;
  return (
    <Button
      type='button'
      variant='outline'
      size='sm'
      disabled={action.currentValue === action.value}
      onClick={() => formBindings.applyTextField(action.field, action.value)}
      className='h-7 px-2 text-xs'
    >
      {action.label}
    </Button>
  );
}

function ProductScanAmazonWeightButton(
  props: ProductScanAmazonExtractedFieldsViewProps
): React.JSX.Element | null {
  const { formBindings, parsedWeight } = props.model;
  if (formBindings === null || parsedWeight === null) return null;
  return (
    <Button
      type='button'
      variant='outline'
      size='sm'
      disabled={props.model.canApplyWeight === false}
      onClick={() => formBindings.applyNumberField('weight', parsedWeight)}
      className='h-7 px-2 text-xs'
    >
      Use Weight
    </Button>
  );
}

function ProductScanAmazonDimensionsButton(
  props: ProductScanAmazonExtractedFieldsViewProps
): React.JSX.Element | null {
  const { formBindings, parsedDimensions } = props.model;
  if (formBindings === null || parsedDimensions === null) return null;
  return (
    <Button
      type='button'
      variant='outline'
      size='sm'
      disabled={props.model.canApplyDimensions === false}
      onClick={() => {
        formBindings.applyNumberField('sizeLength', parsedDimensions.sizeLength);
        formBindings.applyNumberField('sizeWidth', parsedDimensions.sizeWidth);
        formBindings.applyNumberField('length', parsedDimensions.length);
      }}
      className='h-7 px-2 text-xs'
    >
      Use Dimensions
    </Button>
  );
}

function ProductScanAmazonApplyMappingsButton(
  props: ProductScanAmazonExtractedFieldsViewProps
): React.JSX.Element | null {
  const { attributeMappingRows, formBindings, pendingAttributeMappings } = props.model;
  if (formBindings === null || attributeMappingRows.length === 0) return null;
  return (
    <Button
      type='button'
      variant='outline'
      size='sm'
      disabled={pendingAttributeMappings.length === 0}
      onClick={() => applyMatchedAttributeMappings(pendingAttributeMappings, formBindings)}
      className='h-7 px-2 text-xs'
    >
      Apply matched attributes
    </Button>
  );
}

function ProductScanAmazonMatchedMappings(props: {
  formBindings: ProductScanAmazonFormBindings;
  model: ProductScanAmazonExtractedFieldsModel;
}): React.JSX.Element | null {
  const { attributeMappingRows } = props.model;
  if (attributeMappingRows.length === 0) return null;

  return (
    <div className='space-y-1 rounded-md border border-border/50 bg-background/70 px-3 py-2'>
      <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
        Matched product metadata targets
      </p>
      <ul className='space-y-1 text-xs text-muted-foreground'>
        {attributeMappingRows.map((row) => (
          <ProductScanAmazonMatchedMappingRow
            formBindings={props.formBindings}
            key={`${row.mapping.targetType}-${row.mapping.targetId}`}
            row={row}
          />
        ))}
      </ul>
    </div>
  );
}

function ProductScanAmazonMatchedMappingRow(props: {
  formBindings: ProductScanAmazonFormBindings;
  row: ProductScanAmazonAttributeMappingRow;
}): React.JSX.Element {
  const { formBindings, row } = props;
  return (
    <li className='flex items-start justify-between gap-3'>
      <div className='min-w-0 space-y-1'>
        <p>{row.label}</p>
        <p className='text-[11px] text-muted-foreground'>
          Current: {row.currentValue ?? 'Not set'}
        </p>
        <p className='text-[11px] text-muted-foreground'>Amazon: {row.mapping.value}</p>
      </div>
      <Button
        type='button'
        variant='ghost'
        size='sm'
        disabled={row.isPending === false}
        onClick={() => applyMatchedAttributeMappings([row.mapping], formBindings)}
        aria-label={`Apply ${row.mapping.sourceLabel} mapping`}
        className='h-6 px-2 text-[11px]'
      >
        Apply
      </Button>
    </li>
  );
}

function ProductScanAmazonUnmappedFields(
  props: ProductScanAmazonExtractedFieldsViewProps
): React.JSX.Element | null {
  const { unmappedFields } = props.model;
  if (unmappedFields.length === 0) return null;

  return (
    <div className='space-y-1 rounded-md border border-amber-500/30 bg-background/70 px-3 py-2'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
          Unmapped extracted attributes
        </p>
        <span className='inline-flex items-center rounded-md border border-amber-500/40 px-2 py-0.5 text-[11px] font-medium text-amber-300'>
          {unmappedFields.length} unmapped
        </span>
      </div>
      <ul className='space-y-1 text-xs text-muted-foreground'>
        {unmappedFields.map((field, index) => (
          <li
            key={`${resolveAmazonMappedFieldKey(field)}-${index}`}
            className='space-y-1 rounded-md border border-border/40 bg-muted/20 px-2 py-2'
          >
            <p>{field.sourceLabel}</p>
            <p className='text-[11px] text-muted-foreground'>Amazon: {field.value}</p>
            <p className='text-[11px] text-amber-300'>No matching product target yet.</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
