const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const readString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const normalizeStatus = (value: string | null | undefined): string =>
  (value ?? '').trim().toLowerCase();

export const resolvePendingTraderaExecutionAction = (
  marketplaceData: unknown
): string | null => {
  const traderaData = toRecord(toRecord(marketplaceData)['tradera']);
  const pendingExecution = toRecord(traderaData['pendingExecution']);
  return normalizeStatus(readString(pendingExecution['action'])) || null;
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
  return (
    normalizeStatus(readString(metadata['checkedStatus'])) ||
    normalizeStatus(readString(rawResult['status'])) ||
    null
  );
};

export const resolveDisplayedTraderaListingStatus = ({
  status,
  marketplaceData,
}: {
  status: string | null | undefined;
  marketplaceData: unknown;
}): string | null => {
  const checkedStatus = resolveLatestCheckedTraderaStatusFromMarketplaceData(marketplaceData);
  if (checkedStatus) {
    return checkedStatus;
  }

  const normalizedStatus = normalizeStatus(status);
  const pendingAction = resolvePendingTraderaExecutionAction(marketplaceData);
  if (normalizedStatus === 'queued_relist' && pendingAction && pendingAction !== 'relist') {
    return 'queued';
  }

  return readString(status);
};
