import type { TraderaProductLinkExistingCandidate } from '@/shared/contracts/integrations/listings';
import type { ProductWithImages } from '@/shared/contracts/products/product';

export type TraderaLinkModalProps = {
  isOpen: boolean;
  product: ProductWithImages;
  onClose: () => void;
  onLinked?: (() => void) | undefined;
};

export type TraderaConnectionOption = {
  integrationId: string;
  integrationName: string;
  integrationSlug: string;
  connectionId: string;
  connectionName: string;
};

export type CandidateConnectionMap = Record<string, TraderaProductLinkExistingCandidate>;

export type TraderaConnectionSelectOption = {
  value: string;
  label: string;
  description: string;
  group: string;
};

export type TraderaLinkModalController = {
  availableConnections: TraderaConnectionOption[];
  connectionOptions: TraderaConnectionSelectOption[];
  errorMessage: string | null;
  handleClose: () => void;
  handleSubmit: () => Promise<void>;
  isLoadingIntegrations: boolean;
  isSaveDisabled: boolean;
  linkPending: boolean;
  listingUrl: string;
  manualConnectionRequired: boolean;
  selectedConnectionId: string;
  sellerAlias: string | null;
  setListingUrl: (value: string) => void;
  setSelectedConnectionId: (value: string) => void;
  traderaConnections: TraderaConnectionOption[];
};
