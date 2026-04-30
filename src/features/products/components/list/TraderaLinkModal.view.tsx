'use client';

import { FormModal } from '@/shared/ui/FormModal';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { SelectSimple } from '@/shared/ui/select-simple';

import type { TraderaLinkModalController } from './TraderaLinkModal.types';

const TraderaLinkStatusMessages = ({
  controller,
}: {
  controller: TraderaLinkModalController;
}): React.JSX.Element | null => {
  if (controller.traderaConnections.length === 0 && !controller.isLoadingIntegrations) {
    return (
      <p className='rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200'>
        No Tradera connections are configured yet. Add one in Integrations before linking a
        listing.
      </p>
    );
  }
  if (controller.errorMessage !== null) {
    return (
      <p
        role='alert'
        className='rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200'
      >
        {controller.errorMessage}
      </p>
    );
  }
  return null;
};

const TraderaManualConnectionField = ({
  controller,
}: {
  controller: TraderaLinkModalController;
}): React.JSX.Element => (
  <div className='space-y-2'>
    <Label htmlFor='tradera-link-connection'>Tradera connection</Label>
    {controller.sellerAlias !== null ? (
      <p className='text-xs text-muted-foreground'>
        Detected seller alias:{' '}
        <span className='font-medium text-foreground'>{controller.sellerAlias}</span>
      </p>
    ) : (
      <p className='text-xs text-muted-foreground'>
        This listing could not be matched to a single saved Tradera connection. Choose the correct
        one to continue.
      </p>
    )}
    <SelectSimple
      id='tradera-link-connection'
      value={
        controller.selectedConnectionId.length > 0 ? controller.selectedConnectionId : undefined
      }
      onValueChange={controller.setSelectedConnectionId}
      options={controller.connectionOptions}
      placeholder='Choose Tradera connection'
      disabled={controller.linkPending || controller.connectionOptions.length === 0}
      ariaLabel='Choose Tradera connection'
    />
  </div>
);

const TraderaConnectionModeContent = ({
  controller,
}: {
  controller: TraderaLinkModalController;
}): React.JSX.Element =>
  controller.manualConnectionRequired ? (
    <TraderaManualConnectionField controller={controller} />
  ) : (
    <p className='text-xs text-muted-foreground'>
      The app will infer the Tradera connection automatically from the listing whenever it can do so
      safely.
    </p>
  );

export const TraderaLinkModalView = ({
  controller,
  isOpen,
}: {
  controller: TraderaLinkModalController;
  isOpen: boolean;
}): React.JSX.Element => (
  <FormModal
    open={isOpen}
    onClose={controller.handleClose}
    title='Add Tradera Link'
    subtitle='Paste a public Tradera listing URL and attach it to this product without creating a new listing.'
    onSave={() => {
      void controller.handleSubmit();
    }}
    saveText='Link Listing'
    cancelText='Cancel'
    isSaving={controller.linkPending}
    isSaveDisabled={controller.isSaveDisabled}
    size='md'
  >
    <div className='space-y-4'>
      <div className='space-y-2'>
        <Label htmlFor='tradera-link-url'>Tradera listing URL</Label>
        <Input
          id='tradera-link-url'
          value={controller.listingUrl}
          onChange={(event) => controller.setListingUrl(event.target.value)}
          placeholder='https://www.tradera.com/item/725128879'
          autoFocus
          disabled={controller.linkPending}
        />
      </div>
      <TraderaLinkStatusMessages controller={controller} />
      <TraderaConnectionModeContent controller={controller} />
    </div>
  </FormModal>
);
