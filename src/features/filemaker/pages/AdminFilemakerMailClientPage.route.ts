import type { MailClientDashboardScope } from './AdminFilemakerMailClientPage.helpers';

const DEFAULT_MAIL_CLIENT_DASHBOARD_PATH = '/admin/filemaker/mail-client';

const normalizeMailClientDashboardAccountId = (rawAccountId: string | null | undefined): string =>
  typeof rawAccountId === 'string' ? rawAccountId.trim() : '';

const parseMailClientDashboardScope = (rawScope: string | null): MailClientDashboardScope => {
  if (rawScope === 'attention' || rawScope === 'healthy') return rawScope;
  return 'all';
};

const buildMailClientDashboardHref = (input: {
  accountId?: string;
  pathname?: string;
  query: string;
  scope: MailClientDashboardScope;
}): string => {
  const pathname =
    typeof input.pathname === 'string' && input.pathname.trim() !== ''
      ? input.pathname
      : DEFAULT_MAIL_CLIENT_DASHBOARD_PATH;
  const search = new URLSearchParams();
  const nextAccountId = normalizeMailClientDashboardAccountId(input.accountId);
  const nextQuery = input.query.trim();

  if (input.scope !== 'all') search.set('scope', input.scope);
  if (nextAccountId !== '') search.set('accountId', nextAccountId);
  if (nextQuery !== '') search.set('query', nextQuery);

  const nextSearch = search.toString();
  return nextSearch !== '' ? `${pathname}?${nextSearch}` : pathname;
};

export {
  buildMailClientDashboardHref,
  normalizeMailClientDashboardAccountId,
  parseMailClientDashboardScope,
};
