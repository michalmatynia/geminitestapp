'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  isTraderaIntegrationSlug,
  useDefaultTraderaConnection,
  useIntegrationsWithConnections,
  useLinkExistingTraderaListingMutation,
} from '@/features/integrations/product-integrations-adapter';
import type { IntegrationWithConnections } from '@/shared/contracts/integrations/domain';
import type { TraderaProductLinkExistingCandidate } from '@/shared/contracts/integrations/listings';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { ApiError } from '@/shared/lib/api-client';
import { FormModal } from '@/shared/ui/FormModal';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { SelectSimple } from '@/shared/ui/select-simple';
import { useToast } from '@/shared/ui/toast';

type TraderaConnectionOption = {
  integrationId: string;
  integrationName: string;
  integrationSlug: string;
  connectionId: string;
  connectionName: string;
};

type CandidateConnectionMap = Record<string, TraderaProductLinkExistingCandidate>;

const toCandidateConnectionMap = (
  value: unknown
): CandidateConnectionMap => {
  if (!Array.isArray(value)) return {};

  return value.reduce<CandidateConnectionMap>((map, entry) => {
    if (!entry || typeof entry !== 'object') return map;
    const record = entry as Record<string, unknown>;
    const connectionId =
      typeof record['connectionId'] === 'string' ? record['connectionId'].trim() : '';
    if (!connectionId) return map;

    map[connectionId] = {
      integrationId:
        typeof record['integrationId'] === 'string' ? record['integrationId'].trim() : '',
      integrationName:
        typeof record['integrationName'] === 'string' ? record['integrationName'].trim() : '',
      integrationSlug:
        typeof record['integrationSlug'] === 'string' ? record['integrationSlug'].trim() : '',
      connectionId,
      connectionName:
        typeof record['connectionName'] === 'string' ? record['connectionName'].trim() : '',
      connectionUsername:
        typeof record['connectionUsername'] === 'string'
          ? record['connectionUsername'].trim()
          : null,
    };

    return map;
  }, {});
};

const flattenTraderaConnections = (
  integrations: IntegrationWithConnections[]
): TraderaConnectionOption[] =>
  integrations.flatMap((integration) =>
    isTraderaIntegrationSlug(integration.slug)
      ? integration.connections.map((connection) => ({
          integrationId: integration.id,
          integrationName: integration.name,
          integrationSlug: integration.slug,
          connectionId: connection.id,
          connectionName: connection.name,
        }))
      : []
  );

const readApiErrorDetails = (error: unknown): Record<string, unknown> | null => {
  if (!(error instanceof ApiError)) return null;
  if (!error.payload || typeof error.payload !== 'object' || Array.isArray(error.payload)) {
    return null;
  }

  const details = (error.payload as Record<string, unknown>)['details'];
  if (!details || typeof details !== 'object' || Array.isArray(details)) {
    return null;
  }

  return details as Record<string, unknown>;
};

export function TraderaLinkModal(props: {
  isOpen: boolean;
  product: ProductWithImages;
  onClose: () => void;
  onLinked?: (() => void) | undefined;
}): React.JSX.Element | null {
  const { isOpen, product, onClose, onLinked } = props;
  const { toast } = useToast();
  const linkMutation = useLinkExistingTraderaListingMutation(product.id);
  const { data: integrationsData = [], isLoading: isLoadingIntegrations } =
    useIntegrationsWithConnections();
  const { data: preferredTraderaConnection } = useDefaultTraderaConnection();

  const traderaConnections = useMemo(
    () => flattenTraderaConnections(integrationsData),
    [integrationsData]
  );
  const preferredConnectionId = preferredTraderaConnection?.connectionId?.trim() || '';

  const [listingUrl, setListingUrl] = useState('');
  const [selectedConnectionId, setSelectedConnectionId] = useState('');
  const [manualConnectionIds, setManualConnectionIds] = useState<string[] | null>(null);
  const [manualCandidates, setManualCandidates] = useState<CandidateConnectionMap>({});
  const [sellerAlias, setSellerAlias] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const manualConnectionRequired = manualConnectionIds !== null;

  const availableConnections = useMemo(() => {
    if (!manualConnectionRequired) return traderaConnections;

    const allowedIds = new Set(manualConnectionIds ?? []);
    return traderaConnections.filter((connection) => allowedIds.has(connection.connectionId));
  }, [manualConnectionIds, manualConnectionRequired, traderaConnections]);

  const connectionOptions = useMemo(
    () =>
      availableConnections.map((connection) => {
        const candidate = manualCandidates[connection.connectionId];
        const usernameSuffix = candidate?.connectionUsername
          ? ` · ${candidate.connectionUsername}`
          : '';

        return {
          value: connection.connectionId,
          label: connection.connectionName,
          description: `${connection.integrationName}${usernameSuffix}`,
          group: connection.integrationName,
        };
      }),
    [availableConnections, manualCandidates]
  );

  useEffect(() => {
    if (!isOpen) return;
    setListingUrl('');
    setSelectedConnectionId('');
    setManualConnectionIds(null);
    setManualCandidates({});
    setSellerAlias(null);
    setErrorMessage(null);
  }, [isOpen, product.id]);

  useEffect(() => {
    if (!isOpen) return;
    if (availableConnections.length === 0) {
      setSelectedConnectionId('');
      return;
    }

    if (
      selectedConnectionId &&
      availableConnections.some((connection) => connection.connectionId === selectedConnectionId)
    ) {
      return;
    }

    const preferredMatch =
      preferredConnectionId &&
      availableConnections.some((connection) => connection.connectionId === preferredConnectionId)
        ? preferredConnectionId
        : '';

    setSelectedConnectionId(preferredMatch || availableConnections[0]?.connectionId || '');
  }, [availableConnections, isOpen, preferredConnectionId, selectedConnectionId]);

  const handleClose = (): void => {
    if (linkMutation.isPending) return;
    onClose();
  };

  const handleSubmit = async (): Promise<void> => {
    const normalizedListingUrl = listingUrl.trim();
    if (!normalizedListingUrl) {
      setErrorMessage('Tradera listing URL is required.');
      return;
    }

    if (manualConnectionRequired && !selectedConnectionId) {
      setErrorMessage('Choose the Tradera connection that owns this listing.');
      return;
    }

    setErrorMessage(null);

    try {
      const response = await linkMutation.mutateAsync({
        listingUrl: normalizedListingUrl,
        ...(manualConnectionRequired ? { connectionId: selectedConnectionId } : {}),
      });

      const successDetail =
        response.inferenceMethod === 'provided'
          ? 'using the selected connection'
          : 'by inferring the connection from the listing';

      toast(`Linked existing Tradera listing ${successDetail}.`, {
        variant: 'success',
      });
      onLinked?.();
      onClose();
    } catch (error) {
      const details = readApiErrorDetails(error);
      const reason = typeof details?.['reason'] === 'string' ? details['reason'] : '';
      const nextSellerAlias =
        typeof details?.['sellerAlias'] === 'string' ? details['sellerAlias'] : null;
      const nextCandidates = toCandidateConnectionMap(details?.['candidateConnections']);
      const nextCandidateIds = Object.keys(nextCandidates);

      if (reason === 'ambiguous_connection' && nextCandidateIds.length > 0) {
        setManualConnectionIds(nextCandidateIds);
        setManualCandidates(nextCandidates);
        setSellerAlias(nextSellerAlias);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Could not infer the Tradera connection from this listing URL.'
        );
        return;
      }

      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to link the existing Tradera listing.'
      );
    }
  };

  if (!isOpen) return null;

  return (
    <FormModal
      open={isOpen}
      onClose={handleClose}
      title='Add Tradera Link'
      subtitle='Paste a public Tradera listing URL and attach it to this product without creating a new listing.'
      onSave={() => {
        void handleSubmit();
      }}
      saveText='Link Listing'
      cancelText='Cancel'
      isSaving={linkMutation.isPending}
      isSaveDisabled={
        linkMutation.isPending ||
        !listingUrl.trim() ||
        traderaConnections.length === 0 ||
        (manualConnectionRequired && !selectedConnectionId)
      }
      size='md'
    >
      <div className='space-y-4'>
        <div className='space-y-2'>
          <Label htmlFor='tradera-link-url'>Tradera listing URL</Label>
          <Input
            id='tradera-link-url'
            value={listingUrl}
            onChange={(event) => setListingUrl(event.target.value)}
            placeholder='https://www.tradera.com/item/725128879'
            autoFocus
            disabled={linkMutation.isPending}
          />
        </div>

        {traderaConnections.length === 0 && !isLoadingIntegrations ? (
          <p className='rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200'>
            No Tradera connections are configured yet. Add one in Integrations before linking a
            listing.
          </p>
        ) : null}

        {errorMessage ? (
          <p
            role='alert'
            className='rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200'
          >
            {errorMessage}
          </p>
        ) : null}

        {manualConnectionRequired ? (
          <div className='space-y-2'>
            <Label htmlFor='tradera-link-connection'>Tradera connection</Label>
            {sellerAlias ? (
              <p className='text-xs text-muted-foreground'>
                Detected seller alias: <span className='font-medium text-foreground'>{sellerAlias}</span>
              </p>
            ) : (
              <p className='text-xs text-muted-foreground'>
                This listing could not be matched to a single saved Tradera connection. Choose the
                correct one to continue.
              </p>
            )}
            <SelectSimple
              id='tradera-link-connection'
              value={selectedConnectionId || undefined}
              onValueChange={setSelectedConnectionId}
              options={connectionOptions}
              placeholder='Choose Tradera connection'
              disabled={linkMutation.isPending || connectionOptions.length === 0}
              ariaLabel='Choose Tradera connection'
            />
          </div>
        ) : (
          <p className='text-xs text-muted-foreground'>
            The app will infer the Tradera connection automatically from the listing whenever it can
            do so safely.
          </p>
        )}
      </div>
    </FormModal>
  );
}

export default TraderaLinkModal;
