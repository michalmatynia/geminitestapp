'use client';

import { ArrowLeft, ArrowRight, X } from 'lucide-react';

import {
  getProductSyncAppFieldLabel,
  type ProductSyncDirection,
  type ProductSyncFieldRule,
} from '@/shared/contracts/product-sync';
import { AppModal } from '@/shared/ui/app-modal';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { cn } from '@/shared/utils/ui-utils';

import {
  directionLabel,
  formatLastRunAt,
  resolveRuleTargetLabel,
} from './ProductBulkSyncSetupModal.helpers';
import type { ProductBulkSyncSetupController } from './ProductBulkSyncSetupModal.types';

type ProductBulkSyncSetupViewProps = {
  controller: ProductBulkSyncSetupController;
};

const directionIcon = (direction: ProductSyncDirection): React.JSX.Element => {
  if (direction === 'app_to_base') return <ArrowRight className='size-3 text-blue-400' />;
  if (direction === 'base_to_app') return <ArrowLeft className='size-3 text-purple-400' />;
  return <X className='size-3 text-gray-500' />;
};

export const ProductBulkSyncSetupModalView = ({
  controller,
}: ProductBulkSyncSetupViewProps): React.JSX.Element => (
  <AppModal
    isOpen={controller.isOpen}
    onClose={controller.onClose}
    title='Sync with Base.com'
    subtitle={`${controller.selectedCount} product${
      controller.selectedCount === 1 ? '' : 's'
    } selected.`}
    size='lg'
    footer={<ProductBulkSyncSetupFooter controller={controller} />}
  >
    <ProductBulkSyncSetupContent controller={controller} />
  </AppModal>
);

const ProductBulkSyncSetupFooter = ({
  controller,
}: ProductBulkSyncSetupViewProps): React.JSX.Element => (
  <>
    <Button
      type='button'
      variant='outline'
      onClick={controller.onClose}
      disabled={controller.isRunning}
    >
      Cancel
    </Button>
    <Button
      type='button'
      onClick={controller.handleStart}
      disabled={
        controller.isRunning ||
        controller.profileId.length === 0 ||
        controller.profiles.length === 0
      }
      loading={controller.isRunning}
      loadingText='Syncing...'
    >
      Start Sync
    </Button>
  </>
);

const ProductBulkSyncSetupContent = ({
  controller,
}: ProductBulkSyncSetupViewProps): React.JSX.Element => {
  if (controller.profilesLoading) {
    return (
      <div className='space-y-4'>
        <p className='text-sm text-muted-foreground'>Loading sync profiles...</p>
      </div>
    );
  }
  if (controller.profiles.length === 0) {
    return (
      <div className='space-y-4'>
        <p className='text-sm text-muted-foreground'>
          No sync profiles configured. Create one in Base.com Synchronization Engine first.
        </p>
      </div>
    );
  }
  return (
    <div className='space-y-4'>
      <ProductSyncProfileSelect controller={controller} />
      {controller.selectedProfile !== null ? (
        <ProductSyncProfileDetails controller={controller} />
      ) : null}
    </div>
  );
};

const ProductSyncProfileSelect = ({
  controller,
}: ProductBulkSyncSetupViewProps): React.JSX.Element => (
  <div>
    <label
      htmlFor='product-bulk-sync-profile'
      className='mb-1 block text-xs font-medium text-gray-400'
    >
      Sync Profile
    </label>
    <SelectSimple
      id='product-bulk-sync-profile'
      size='sm'
      variant='subtle'
      value={controller.profileId}
      onValueChange={controller.setProfileId}
      options={controller.options}
      triggerClassName='w-full'
      ariaLabel='Sync profile'
      title='Sync profile'
    />
  </div>
);

const ProductSyncProfileDetails = ({
  controller,
}: ProductBulkSyncSetupViewProps): React.JSX.Element => (
  <div className='rounded-md border border-border/60 bg-card/40 p-3 space-y-3'>
    <ProductSyncProfileMetaGrid controller={controller} />
    <ProductSyncCatalogBadge controller={controller} />
    <ProductSyncRuleSummary controller={controller} />
    <ProductSyncDirectionRules controller={controller} />
  </div>
);

const ProductSyncProfileMetaGrid = ({
  controller,
}: ProductBulkSyncSetupViewProps): React.JSX.Element => (
  <div className='grid gap-2 md:grid-cols-3'>
    <ProductSyncLabelBlock
      title='Connection'
      primary={controller.connectionLabel?.primary ?? controller.selectedProfile?.connectionId ?? ''}
      secondary={controller.connectionLabel?.secondary ?? null}
    />
    <ProductSyncLabelBlock
      title='Inventory'
      primary={controller.inventoryLabel.primary}
      secondary={controller.inventoryLabel.secondary}
    />
    <ProductSyncLabelBlock
      title='Last Run'
      primary={formatLastRunAt(controller.selectedProfile?.lastRunAt)}
      secondary={null}
    />
  </div>
);

const ProductSyncLabelBlock = ({
  primary,
  secondary,
  title,
}: {
  primary: string;
  secondary: string | null;
  title: string;
}): React.JSX.Element => (
  <div>
    <div className='text-[10px] uppercase tracking-wide text-gray-500'>{title}</div>
    <div className='mt-1 text-[11px] text-gray-200 break-words'>{primary}</div>
    {secondary !== null && secondary.length > 0 ? (
      <div className='mt-1 text-[10px] font-mono text-gray-500 break-words'>{secondary}</div>
    ) : null}
  </div>
);

const ProductSyncCatalogBadge = ({
  controller,
}: ProductBulkSyncSetupViewProps): React.JSX.Element | null => {
  const catalogId = controller.selectedProfile?.catalogId ?? '';
  if (catalogId.length === 0) return null;
  return (
    <div className='flex items-center gap-2'>
      <Badge variant='outline' className='text-[10px] uppercase'>
        Catalog
      </Badge>
      <span className='font-mono text-[11px] text-gray-400'>{catalogId}</span>
    </div>
  );
};

const ProductSyncRuleSummary = ({
  controller,
}: ProductBulkSyncSetupViewProps): React.JSX.Element => (
  <div className='text-[10px] text-gray-400'>
    {controller.ruleSummary.appToBaseCount} {'App -> Base'},{' '}
    {controller.ruleSummary.baseToAppCount} {'Base -> App'},{' '}
    {controller.ruleSummary.disabledCount} Disabled
  </div>
);

const ProductSyncDirectionRules = ({
  controller,
}: ProductBulkSyncSetupViewProps): React.JSX.Element | null =>
  controller.directionRules.length > 0 ? (
    <div className='grid gap-2 md:grid-cols-2'>
      {controller.directionRules.map((rule) => (
        <ProductSyncDirectionRule key={rule.appField} controller={controller} rule={rule} />
      ))}
    </div>
  ) : null;

const ProductSyncDirectionRule = ({
  controller,
  rule,
}: ProductBulkSyncSetupViewProps & {
  rule: ProductSyncFieldRule;
}): React.JSX.Element => (
  <div className='rounded-md border border-white/5 bg-black/10 px-2 py-2'>
    <div className='flex items-start justify-between gap-2'>
      <div className='min-w-0 text-[11px] text-gray-200'>
        {getProductSyncAppFieldLabel(rule.appField)}
      </div>
      <Badge
        variant='outline'
        className={cn(
          'shrink-0 text-[10px] gap-1',
          rule.direction === 'app_to_base' && 'text-blue-300 border-blue-500/30',
          rule.direction === 'base_to_app' && 'text-purple-300 border-purple-500/30'
        )}
      >
        {directionIcon(rule.direction)}
        {directionLabel(rule.direction)}
      </Badge>
    </div>
    <div className='mt-1 text-[10px] text-gray-500 break-words'>
      Target:{' '}
      {resolveRuleTargetLabel(rule, controller.warehouseLabels, controller.priceGroupLabels)}
    </div>
  </div>
);
