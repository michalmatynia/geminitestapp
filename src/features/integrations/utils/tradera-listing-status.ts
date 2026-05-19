const toRecord = (value: unknown): Record<string, unknown> =>
  (value !== null && typeof value === 'object' && !Array.isArray(value))
    ? (value as Record<string, unknown>)
    : {};

const readString = (value: unknown): string | null =>
  (typeof value === 'string' && value.trim().length > 0) ? value.trim() : null;

const normalizeStatus = (value: string | null | undefined): string =>
  (value ?? '').trim().toLowerCase();

export const resolvePendingTraderaExecutionAction = (
  marketplaceData: unknown
): string | null => {
  const traderaData = toRecord(toRecord(marketplaceData)['tradera']);
  const pendingExecution = toRecord(traderaData['pendingExecution']);
  const action = normalizeStatus(readString(pendingExecution['action']));
  return action.length > 0 ? action : null;
};

export const resolveLatestCheckedTraderaStatusFromMarketplaceData = (
  marketplaceData: unknown
): string | null => {
  const traderaData = toRecord(toRecord(marketplaceData)['tradera']);
  const lastExecution = toRecord(traderaData['lastExecution']);
  if (normalizeStatus(readString(lastExecution['action'])) !== 'check_status') {
    return null;
  }

  const metadata = toRecord(lastExecution['metadata']);
  const rawResult = toRecord(metadata['rawResult']);
  
  const checkedStatus = normalizeStatus(readString(metadata['checkedStatus']));
  if (checkedStatus.length > 0) return checkedStatus;

  const rawStatus = normalizeStatus(readString(rawResult['status']));
  if (rawStatus.length > 0) return rawStatus;

  return null;
};

export const resolveDisplayedTraderaListingStatus = ({
  status,
  marketplaceData,
}: {
  status: string | null | undefined;
  marketplaceData: unknown;
}): string | null => {
  const checkedStatus = resolveLatestCheckedTraderaStatusFromMarketplaceData(marketplaceData);
  if (checkedStatus !== null && checkedStatus.length > 0) {
    return checkedStatus;
  }

  const normalizedStatus = normalizeStatus(status);
  const pendingAction = resolvePendingTraderaExecutionAction(marketplaceData);
  if (normalizedStatus === 'queued_relist' && pendingAction !== null && pendingAction.length > 0 && pendingAction !== 'relist') {
    return 'queued';
  }

  return readString(status);
};
