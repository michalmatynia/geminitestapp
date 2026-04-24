const isJsonResponse = (response: Response): boolean =>
  (response.headers.get('content-type') ?? '').toLowerCase().includes('application/json');

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object';

const readStringField = (record: Record<string, unknown>, key: string): string | null => {
  const value = record[key];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const readJsonErrorMessage = async (response: Response): Promise<string | null> => {
  try {
    const body = (await response.json()) as unknown;
    if (!isRecord(body)) return null;
    return readStringField(body, 'error') ?? readStringField(body, 'message');
  } catch {
    return null;
  }
};

const readFilemakerMailErrorMessage = async (response: Response): Promise<string> => {
  const fallback = `Request failed (${response.status})`;
  if (!isJsonResponse(response)) return fallback;
  return (await readJsonErrorMessage(response)) ?? fallback;
};

export const fetchFilemakerMailJson = async <T,>(
  url: string,
  init?: RequestInit
): Promise<T> => {
  const response = await fetch(url, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new Error(await readFilemakerMailErrorMessage(response));
  }
  return (await response.json()) as T;
};

export type FilemakerMailSyncDispatchResponseLike = {
  accountId?: string;
  dispatchMode?: 'queued' | 'inline';
  jobId?: string | null;
  reason?: string;
  requestedAt?: string;
  result?: {
    fetchedMessageCount: number;
    lastSyncError?: string | null;
  } | null;
};

export const resolveFilemakerMailSyncNotice = (
  result: FilemakerMailSyncDispatchResponseLike
): { message: string; variant: 'success' | 'error' } => {
  const syncError =
    typeof result.result?.lastSyncError === 'string' && result.result.lastSyncError.trim() !== ''
      ? result.result.lastSyncError
      : null;
  if (syncError !== null) {
    return { message: syncError, variant: 'error' };
  }
  if (result.result) {
    return {
      message: `Mailbox sync finished. Messages fetched: ${result.result.fetchedMessageCount}.`,
      variant: 'success',
    };
  }
  return {
    message: result.dispatchMode === 'queued' ? 'Mailbox sync queued.' : 'Mailbox sync started.',
    variant: 'success',
  };
};

type FilemakerMailSelectionPanel =
  | 'account'
  | 'attention'
  | 'compose'
  | 'recent'
  | 'search'
  | 'settings';

type FilemakerMailSelectionHrefInput = {
  accountId?: string | null;
  mailboxPath?: string | null;
  panel?: FilemakerMailSelectionPanel | null;
  recentMailboxFilter?: string | null;
  recentUnreadOnly?: boolean;
  recentQuery?: string | null;
  recentCampaignId?: string | null;
  recentRunId?: string | null;
  recentDeliveryId?: string | null;
  searchQuery?: string | null;
};

const hasRouteValue = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.length > 0;

const normalizeMailSelectionPanel = (
  panel: FilemakerMailSelectionHrefInput['panel']
): Exclude<FilemakerMailSelectionPanel, 'account'> | null => {
  if (panel === 'account') return 'settings';
  return panel ?? null;
};

const setSearchParamIfValue = (
  search: URLSearchParams,
  key: string,
  value: string | null | undefined
): void => {
  if (hasRouteValue(value)) search.set(key, value);
};

const setRecentSelectionSearchParams = (
  search: URLSearchParams,
  input: FilemakerMailSelectionHrefInput,
  hasAccount: boolean
): void => {
  if (!hasAccount || input.panel !== 'recent') return;
  search.set('panel', 'recent');
  setSearchParamIfValue(search, 'recentMailbox', input.recentMailboxFilter);
  if (input.recentUnreadOnly === true) search.set('recentUnread', '1');
  setSearchParamIfValue(search, 'recentQuery', input.recentQuery);
  setSearchParamIfValue(search, 'campaignId', input.recentCampaignId);
  setSearchParamIfValue(search, 'runId', input.recentRunId);
  setSearchParamIfValue(search, 'deliveryId', input.recentDeliveryId);
};

const setSearchSelectionSearchParams = (
  search: URLSearchParams,
  input: FilemakerMailSelectionHrefInput,
  hasAccount: boolean
): void => {
  if (input.panel !== 'search') return;
  search.set('panel', 'search');
  if (hasAccount) search.set('accountId', input.accountId);
  setSearchParamIfValue(search, 'searchQuery', input.searchQuery);
};

export const buildFilemakerMailSelectionHref = (
  input: FilemakerMailSelectionHrefInput
): string => {
  const panel = normalizeMailSelectionPanel(input.panel);
  const search = new URLSearchParams();
  const hasAccount = hasRouteValue(input.accountId);
  if (panel !== 'attention' && panel !== 'search' && hasAccount) {
    search.set('accountId', input.accountId);
  }
  if (panel === null) setSearchParamIfValue(search, 'mailboxPath', input.mailboxPath);
  if (panel === 'attention') search.set('panel', 'attention');
  if (panel === 'settings') search.set('panel', 'settings');
  setRecentSelectionSearchParams(search, { ...input, panel }, hasAccount);
  setSearchSelectionSearchParams(search, { ...input, panel }, hasAccount);
  const nextSearch = search.toString();
  return nextSearch !== '' ? `/admin/filemaker/mail?${nextSearch}` : '/admin/filemaker/mail';
};
