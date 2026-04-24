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
    throw new Error(`Request failed (${response.status})`);
  }
  return (await response.json()) as T;
};

export const buildFilemakerMailSelectionHref = (input: {
  accountId?: string | null;
  mailboxPath?: string | null;
  panel?: 'account' | 'attention' | 'compose' | 'recent' | 'search' | 'settings' | null;
  recentMailboxFilter?: string | null;
  recentUnreadOnly?: boolean;
  recentQuery?: string | null;
  searchQuery?: string | null;
}): string => {
  const panel = input.panel === 'account' ? 'settings' : input.panel ?? null;
  const search = new URLSearchParams();
  if (panel !== 'attention' && panel !== 'search' && input.accountId) search.set('accountId', input.accountId);
  if (!panel && input.mailboxPath) search.set('mailboxPath', input.mailboxPath);
  if (panel === 'attention') search.set('panel', 'attention');
  if (panel === 'search') {
    search.set('panel', 'search');
    if (input.accountId) search.set('accountId', input.accountId);
  }
  if (input.accountId && panel === 'recent') search.set('panel', 'recent');
  if (panel === 'settings') search.set('panel', 'settings');
  if (input.accountId && panel === 'recent' && input.recentMailboxFilter) {
    search.set('recentMailbox', input.recentMailboxFilter);
  }
  if (input.accountId && panel === 'recent' && input.recentUnreadOnly) {
    search.set('recentUnread', '1');
  }
  if (input.accountId && panel === 'recent' && input.recentQuery) {
    search.set('recentQuery', input.recentQuery);
  }
  if (panel === 'search' && input.searchQuery) {
    search.set('searchQuery', input.searchQuery);
  }
  const nextSearch = search.toString();
  return nextSearch ? `/admin/filemaker/mail?${nextSearch}` : '/admin/filemaker/mail';
};
