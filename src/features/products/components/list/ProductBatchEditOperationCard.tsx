'use client';

import { Trash2 } from 'lucide-react';

import type { ProductBatchEditField, ProductBatchEditMode } from '@/shared/contracts/products';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { SelectSimple } from '@/shared/ui/select-simple';
import { Textarea } from '@/shared/ui/textarea';

import {
  BOOLEAN_OPTIONS,
  buildModeOptions,
  FIELD_OPTIONS,
  getDefinition,
  getValuePlaceholder,
  isJsonField,
  LANGUAGE_OPTIONS,
  type ProductBatchEditDraftOperation,
} from './ProductBatchEditModal.helpers';

type ProductBatchEditOperationCardProps = {
  draft: ProductBatchEditDraftOperation;
  index: number;
  canRemove: boolean;
  onChange: (id: string, update: Partial<ProductBatchEditDraftOperation>) => void;
  onRemove: (id: string) => void;
};

type ValueEditorProps = {
  draft: ProductBatchEditDraftOperation;
  index: number;
  onChange: (id: string, update: Partial<ProductBatchEditDraftOperation>) => void;
};

const ProductBatchEditReplaceEditor = ({
  draft,
  index,
  onChange,
}: ValueEditorProps): React.JSX.Element => (
  <div className='grid gap-3 md:grid-cols-2'>
    <Input
      value={draft.find}
      onChange={(event) => onChange(draft.id, { find: event.target.value })}
      placeholder='Find value'
      aria-label={`Operation ${index + 1} find value`}
    />
    <Input
      value={draft.replaceWith}
      onChange={(event) => onChange(draft.id, { replaceWith: event.target.value })}
      placeholder='Replace with'
      aria-label={`Operation ${index + 1} replacement value`}
    />
  </div>
);

const ProductBatchEditValueEditor = ({
  draft,
  index,
  onChange,
}: ValueEditorProps): React.JSX.Element => {
  const definition = getDefinition(draft.field);
  if (draft.mode === 'replace') {
    return <ProductBatchEditReplaceEditor draft={draft} index={index} onChange={onChange} />;
  }
  if (definition.kind === 'boolean') {
    return (
      <SelectSimple
        value={draft.value.length > 0 ? draft.value : 'true'}
        onValueChange={(value) => onChange(draft.id, { value })}
        options={BOOLEAN_OPTIONS}
        ariaLabel={`Operation ${index + 1} value`}
        placeholder='Boolean value'
        disabled={draft.mode === 'remove'}
      />
    );
  }
  if (isJsonField(definition) || definition.kind === 'string-array') {
    return (
      <Textarea
        value={draft.value}
        onChange={(event) => onChange(draft.id, { value: event.target.value })}
        placeholder={getValuePlaceholder(definition, draft.mode)}
        aria-label={`Operation ${index + 1} value`}
        rows={4}
      />
    );
  }
  return (
    <Input
      value={draft.value}
      onChange={(event) => onChange(draft.id, { value: event.target.value })}
      placeholder={getValuePlaceholder(definition, draft.mode)}
      aria-label={`Operation ${index + 1} value`}
      type={definition.kind === 'number' ? 'number' : 'text'}
      disabled={draft.mode === 'remove'}
    />
  );
};

const ProductBatchEditSelectors = ({
  draft,
  index,
  onChange,
}: ValueEditorProps): React.JSX.Element => {
  const definition = getDefinition(draft.field);
  return (
    <div className='grid gap-3 md:grid-cols-3'>
      <SelectSimple
        value={draft.field}
        onValueChange={(field) => onChange(draft.id, { field: field as ProductBatchEditField })}
        options={FIELD_OPTIONS}
        ariaLabel={`Operation ${index + 1} field`}
        placeholder='Field'
      />
      {definition.kind === 'localized-text' ? (
        <SelectSimple
          value={draft.language}
          onValueChange={(language) =>
            onChange(draft.id, {
              language: language as ProductBatchEditDraftOperation['language'],
            })
          }
          options={LANGUAGE_OPTIONS}
          ariaLabel={`Operation ${index + 1} language`}
          placeholder='Language'
        />
      ) : null}
      <SelectSimple
        value={draft.mode}
        onValueChange={(mode) => onChange(draft.id, { mode: mode as ProductBatchEditMode })}
        options={buildModeOptions(definition)}
        ariaLabel={`Operation ${index + 1} mode`}
        placeholder='Operation'
      />
    </div>
  );
};

export function ProductBatchEditOperationCard({
  draft,
  index,
  canRemove,
  onChange,
  onRemove,
}: ProductBatchEditOperationCardProps): React.JSX.Element {
  return (
    <div className='space-y-3 rounded-lg border border-border/60 bg-background/40 p-3'>
      <div className='flex items-center justify-between gap-3'>
        <div className='text-sm font-medium'>Operation {index + 1}</div>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          onClick={() => onRemove(draft.id)}
          disabled={!canRemove}
          aria-label={`Remove operation ${index + 1}`}
        >
          <Trash2 className='h-4 w-4' />
        </Button>
      </div>
      <ProductBatchEditSelectors draft={draft} index={index} onChange={onChange} />
      <ProductBatchEditValueEditor draft={draft} index={index} onChange={onChange} />
    </div>
  );
}
