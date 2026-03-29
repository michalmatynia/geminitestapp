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
  panel?: 'account' | 'attention' | 'compose' | 'recent' | 'settings' | null;
  recentMailboxFilter?: string | null;
  recentUnreadOnly?: boolean;
  recentQuery?: string | null;
}): string => {
  const search = new URLSearchParams();
  if (input.panel !== 'attention' && input.accountId) search.set('accountId', input.accountId);
  if (input.panel !== 'attention' && input.mailboxPath) search.set('mailboxPath', input.mailboxPath);
  if (input.panel === 'attention') search.set('panel', 'attention');
  if (input.accountId && input.panel === 'recent') search.set('panel', 'recent');
  if (input.accountId && input.panel === 'settings') search.set('panel', 'settings');
  if (input.accountId && input.recentMailboxFilter) {
    search.set('recentMailbox', input.recentMailboxFilter);
  }
  if (input.accountId && input.recentUnreadOnly) {
    search.set('recentUnread', '1');
  }
  if (input.accountId && input.panel === 'recent' && input.recentQuery) {
    search.set('recentQuery', input.recentQuery);
  }
  const nextSearch = search.toString();
  return nextSearch ? `/admin/filemaker/mail?${nextSearch}` : '/admin/filemaker/mail';
};
