'use client';

import { Pause, Play } from 'lucide-react';

import { AppModal } from '@/shared/ui/app-modal';
import { Button } from '@/shared/ui/button';

import { useProductScrapeProfilesController } from './ProductScrapeProfilesModal.controller';
import { ProductScrapeProfilesBody } from './ProductScrapeProfilesModal.parts';
import type { ProductScrapeProfileRuntimeRunController } from './useProductScrapeProfileRuntimeRun';

type ProductScrapeProfilesModalProps = {
  isOpen: boolean;
  onClose: () => void;
  scrapeRuntime?: ProductScrapeProfileRuntimeRunController;
};

function ProductScrapeProfilesPausedAction({
  isUpdating,
  onResume,
}: {
  isUpdating: boolean;
  onResume: () => void;
}): React.JSX.Element {
  return (
    <Button
      type='button'
      size='sm'
      variant='warning'
      onClick={onResume}
      loading={isUpdating}
      loadingText='Updating...'
    >
      <Play className='size-4' aria-hidden='true' />
      Paused
    </Button>
  );
}

function ProductScrapeProfilesRunningAction({
  isUpdating,
  label = 'Running',
  onPause,
}: {
  isUpdating: boolean;
  label?: string;
  onPause: () => void;
}): React.JSX.Element {
  return (
    <Button
      type='button'
      size='sm'
      variant='warning'
      onClick={onPause}
      loading={isUpdating}
      loadingText='Updating...'
    >
      <Pause className='size-4' aria-hidden='true' />
      {label}
    </Button>
  );
}

const getActiveRunActionLabel = (
  status: NonNullable<ProductScrapeProfileRuntimeRunController['activeRun']>['status']
): string => (status === 'queued' ? 'Queued' : 'Running');

function ProductScrapeProfilesActiveAction({
  activeRun,
  scrapeRuntime,
}: {
  activeRun: NonNullable<ProductScrapeProfileRuntimeRunController['activeRun']>;
  scrapeRuntime: ProductScrapeProfileRuntimeRunController;
}): React.JSX.Element {
  if (activeRun.status === 'paused') {
    return (
      <ProductScrapeProfilesPausedAction
        isUpdating={scrapeRuntime.isUpdating}
        onResume={scrapeRuntime.resumeActiveRun}
      />
    );
  }
  return (
    <ProductScrapeProfilesRunningAction
      isUpdating={scrapeRuntime.isUpdating}
      label={getActiveRunActionLabel(activeRun.status)}
      onPause={scrapeRuntime.pauseActiveRun}
    />
  );
}

function ProductScrapeProfilesRunAction({
  canRun,
  isBusy,
  onRun,
  scrapeRuntime,
}: {
  canRun: boolean;
  isBusy: boolean;
  onRun: () => void;
  scrapeRuntime?: ProductScrapeProfileRuntimeRunController;
}): React.JSX.Element {
  const activeRun = scrapeRuntime?.activeRun ?? null;
  if (activeRun !== null && scrapeRuntime !== undefined) {
    return <ProductScrapeProfilesActiveAction activeRun={activeRun} scrapeRuntime={scrapeRuntime} />;
  }

  return (
    <Button
      type='button'
      size='sm'
      onClick={onRun}
      disabled={!canRun}
      loading={isBusy}
      loadingText='Queueing...'
    >
      <Play className='size-4' aria-hidden='true' />
      Run Profile
    </Button>
  );
}

export function ProductScrapeProfilesModal(
  props: ProductScrapeProfilesModalProps
): React.JSX.Element {
  const { isOpen, onClose, scrapeRuntime } = props;
  const controller = useProductScrapeProfilesController(isOpen, {
    onRunQueued: scrapeRuntime?.registerQueuedRun,
  });
  const activeRun = scrapeRuntime?.activeRun ?? null;
  const latestRun = scrapeRuntime?.latestRun ?? null;
  const runProfileAction = (
    <ProductScrapeProfilesRunAction
      canRun={controller.canRun}
      isBusy={controller.isBusy}
      onRun={controller.onRun}
      scrapeRuntime={scrapeRuntime}
    />
  );

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title='Scrape Profiles'
      subtitle='BattleStock product import'
      size='lg'
      headerActions={runProfileAction}
    >
      <ProductScrapeProfilesBody
        dryRun={controller.dryRun}
        error={controller.error}
        isLoading={controller.isLoading}
        isDraftTemplatesLoading={controller.isDraftTemplatesLoading}
        imageImportMode={controller.imageImportMode}
        sourcePriceCurrencyCode={controller.sourcePriceCurrencyCode}
        limitError={controller.limitError}
        limitInput={controller.limitInput}
        draftTemplates={controller.draftTemplates}
        profiles={controller.profiles}
        activeRun={activeRun}
        latestRun={latestRun}
        queuedRun={controller.queuedRun}
        result={controller.result}
        runtimeAction={controller.runtimeAction}
        selectedDraftTemplateId={controller.selectedDraftTemplateId}
        selectedProfileId={controller.selectedProfileId}
        onDryRunChange={controller.onDryRunChange}
        onDraftTemplateSelect={controller.onDraftTemplateSelect}
        onImageImportModeChange={controller.onImageImportModeChange}
        onSourcePriceCurrencyCodeChange={controller.onSourcePriceCurrencyCodeChange}
        onLimitInputChange={controller.onLimitInputChange}
        onProfileSelect={controller.onProfileSelect}
      />
    </AppModal>
  );
}
