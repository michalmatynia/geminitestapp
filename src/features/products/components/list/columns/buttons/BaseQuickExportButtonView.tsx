'use client';

import React from 'react';

import { AppModal } from '@/shared/ui/app-modal';
import { Button } from '@/shared/ui/button';
import { InsetPanel } from '@/shared/ui/InsetPanel';
import { cn } from '@/shared/utils/ui-utils';

import { getMarketplaceButtonClass } from '../product-column-utils';
import type { BaseQuickExportButtonModel } from './useBaseQuickExportButtonModel';

type BaseQuickExportActionButtonProps = {
  model: BaseQuickExportButtonModel;
};

type ExistingSkuDecisionModalProps = {
  model: BaseQuickExportButtonModel;
};

const hasExistingProductId = (existingProductId: string | null | undefined): boolean =>
  typeof existingProductId === 'string' && existingProductId.trim() !== '';

const BaseQuickExportActionButton = ({
  model,
}: BaseQuickExportActionButtonProps): React.JSX.Element => (
  <Button
    type='button'
    disabled={model.quickExportPending}
    onClick={model.handleButtonClick}
    onMouseEnter={model.prefetchListings}
    onFocus={model.prefetchListings}
    variant='ghost'
    size='icon'
    aria-label={model.resolvedLabel}
    title={model.resolvedLabel}
    className={cn(
      'size-8 rounded-full border border-transparent bg-transparent p-0 hover:bg-transparent',
      model.showMarketplaceBadge === false && model.quickExportPending && 'cursor-not-allowed opacity-60',
      getMarketplaceButtonClass(
        model.resolvedButtonStatus,
        model.shouldUseFilledMarketplaceTone,
        'base'
      )
    )}
  >
    <span
      aria-hidden='true'
      className='text-[9px] font-black uppercase leading-none tracking-tight'
    >
      {model.quickExportPending ? '...' : 'BL'}
    </span>
  </Button>
);

const ExistingSkuSummary = ({ model }: ExistingSkuDecisionModalProps): React.JSX.Element => (
  <>
    <p className='text-sm text-gray-300'>
      SKU <span className='font-mono text-white'>{model.existingSkuDecision?.sku ?? '-'}</span>{' '}
      already exists in the selected Base.com inventory.
    </p>

    <InsetPanel radius='compact' padding='sm' className='text-xs text-gray-300'>
      Existing Base product ID:{' '}
      <span className='font-mono text-white'>
        {model.existingSkuDecision?.existingProductId ?? 'Unavailable'}
      </span>
    </InsetPanel>
  </>
);

const ExistingSkuMissingIdMessage = ({
  model,
}: ExistingSkuDecisionModalProps): React.JSX.Element | null => {
  if (hasExistingProductId(model.existingSkuDecision?.existingProductId)) return null;
  return (
    <p className='text-xs text-amber-300'>
      Could not resolve existing Base.com product ID. Linking is disabled. Use "Set up new
      connection".
    </p>
  );
};

const ExistingSkuDecisionActions = ({
  model,
}: ExistingSkuDecisionModalProps): React.JSX.Element => (
  <div className='flex items-center justify-end gap-2 border-t border-border/60 pt-2'>
    <Button
      type='button'
      variant='outline'
      onClick={model.handleCloseDecisionModal}
      disabled={model.linkExistingPending}
    >
      Cancel
    </Button>
    <Button
      type='button'
      variant='outline'
      onClick={model.handleSetupNewConnection}
      disabled={model.linkExistingPending}
    >
      Set up new connection
    </Button>
    <Button
      type='button'
      onClick={model.handleLinkExistingProduct}
      disabled={
        model.linkExistingPending || hasExistingProductId(model.existingSkuDecision?.existingProductId) === false
      }
    >
      {model.linkExistingPending ? 'Linking...' : 'Link existing product'}
    </Button>
  </div>
);

const ExistingSkuDecisionModal = ({
  model,
}: ExistingSkuDecisionModalProps): React.JSX.Element => (
  <AppModal
    open={model.existingSkuDecision !== null}
    onOpenChange={(open) => {
      if (open === false) model.handleCloseDecisionModal();
    }}
    onClose={model.handleCloseDecisionModal}
    title='SKU already exists in Base.com'
    subtitle='Choose whether to link this product or start a new connection flow.'
    size='sm'
  >
    <div className='space-y-4'>
      <ExistingSkuSummary model={model} />
      <ExistingSkuMissingIdMessage model={model} />
      <ExistingSkuDecisionActions model={model} />
    </div>
  </AppModal>
);

export function BaseQuickExportButtonView({
  model,
}: {
  model: BaseQuickExportButtonModel;
}): React.JSX.Element {
  return (
    <>
      <BaseQuickExportActionButton model={model} />
      <ExistingSkuDecisionModal model={model} />
    </>
  );
}
