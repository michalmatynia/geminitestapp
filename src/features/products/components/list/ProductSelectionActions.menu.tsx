'use client';

import {
  Activity,
  Archive,
  Clock,
  FileSearch,
  Globe2,
  Image as ImageIcon,
  Loader2,
  Pause,
  Pencil,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Store,
  X,
} from 'lucide-react';

import { Button } from '@/shared/ui/button';
import { Chip } from '@/shared/ui/chip';
import { DropdownMenuItem } from '@/shared/ui/dropdown-menu';
import { cn } from '@/shared/utils/ui-utils';

import { ProductFilterPresetMenu } from './ProductSelectionActions.preset-menu';
import type { ProductSelectionActionsController } from './ProductSelectionActions.types';

type ProductSelectionMenuProps = {
  controller: ProductSelectionActionsController;
};

const getScrapeProfilesToolbarLabel = (
  activeRun: ProductSelectionActionsController['scrapeProfilesRuntime']['activeRun'],
  isActive: boolean
): string => {
  if (!isActive) return 'Scrape Profiles';
  if (activeRun?.status === 'queued') return 'Queued';
  return activeRun?.status === 'paused' ? 'Paused' : 'Running';
};

const renderScrapeProfilesToolbarIcon = (
  activeRun: ProductSelectionActionsController['scrapeProfilesRuntime']['activeRun'],
  isActive: boolean
): React.JSX.Element => {
  if (!isActive) return <Globe2 className='h-3.5 w-3.5' />;
  if (activeRun?.status === 'queued') return <Clock className='h-3.5 w-3.5' />;
  if (activeRun?.status === 'paused') return <Pause className='h-3.5 w-3.5' />;
  return <Loader2 className='h-3.5 w-3.5 animate-spin' />;
};

export const ProductSelectionDropdownActions = ({
  controller,
}: ProductSelectionMenuProps): React.JSX.Element => {
  const { bulk, includeArchived, selection } = controller;
  return (
    <>
      <DropdownMenuItem onClick={selection.onAddToMarketplace} className='cursor-pointer gap-2'>
        <Store className='h-4 w-4' />
        Add to Marketplace
      </DropdownMenuItem>
      <ArchiveDropdownAction controller={controller} archived />
      {includeArchived ? <ArchiveDropdownAction controller={controller} archived={false} /> : null}
      <AsyncDropdownAction
        disabled={bulk.isTraderaMassExportRunning || selection.selectedCount === 0}
        icon={<Send className='h-4 w-4' />}
        label={bulk.isTraderaMassExportRunning ? 'Exporting to Tradera...' : 'Quick Export to Tradera'}
        onClick={bulk.handleQuickExportTradera}
      />
      <AsyncDropdownAction
        disabled={bulk.isVintedMassExportRunning || selection.selectedCount === 0}
        icon={<Send className='h-4 w-4' />}
        label={bulk.isVintedMassExportRunning ? 'Exporting to Vinted...' : 'Quick Export to Vinted'}
        onClick={bulk.handleQuickExportVinted}
      />
      <DropdownMenuItem
        onClick={bulk.handleCheckTraderaStatus}
        className='cursor-pointer gap-2'
        disabled={selection.selectedCount === 0}
      >
        <Activity className='h-4 w-4' />
        Check Tradera Listing Status
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={bulk.handleScanAmazonAsin}
        className='cursor-pointer gap-2'
        disabled={selection.selectedCount === 0}
      >
        <Search className='h-4 w-4' />
        Scan Amazon ASIN
      </DropdownMenuItem>
      <BatchEditDropdownAction controller={controller} />
      <MarketplaceDebrandDropdownAction controller={controller} />
      <BulkBaseSyncDropdownAction controller={controller} />
      <AsyncDropdownAction
        disabled={bulk.isConvertingSelected}
        icon={<ImageIcon className='h-4 w-4' />}
        label={bulk.isConvertingSelected ? 'Converting selected...' : 'Convert selected products'}
        onClick={bulk.handleConvertSelected}
      />
    </>
  );
};

const AsyncDropdownAction = ({
  disabled,
  icon,
  label,
  onClick,
}: {
  disabled: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => Promise<void>;
}): React.JSX.Element => (
  <DropdownMenuItem
    onClick={() => {
      void onClick();
    }}
    className='cursor-pointer gap-2'
    disabled={disabled}
  >
    {icon}
    {label}
  </DropdownMenuItem>
);

const ArchiveDropdownAction = ({
  archived,
  controller,
}: ProductSelectionMenuProps & { archived: boolean }): React.JSX.Element => {
  const { bulk, selection } = controller;
  const label = archived ? 'Send to Archive' : 'Remove from Archive';
  return (
    <DropdownMenuItem
      onClick={() => {
        void bulk.handleSetArchivedSelected(archived);
      }}
      className='cursor-pointer gap-2'
      disabled={bulk.isSettingSelectedArchivedState || selection.selectedCount === 0}
    >
      <Archive className='h-4 w-4' />
      {bulk.isSettingSelectedArchivedState ? 'Updating archive state...' : label}
    </DropdownMenuItem>
  );
};

const BatchEditDropdownAction = ({
  controller,
}: ProductSelectionMenuProps): React.JSX.Element => {
  const { bulk, selection } = controller;
  return (
    <DropdownMenuItem
      onClick={bulk.handleOpenBatchEdit}
      className='cursor-pointer gap-2'
      disabled={bulk.isBatchEditingProductFields || selection.selectedCount === 0}
    >
      <Pencil className='h-4 w-4' />
      {bulk.isBatchEditingProductFields ? 'Editing product fields...' : 'Edit Product Fields'}
    </DropdownMenuItem>
  );
};

const MarketplaceDebrandDropdownAction = ({
  controller,
}: ProductSelectionMenuProps): React.JSX.Element => {
  const { bulk, selection } = controller;
  return (
    <DropdownMenuItem
      onClick={bulk.handleOpenMarketplaceCopyDebrand}
      className='cursor-pointer gap-2'
      disabled={bulk.isQueueingMarketplaceCopyDebrandBatch || selection.selectedCount === 0}
    >
      <Sparkles className='h-4 w-4' />
      {bulk.isQueueingMarketplaceCopyDebrandBatch ? 'Queueing runtime Debrand...' : 'Runtime Debrand'}
    </DropdownMenuItem>
  );
};

const BulkBaseSyncDropdownAction = ({
  controller,
}: ProductSelectionMenuProps): React.JSX.Element => {
  const { bulk, selection } = controller;
  return (
    <DropdownMenuItem
      onClick={bulk.handleBulkBaseSync}
      className='cursor-pointer gap-2'
      disabled={bulk.isRunningBulkBaseSync || selection.selectedCount === 0}
    >
      <RefreshCw className='h-4 w-4' />
      {bulk.isRunningBulkBaseSync ? 'Syncing with Base.com...' : 'Sync with Base.com'}
    </DropdownMenuItem>
  );
};

export const ProductSelectionToolbarActions = ({
  controller,
}: ProductSelectionMenuProps): React.JSX.Element => {
  const { activeRun, isActive } = controller.scrapeProfilesRuntime;
  const scrapeProfilesLabel = getScrapeProfilesToolbarLabel(activeRun, isActive);

  return (
    <div className='flex w-full flex-wrap items-center gap-2 sm:w-auto'>
      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={controller.dialogs.openParseActions}
        className='h-8 w-full gap-2 border-border/60 bg-card/30 text-gray-300 hover:bg-card/50 hover:text-white sm:w-auto'
      >
        <FileSearch className='h-3.5 w-3.5' />
        Parse Actions
      </Button>
      <Button
        type='button'
        variant={isActive ? 'warning' : 'outline'}
        size='sm'
        onClick={controller.dialogs.openScrapeProfiles}
        className={cn(
          'h-8 w-full gap-2 sm:w-auto',
          isActive
            ? 'border-amber-400/40 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25 hover:text-amber-50'
            : 'border-border/60 bg-card/30 text-gray-300 hover:bg-card/50 hover:text-white'
        )}
      >
        {renderScrapeProfilesToolbarIcon(activeRun, isActive)}
        {scrapeProfilesLabel}
      </Button>
    </div>
  );
};

export const ProductSelectionRightActions = ({
  controller,
}: ProductSelectionMenuProps): React.JSX.Element => (
  <div className='flex w-full flex-wrap items-center gap-2 sm:w-auto'>
    <ActivePresetChip controller={controller} />
    <ParsedMatchesChip controller={controller} />
    <ProductFilterPresetMenu controller={controller} />
  </div>
);

const ActivePresetChip = ({ controller }: ProductSelectionMenuProps): React.JSX.Element | null =>
  controller.presets.activePreset !== null ? (
    <Chip
      label={controller.presets.activePreset.name}
      active
      onClick={() => controller.presets.setAdvancedFilterState('', null)}
      icon={X}
      className='h-8 max-w-[240px] w-full sm:w-auto'
    />
  ) : null;

const ParsedMatchesChip = ({ controller }: ProductSelectionMenuProps): React.JSX.Element | null =>
  controller.parsedMatchProductIds.length > 0 ? (
    <Chip
      label={`Parsed products: ${controller.parsedMatchProductIds.length}`}
      active
      onClick={controller.bulk.handleClearParsedMatches}
      icon={X}
      className='h-8 max-w-[240px] w-full sm:w-auto'
    />
  ) : null;
