'use client';

import { Plus } from 'lucide-react';

import { AppModal } from '@/shared/ui/app-modal';
import { Button } from '@/shared/ui/button';

import {
  summarizePreview,
  type ProductBatchEditModalProps,
} from './ProductBatchEditModal.helpers';
import { ProductBatchEditOperationCard } from './ProductBatchEditOperationCard';
import { ProductBatchEditPreview } from './ProductBatchEditPreview';
import {
  type ProductBatchEditModalState,
  useProductBatchEditModalState,
} from './useProductBatchEditModalState';

type ProductBatchEditModalFooterProps = {
  isSubmitting: boolean;
  selectedCount: number;
  onClose: () => void;
  submit: (dryRun: boolean) => Promise<void>;
};

const ProductBatchEditModalFooter = ({
  isSubmitting,
  selectedCount,
  onClose,
  submit,
}: ProductBatchEditModalFooterProps): React.JSX.Element => (
  <>
    <Button type='button' variant='outline' onClick={onClose} disabled={isSubmitting}>
      Cancel
    </Button>
    <Button
      type='button'
      variant='outline'
      onClick={() => {
        void submit(true);
      }}
      disabled={isSubmitting || selectedCount === 0}
    >
      Preview
    </Button>
    <Button
      type='button'
      onClick={() => {
        void submit(false);
      }}
      disabled={isSubmitting || selectedCount === 0}
    >
      {isSubmitting ? 'Applying...' : 'Apply Changes'}
    </Button>
  </>
);

const ProductBatchEditModalBody = ({
  drafts,
  lastResponse,
  addDraft,
  removeDraft,
  updateDraft,
}: ProductBatchEditModalState): React.JSX.Element => (
  <div className='space-y-5'>
    <div className='rounded-lg border border-border/60 bg-card/40 p-3 text-sm text-muted-foreground'>
      Select a product field, choose the operation, then preview the diff before applying. Text
      and array fields support prepend, append, remove, and replace. Numeric, boolean, enum, and
      object fields support set, clear, and exact replace.
    </div>
    <div className='space-y-3'>
      {drafts.map((draft, index) => (
        <ProductBatchEditOperationCard
          key={draft.id}
          draft={draft}
          index={index}
          canRemove={drafts.length > 1}
          onChange={updateDraft}
          onRemove={removeDraft}
        />
      ))}
    </div>
    <Button type='button' variant='outline' size='sm' onClick={addDraft} className='gap-2'>
      <Plus className='h-4 w-4' />
      Add Operation
    </Button>
    <ProductBatchEditPreview response={lastResponse} summary={summarizePreview(lastResponse)} />
  </div>
);

export function ProductBatchEditModal(props: ProductBatchEditModalProps): React.JSX.Element {
  const state = useProductBatchEditModalState({
    productIds: props.productIds,
    onSubmit: props.onSubmit,
    onApplied: props.onApplied,
  });

  return (
    <AppModal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title='Batch Edit Product Fields'
      subtitle={`Apply field changes to ${state.selectedCount} selected product${state.selectedCount === 1 ? '' : 's'}.`}
      size='xl'
      footer={
        <ProductBatchEditModalFooter
          isSubmitting={props.isSubmitting}
          selectedCount={state.selectedCount}
          onClose={props.onClose}
          submit={state.submit}
        />
      }
    >
      <ProductBatchEditModalBody {...state} />
    </AppModal>
  );
}
