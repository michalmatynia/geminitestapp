'use client';

import { TraderaStatusCheckModal } from '@/features/integrations/product-integrations-adapter';
import {
  AdvancedFilterBuilder,
} from '@/features/products/components/list/advanced-filter';
import { ProductBatchEditModal } from '@/features/products/components/list/ProductBatchEditModal';
import { ProductBulkSyncResultsModal } from '@/features/products/components/list/ProductBulkSyncResultsModal';
import { ProductBulkSyncSetupModal } from '@/features/products/components/list/ProductBulkSyncSetupModal';
import { ProductMarketplaceCopyDebrandBatchModal } from '@/features/products/components/list/ProductMarketplaceCopyDebrandBatchModal';
import { ProductParseActionsModal } from '@/features/products/components/list/ProductParseActionsModal';
import { ProductScanModal } from '@/features/products/components/list/ProductScanModal';
import { ProductScrapeProfilesModal } from '@/features/products/components/list/ProductScrapeProfilesModal';
import { AppModal } from '@/shared/ui/app-modal';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { JSONImportModal } from '@/shared/ui/templates/modals/JSONImportModal';

import type { ProductSelectionActionsController } from './ProductSelectionActions.types';

type ProductSelectionModalProps = {
  controller: ProductSelectionActionsController;
};

export const ProductSelectionModalStack = ({
  controller,
}: ProductSelectionModalProps): React.JSX.Element => (
  <>
    <PresetDialog controller={controller} />
    <PresetImportModal controller={controller} />
    <PresetFileInput controller={controller} />
    <ProductSelectionListingModals controller={controller} />
    <ProductSelectionBatchModals controller={controller} />
    <ProductSelectionUtilityModals controller={controller} />
  </>
);

const PresetDialog = ({ controller }: ProductSelectionModalProps): React.JSX.Element => {
  const { presets } = controller;
  return (
    <AppModal
      isOpen={presets.isPresetDialogOpen}
      onClose={presets.closePresetDialog}
      title={presets.presetDialogMode === 'edit' ? 'Edit Filter Preset' : 'Save Filter Preset'}
      subtitle={
        presets.presetDialogMode === 'edit'
          ? 'Update the preset name and advanced filter rules.'
          : 'Presets store advanced filter sequences.'
      }
      size={presets.presetDialogMode === 'edit' ? 'xl' : 'sm'}
      footer={<PresetDialogFooter controller={controller} />}
    >
      <div className='space-y-4'>
        <Input
          value={presets.presetName}
          onChange={(event) => presets.setPresetName(event.target.value)}
          placeholder='Preset name'
          aria-label='Preset name'
          className='h-8'
          title='Preset name'
        />
        {presets.presetDialogMode === 'edit' && presets.presetFilterDraft !== null ? (
          <AdvancedFilterBuilder
            group={presets.presetFilterDraft}
            onChange={presets.setPresetFilterDraft}
          />
        ) : null}
      </div>
    </AppModal>
  );
};

const PresetDialogFooter = ({
  controller,
}: ProductSelectionModalProps): React.JSX.Element => (
  <>
    <Button type='button' variant='outline' onClick={controller.presets.closePresetDialog}>
      Cancel
    </Button>
    <Button
      type='button'
      onClick={() => {
        void controller.presets.handleSavePresetDialog();
      }}
      disabled={controller.presets.savingPreset}
    >
      {controller.presets.presetDialogSubmitLabel}
    </Button>
  </>
);

const PresetImportModal = ({
  controller,
}: ProductSelectionModalProps): React.JSX.Element => (
  <JSONImportModal
    isOpen={controller.presets.isImportDialogOpen}
    onClose={controller.presets.closeImportDialog}
    title='Import Filter Presets'
    subtitle='Paste preset JSON or a preset bundle to merge into your saved presets.'
    onImport={controller.presets.handleImportFromDialog}
    isLoading={controller.presets.importingPresets}
    confirmText='Import Presets'
    placeholder='Paste preset JSON here...'
  />
);

const PresetFileInput = ({
  controller,
}: ProductSelectionModalProps): React.JSX.Element => (
  <input
    ref={controller.presets.importFileInputRef}
    type='file'
    accept='application/json,.json'
    className='hidden'
    aria-label='Import presets file'
    onChange={(event) => {
      void controller.presets.handleImportFromFile(event);
    }}
  />
);

const ProductSelectionListingModals = ({
  controller,
}: ProductSelectionModalProps): React.JSX.Element => {
  const { dialogs } = controller;
  return (
    <>
      <TraderaStatusCheckModal
        isOpen={dialogs.isTraderaStatusCheckOpen}
        onClose={dialogs.closeTraderaStatusCheck}
        productIds={dialogs.statusCheckProductIds}
        products={dialogs.statusCheckProducts}
      />
      <ProductScanModal
        isOpen={dialogs.isProductScanOpen}
        onClose={dialogs.closeProductScan}
        productIds={dialogs.productScanProductIds}
        products={dialogs.productScanProducts}
      />
    </>
  );
};

const ProductSelectionBatchModals = ({
  controller,
}: ProductSelectionModalProps): React.JSX.Element => {
  const { bulk, dialogs } = controller;
  return (
    <>
      <ProductBatchEditModal
        isOpen={dialogs.isBatchEditOpen}
        onClose={() => {
          if (bulk.isBatchEditingProductFields) return;
          dialogs.closeBatchEdit();
        }}
        productIds={dialogs.batchEditProductIds}
        isSubmitting={bulk.isBatchEditingProductFields}
        onSubmit={bulk.handleSubmitBatchEdit}
        onApplied={bulk.handleBatchEditApplied}
      />
      <ProductMarketplaceCopyDebrandBatchModal
        isOpen={dialogs.isMarketplaceCopyDebrandOpen}
        onClose={() => {
          if (bulk.isQueueingMarketplaceCopyDebrandBatch) return;
          dialogs.closeMarketplaceCopyDebrand();
        }}
        selectedCount={dialogs.marketplaceCopyDebrandProductIds.length}
        isSubmitting={bulk.isQueueingMarketplaceCopyDebrandBatch}
        onSubmit={(integrationId) => {
          void bulk.handleSubmitMarketplaceCopyDebrand(integrationId);
        }}
      />
    </>
  );
};

const ProductSelectionUtilityModals = ({
  controller,
}: ProductSelectionModalProps): React.JSX.Element => {
  const { bulk, dialogs } = controller;
  return (
    <>
      <ProductParseActionsModal
        isOpen={dialogs.isParseActionsOpen}
        onClose={dialogs.closeParseActions}
        onFindMatches={bulk.handleFindParsedMatches}
      />
      <ProductScrapeProfilesModal
        isOpen={dialogs.isScrapeProfilesOpen}
        onClose={dialogs.closeScrapeProfiles}
        scrapeRuntime={controller.scrapeProfilesRuntime}
      />
      <ProductBulkSyncSetupModal
        isOpen={dialogs.isBulkSyncSetupOpen}
        onClose={() => {
          if (bulk.isRunningBulkBaseSync) return;
          dialogs.closeBulkSyncSetup();
        }}
        selectedCount={dialogs.bulkSyncSetupProductIds.length}
        isRunning={bulk.isRunningBulkBaseSync}
        onStart={(profileId) => {
          void bulk.handleStartBulkBaseSync(profileId);
        }}
      />
      <ProductBulkSyncResultsModal
        isOpen={dialogs.isBulkSyncResultsOpen}
        onClose={dialogs.closeBulkSyncResults}
        response={dialogs.bulkSyncResults}
        products={dialogs.bulkSyncResultProducts}
      />
    </>
  );
};
