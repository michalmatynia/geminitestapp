'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  useDefaultTraderaConnection,
  useIntegrationsWithConnections,
  useLinkExistingTraderaListingMutation,
} from '@/features/integrations/product-integrations-adapter';
import { useToast } from '@/shared/ui/toast';

import {
  createConnectionOptions,
  flattenTraderaConnections,
  getTraderaLinkErrorMessage,
  isTraderaLinkSaveDisabled,
  readTrimmedString,
  resolveAmbiguousConnectionState,
  resolveAvailableConnections,
  resolveSelectedConnectionId,
  validateTraderaLinkRequest,
} from './TraderaLinkModal.helpers';
import type {
  CandidateConnectionMap,
  TraderaLinkModalController,
  TraderaLinkModalProps,
} from './TraderaLinkModal.types';

type LinkExistingTraderaListingMutation = ReturnType<typeof useLinkExistingTraderaListingMutation>;
type ToastFn = ReturnType<typeof useToast>['toast'];

type TraderaLinkSubmitInput = {
  linkMutation: LinkExistingTraderaListingMutation;
  listingUrl: string;
  manualConnectionRequired: boolean;
  onClose: () => void;
  onLinked: (() => void) | undefined;
  selectedConnectionId: string;
  setErrorMessage: (value: string | null) => void;
  setManualCandidates: (value: CandidateConnectionMap) => void;
  setManualConnectionIds: (value: string[] | null) => void;
  setSellerAlias: (value: string | null) => void;
  toast: ToastFn;
};

type TraderaLinkResetInput = Pick<
  TraderaLinkSubmitInput,
  'setErrorMessage' | 'setManualCandidates' | 'setManualConnectionIds' | 'setSellerAlias'
> & {
  setListingUrl: (value: string) => void;
  setSelectedConnectionId: (value: string) => void;
};

const resetTraderaLinkState = ({
  setErrorMessage,
  setListingUrl,
  setManualCandidates,
  setManualConnectionIds,
  setSelectedConnectionId,
  setSellerAlias,
}: TraderaLinkResetInput): void => {
  setListingUrl('');
  setSelectedConnectionId('');
  setManualConnectionIds(null);
  setManualCandidates({});
  setSellerAlias(null);
  setErrorMessage(null);
};

const submitTraderaLink = async ({
  linkMutation,
  listingUrl,
  manualConnectionRequired,
  onClose,
  onLinked,
  selectedConnectionId,
  setErrorMessage,
  setManualCandidates,
  setManualConnectionIds,
  setSellerAlias,
  toast,
}: TraderaLinkSubmitInput): Promise<void> => {
  const validationError = validateTraderaLinkRequest({
    listingUrl,
    manualConnectionRequired,
    selectedConnectionId,
  });
  if (validationError !== null) {
    setErrorMessage(validationError);
    return;
  }
  setErrorMessage(null);
  try {
    const response = await linkMutation.mutateAsync({
      listingUrl: listingUrl.trim(),
      ...(manualConnectionRequired ? { connectionId: selectedConnectionId } : {}),
    });
    const successDetail = response.inferenceMethod === 'provided'
      ? 'using the selected connection'
      : 'by inferring the connection from the listing';
    toast(`Linked existing Tradera listing ${successDetail}.`, { variant: 'success' });
    if (onLinked !== undefined) onLinked();
    onClose();
  } catch (error) {
    const ambiguousState = resolveAmbiguousConnectionState(error);
    if (ambiguousState !== null) {
      setManualConnectionIds(ambiguousState.candidateIds);
      setManualCandidates(ambiguousState.candidates);
      setSellerAlias(ambiguousState.sellerAlias);
      setErrorMessage(ambiguousState.errorMessage);
      return;
    }
    setErrorMessage(getTraderaLinkErrorMessage(error));
  }
};

const useResetTraderaLinkModalState = ({
  isOpen,
  productId,
  reset,
}: {
  isOpen: boolean;
  productId: string;
  reset: () => void;
}): void => {
  useEffect(() => {
    if (!isOpen) return;
    reset();
  }, [isOpen, productId, reset]);
};

const useSelectedTraderaConnectionSync = ({
  availableConnections,
  isOpen,
  preferredConnectionId,
  selectedConnectionId,
  setSelectedConnectionId,
}: Pick<
  TraderaLinkModalController,
  'availableConnections' | 'selectedConnectionId' | 'setSelectedConnectionId'
> & {
  isOpen: boolean;
  preferredConnectionId: string;
}): void => {
  useEffect(() => {
    if (!isOpen) return;
    setSelectedConnectionId(
      resolveSelectedConnectionId({ availableConnections, preferredConnectionId, selectedConnectionId })
    );
  }, [availableConnections, isOpen, preferredConnectionId, selectedConnectionId,
    setSelectedConnectionId]);
};

export const useTraderaLinkModalController = (
  props: TraderaLinkModalProps
): TraderaLinkModalController => {
  const { isOpen, onClose, onLinked, product } = props;
  const { toast } = useToast();
  const linkMutation = useLinkExistingTraderaListingMutation(product.id);
  const { data: integrationsData = [], isLoading: isLoadingIntegrations } =
    useIntegrationsWithConnections();
  const { data: preferredTraderaConnection } = useDefaultTraderaConnection();
  const [listingUrl, setListingUrl] = useState('');
  const [selectedConnectionId, setSelectedConnectionId] = useState('');
  const [manualConnectionIds, setManualConnectionIds] = useState<string[] | null>(null);
  const [manualCandidates, setManualCandidates] = useState<CandidateConnectionMap>({});
  const [sellerAlias, setSellerAlias] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const traderaConnections = useMemo(() => flattenTraderaConnections(integrationsData), [integrationsData]);
  const manualConnectionRequired = manualConnectionIds !== null;
  const availableConnections = useMemo(
    () => resolveAvailableConnections({ manualConnectionIds, traderaConnections }),
    [manualConnectionIds, traderaConnections]
  );
  const connectionOptions = useMemo(
    () => createConnectionOptions({ availableConnections, manualCandidates }),
    [availableConnections, manualCandidates]
  );
  const reset = useCallback((): void => {
    resetTraderaLinkState({ setErrorMessage, setListingUrl, setManualCandidates,
      setManualConnectionIds, setSelectedConnectionId, setSellerAlias });
  }, []);
  useResetTraderaLinkModalState({ isOpen, productId: product.id, reset });
  useSelectedTraderaConnectionSync({
    availableConnections, isOpen, preferredConnectionId:
      readTrimmedString(preferredTraderaConnection?.connectionId), selectedConnectionId,
    setSelectedConnectionId });
  const handleClose = (): void => {
    if (linkMutation.isPending) return;
    onClose();
  };
  const handleSubmit = (): Promise<void> => submitTraderaLink({ linkMutation, listingUrl,
    manualConnectionRequired, onClose, onLinked, selectedConnectionId, setErrorMessage,
    setManualCandidates, setManualConnectionIds, setSellerAlias, toast });

  return { availableConnections, connectionOptions, errorMessage, handleClose, handleSubmit,
    isLoadingIntegrations, isSaveDisabled: isTraderaLinkSaveDisabled({ linkPending:
      linkMutation.isPending, listingUrl, manualConnectionRequired, selectedConnectionId,
      traderaConnections }), linkPending: linkMutation.isPending, listingUrl,
    manualConnectionRequired, selectedConnectionId, sellerAlias, setListingUrl,
    setSelectedConnectionId, traderaConnections };
};
