import {
  isTraderaIntegrationSlug,
} from '@/features/integrations/product-integrations-adapter';
import type { IntegrationWithConnections } from '@/shared/contracts/integrations/domain';
import type { TraderaProductLinkExistingCandidate } from '@/shared/contracts/integrations/listings';
import { ApiError } from '@/shared/lib/api-client';

import type {
  CandidateConnectionMap,
  TraderaConnectionOption,
  TraderaConnectionSelectOption,
} from './TraderaLinkModal.types';

type AmbiguousConnectionState = {
  candidateIds: string[];
  candidates: CandidateConnectionMap;
  errorMessage: string;
  sellerAlias: string | null;
};

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export const readTrimmedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const readNullableTrimmedString = (value: unknown): string | null => {
  const trimmed = readTrimmedString(value);
  return trimmed.length > 0 ? trimmed : null;
};

const parseCandidateConnection = (
  entry: unknown
): TraderaProductLinkExistingCandidate | null => {
  if (!isObjectRecord(entry)) return null;
  const connectionId = readTrimmedString(entry['connectionId']);
  if (connectionId.length === 0) return null;
  return {
    integrationId: readTrimmedString(entry['integrationId']),
    integrationName: readTrimmedString(entry['integrationName']),
    integrationSlug: readTrimmedString(entry['integrationSlug']),
    connectionId,
    connectionName: readTrimmedString(entry['connectionName']),
    connectionUsername: readNullableTrimmedString(entry['connectionUsername']),
  };
};

export const toCandidateConnectionMap = (value: unknown): CandidateConnectionMap => {
  if (!Array.isArray(value)) return {};
  return Object.fromEntries(
    value
      .map((entry: unknown): TraderaProductLinkExistingCandidate | null =>
        parseCandidateConnection(entry)
      )
      .filter(
        (candidate): candidate is TraderaProductLinkExistingCandidate => candidate !== null
      )
      .map((candidate: TraderaProductLinkExistingCandidate) => [
        candidate.connectionId,
        candidate,
      ])
  );
};

export const flattenTraderaConnections = (
  integrations: IntegrationWithConnections[]
): TraderaConnectionOption[] =>
  integrations.flatMap((integration: IntegrationWithConnections): TraderaConnectionOption[] =>
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

export const readApiErrorDetails = (error: unknown): Record<string, unknown> | null => {
  if (!(error instanceof ApiError)) return null;
  if (!isObjectRecord(error.payload)) return null;
  const details = error.payload['details'];
  return isObjectRecord(details) ? details : null;
};

export const resolveAvailableConnections = ({
  manualConnectionIds,
  traderaConnections,
}: {
  manualConnectionIds: string[] | null;
  traderaConnections: TraderaConnectionOption[];
}): TraderaConnectionOption[] => {
  if (manualConnectionIds === null) return traderaConnections;
  const allowedIds = new Set(manualConnectionIds);
  return traderaConnections.filter((connection: TraderaConnectionOption): boolean =>
    allowedIds.has(connection.connectionId)
  );
};

export const createConnectionOptions = ({
  availableConnections,
  manualCandidates,
}: {
  availableConnections: TraderaConnectionOption[];
  manualCandidates: CandidateConnectionMap;
}): TraderaConnectionSelectOption[] =>
  availableConnections.map((connection: TraderaConnectionOption): TraderaConnectionSelectOption => {
    const candidate = manualCandidates[connection.connectionId];
    const username = candidate?.connectionUsername ?? null;
    const usernameSuffix = username !== null && username.length > 0 ? ` · ${username}` : '';
    return {
      value: connection.connectionId,
      label: connection.connectionName,
      description: `${connection.integrationName}${usernameSuffix}`,
      group: connection.integrationName,
    };
  });

export const resolveSelectedConnectionId = ({
  availableConnections,
  preferredConnectionId,
  selectedConnectionId,
}: {
  availableConnections: TraderaConnectionOption[];
  preferredConnectionId: string;
  selectedConnectionId: string;
}): string => {
  if (availableConnections.length === 0) return '';
  const selectedExists = availableConnections.some(
    (connection: TraderaConnectionOption): boolean =>
      connection.connectionId === selectedConnectionId
  );
  if (selectedConnectionId.length > 0 && selectedExists) return selectedConnectionId;
  const preferredExists = availableConnections.some(
    (connection: TraderaConnectionOption): boolean =>
      connection.connectionId === preferredConnectionId
  );
  if (preferredConnectionId.length > 0 && preferredExists) return preferredConnectionId;
  return availableConnections[0]?.connectionId ?? '';
};

export const isTraderaLinkSaveDisabled = ({
  linkPending,
  listingUrl,
  manualConnectionRequired,
  selectedConnectionId,
  traderaConnections,
}: {
  linkPending: boolean;
  listingUrl: string;
  manualConnectionRequired: boolean;
  selectedConnectionId: string;
  traderaConnections: TraderaConnectionOption[];
}): boolean =>
  linkPending ||
  listingUrl.trim().length === 0 ||
  traderaConnections.length === 0 ||
  (manualConnectionRequired && selectedConnectionId.length === 0);

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

export const resolveAmbiguousConnectionState = (
  error: unknown
): AmbiguousConnectionState | null => {
  const details = readApiErrorDetails(error);
  const reason = readTrimmedString(details?.['reason']);
  const candidates = toCandidateConnectionMap(details?.['candidateConnections']);
  const candidateIds = Object.keys(candidates);
  if (reason !== 'ambiguous_connection' || candidateIds.length === 0) return null;
  return {
    candidateIds,
    candidates,
    sellerAlias: readNullableTrimmedString(details?.['sellerAlias']),
    errorMessage: getErrorMessage(
      error,
      'Could not infer the Tradera connection from this listing URL.'
    ),
  };
};

export const validateTraderaLinkRequest = ({
  listingUrl,
  manualConnectionRequired,
  selectedConnectionId,
}: {
  listingUrl: string;
  manualConnectionRequired: boolean;
  selectedConnectionId: string;
}): string | null => {
  if (listingUrl.trim().length === 0) return 'Tradera listing URL is required.';
  if (manualConnectionRequired && selectedConnectionId.length === 0) {
    return 'Choose the Tradera connection that owns this listing.';
  }
  return null;
};

export const getTraderaLinkErrorMessage = (error: unknown): string =>
  getErrorMessage(error, 'Failed to link the existing Tradera listing.');
