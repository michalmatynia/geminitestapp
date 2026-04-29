'use client';

import { useEffect, useMemo, useState } from 'react';

import { resolveIntegrationDisplayName } from '@/features/integrations/components/listings/product-listings-labels';
import {
  isBaseIntegrationSlug,
  isLinkedInIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import { useIntegrations } from '@/features/integrations/hooks/useIntegrationQueries';
import type { Integration } from '@/shared/contracts/integrations/base';
import { AppModal } from '@/shared/ui/app-modal';
import { Button } from '@/shared/ui/button';
import { SelectSimple } from '@/shared/ui/forms-and-actions.public';

type ProductMarketplaceCopyDebrandBatchModalProps = {
  isOpen: boolean;
  selectedCount: number;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (integrationId: string) => void;
};
type MarketplaceCopyDebrandOption = { value: string; label: string; description: string };

const isEligibleMarketplaceIntegration = (integration: Integration): boolean => {
  const slug = integration.slug.trim();
  return !isBaseIntegrationSlug(slug) && !isLinkedInIntegrationSlug(slug);
};

const resolveMarketplaceLabel = (integration: Integration): string =>
  resolveIntegrationDisplayName(integration.name, integration.slug) ?? integration.name;

type ProductMarketplaceCopyDebrandBatchFooterProps = {
  integrationId: string;
  isSubmitting: boolean;
  selectedCount: number;
  onClose: () => void;
  onSubmit: () => void;
};

const ProductMarketplaceCopyDebrandBatchFooter = (
  props: ProductMarketplaceCopyDebrandBatchFooterProps
): React.JSX.Element => (
  <>
    <Button type='button' variant='outline' onClick={props.onClose} disabled={props.isSubmitting}>
      Cancel
    </Button>
    <Button
      type='button'
      onClick={props.onSubmit}
      disabled={
        props.isSubmitting || props.integrationId.length === 0 || props.selectedCount === 0
      }
      loading={props.isSubmitting}
      loadingText='Queueing...'
    >
      Queue Debrand
    </Button>
  </>
);

type ProductMarketplaceCopyDebrandBatchBodyProps = {
  isLoading: boolean;
  options: MarketplaceCopyDebrandOption[];
  integrationId: string;
  selectedMarketplaceName: string;
  onIntegrationChange: (integrationId: string) => void;
};
type MarketplaceCopyDebrandModalState = {
  integrationId: string;
  integrationsQuery: ReturnType<typeof useIntegrations>;
  options: MarketplaceCopyDebrandOption[];
  selectedMarketplaceName: string;
  setIntegrationId: (integrationId: string) => void;
};

const ProductMarketplaceCopyDebrandBatchBody = (
  props: ProductMarketplaceCopyDebrandBatchBodyProps
): React.JSX.Element => {
  if (props.isLoading) {
    return <p className='text-sm text-muted-foreground'>Loading marketplaces...</p>;
  }

  if (props.options.length === 0) {
    return (
      <p className='text-sm text-muted-foreground'>No marketplace integrations are available.</p>
    );
  }

  return (
    <>
      <div>
        <label
          htmlFor='marketplace-copy-debrand-integration'
          className='mb-1 block text-xs font-medium text-gray-400'
        >
          Marketplace
        </label>
        <SelectSimple
          id='marketplace-copy-debrand-integration'
          size='sm'
          variant='subtle'
          value={props.integrationId}
          onValueChange={props.onIntegrationChange}
          options={props.options}
          triggerClassName='w-full'
          ariaLabel='Marketplace'
          title='Marketplace'
        />
      </div>
      <div className='rounded-md border border-border/60 bg-card/40 p-3 text-xs leading-5 text-muted-foreground'>
        Missing marketplace copy overrides will be created for {props.selectedMarketplaceName}.
        Existing overrides for that marketplace will be reused, then Debrand runs will be queued in
        Redis runtime.
      </div>
    </>
  );
};

const useMarketplaceCopyDebrandModalState = (
  isOpen: boolean
): MarketplaceCopyDebrandModalState => {
  const integrationsQuery = useIntegrations({ enabled: isOpen });
  const integrations = useMemo(() => integrationsQuery.data ?? [], [integrationsQuery.data]);
  const options = useMemo(
    (): MarketplaceCopyDebrandOption[] =>
      integrations
        .filter(isEligibleMarketplaceIntegration)
        .map((integration: Integration) => ({
          value: integration.id,
          label: resolveMarketplaceLabel(integration),
          description: integration.slug,
        }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    [integrations]
  );
  const [integrationId, setIntegrationId] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (options.length === 0) {
      setIntegrationId('');
      return;
    }
    setIntegrationId((current) =>
      options.some((option) => option.value === current) ? current : (options[0]?.value ?? '')
    );
  }, [isOpen, options]);

  return {
    integrationId,
    integrationsQuery,
    options,
    selectedMarketplaceName:
      options.find((option) => option.value === integrationId)?.label ?? 'selected marketplace',
    setIntegrationId,
  };
};

export function ProductMarketplaceCopyDebrandBatchModal(
  props: ProductMarketplaceCopyDebrandBatchModalProps
): React.JSX.Element {
  const { isOpen, selectedCount, isSubmitting, onClose, onSubmit } = props;
  const {
    integrationId,
    integrationsQuery,
    options,
    selectedMarketplaceName,
    setIntegrationId,
  } = useMarketplaceCopyDebrandModalState(isOpen);

  const handleSubmit = (): void => {
    if (integrationId.length === 0) return;
    onSubmit(integrationId);
  };

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title='Runtime Debrand'
      subtitle={`${selectedCount} product${selectedCount === 1 ? '' : 's'} selected.`}
      size='sm'
      footer={
        <ProductMarketplaceCopyDebrandBatchFooter
          integrationId={integrationId}
          isSubmitting={isSubmitting}
          selectedCount={selectedCount}
          onClose={onClose}
          onSubmit={handleSubmit}
        />
      }
    >
      <div className='space-y-4'>
        <ProductMarketplaceCopyDebrandBatchBody
          isLoading={integrationsQuery.isLoading}
          options={options}
          integrationId={integrationId}
          selectedMarketplaceName={selectedMarketplaceName}
          onIntegrationChange={setIntegrationId}
        />
      </div>
    </AppModal>
  );
}
