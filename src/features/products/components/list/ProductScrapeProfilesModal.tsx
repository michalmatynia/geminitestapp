'use client';

import { Play } from 'lucide-react';

import { AppModal } from '@/shared/ui/app-modal';
import { Button } from '@/shared/ui/button';

import { useProductScrapeProfilesController } from './ProductScrapeProfilesModal.controller';
import { ProductScrapeProfilesBody } from './ProductScrapeProfilesModal.parts';

type ProductScrapeProfilesModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function ProductScrapeProfilesModal(
  props: ProductScrapeProfilesModalProps
): React.JSX.Element {
  const { isOpen, onClose } = props;
  const controller = useProductScrapeProfilesController(isOpen);

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title='Scrape Profiles'
      subtitle='BattleStock product import'
      size='lg'
      lockClose={controller.isBusy}
      footer={
        <>
          <Button type='button' variant='outline' onClick={onClose} disabled={controller.isBusy}>
            Close
          </Button>
          <Button
            type='button'
            onClick={controller.onRun}
            disabled={!controller.canRun}
            loading={controller.isBusy}
            loadingText='Running...'
          >
            <Play className='size-4' aria-hidden='true' />
            Run Profile
          </Button>
        </>
      }
    >
      <ProductScrapeProfilesBody
        dryRun={controller.dryRun}
        error={controller.error}
        isLoading={controller.isLoading}
        isDraftTemplatesLoading={controller.isDraftTemplatesLoading}
        limitError={controller.limitError}
        limitInput={controller.limitInput}
        draftTemplates={controller.draftTemplates}
        profiles={controller.profiles}
        result={controller.result}
        selectedDraftTemplateId={controller.selectedDraftTemplateId}
        selectedProfileId={controller.selectedProfileId}
        onDryRunChange={controller.onDryRunChange}
        onDraftTemplateSelect={controller.onDraftTemplateSelect}
        onLimitInputChange={controller.onLimitInputChange}
        onProfileSelect={controller.onProfileSelect}
      />
    </AppModal>
  );
}
