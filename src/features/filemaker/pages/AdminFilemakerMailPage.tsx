'use client';

import React from 'react';

import { useToast } from '@/shared/ui';

import { FilemakerMailSidebar } from '../components/FilemakerMailSidebar';
import {
  buildFilemakerMailComposeHref as buildComposeHref,
} from '../components/FilemakerMailSidebar.helpers';
import { MailAccountSettingsSection } from './mail-page-sections/MailAccountSettingsSection';
import { MailboxesAttentionSection } from './mail-page-sections/MailboxesAttentionSection';
import { MailSearchSection } from './mail-page-sections/MailSearchSection';
import { MailThreadsSection } from './mail-page-sections/MailThreadsSection';
import { MailPageProvider, useMailPageContext } from './FilemakerMail.context';

function AdminFilemakerMailPageContent(): React.JSX.Element {
  const {
    accounts,
    setAccounts,
    attentionAccounts,
    selectedAccount,
    selectedAccountId,
    selectedFolder,
    selectedMailboxPath,
    selectedPanel,
    isNavigationLoading,
    isThreadsLoading,
    isSavingAccount,
    syncingAccountId,
    draft,
    setDraft,
    deepSearchQuery,
    setDeepSearchQuery,
    deepSearchResults,
    setDeepSearchResults,
    isSearching,
    folderAllowlistValue,
    setFolderAllowlistValue,
    query,
    setQuery,
    recentMailboxFilter,
    setRecentMailboxFilter,
    recentUnreadOnly,
    setRecentUnreadOnly,
    selectedAccountLabel,
    selectedFolderLabel,
    isAttentionPanel,
    isSearchPanel,
    isRecentPanel,
    visibleThreads,
    recentMailboxOptions,
    tableActions,
    columns,
    handleSaveAccount,
    handleSyncAccount,
    setSelection,
    router,
  } = useMailPageContext();

  return (
    <div className='page-section-compact grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]'>
      <FilemakerMailSidebar
        selectedAccountId={selectedAccountId}
        selectedMailboxPath={selectedMailboxPath}
        selectedPanel={selectedPanel}
        originPanel={isRecentPanel ? 'recent' : isSearchPanel ? 'search' : null}
        recentMailboxFilter={recentMailboxFilter}
        recentUnreadOnly={recentUnreadOnly}
        recentQuery={query}
        searchContextAccountId={isSearchPanel ? selectedAccountId : null}
        searchQuery={isSearchPanel ? deepSearchQuery : null}
        onRecentMailboxFilterChange={(value) => setRecentMailboxFilter(value)}
        onRecentQueryChange={(value) => setQuery(value)}
        onRecentUnreadOnlyChange={(value) => setRecentUnreadOnly(value)}
        onSelectAttention={() => {
          setSelection({ accountId: null, mailboxPath: null, panel: 'attention' });
        }}
        onSelectSearch={() => {
          setSelection({ accountId: selectedAccountId, mailboxPath: null, panel: 'search' });
        }}
        onNewMailbox={() => {
          setSelection({ accountId: null, mailboxPath: null, panel: null });
        }}
        onSelectAccount={(accountId) => {
          setSelection({ accountId, mailboxPath: null, panel: 'account' });
        }}
        onSelectAccountSettings={(accountId) => {
          setSelection({ accountId, mailboxPath: null, panel: 'settings' });
        }}
        onSelectFolder={({ accountId, mailboxPath }) => {
          setSelection({ accountId, mailboxPath, panel: null });
        }}
        onAccountUpdated={(account) => {
          setAccounts((current) =>
            current.map((entry) => (entry.id === account.id ? account : entry))
          );
        }}
      />

      {isAttentionPanel ? (
        <MailboxesAttentionSection
          attentionAccounts={attentionAccounts}
          onSelectSelection={setSelection}
        />
      ) : isSearchPanel ? (
        <MailSearchSection
          selectedAccount={selectedAccount}
          selectedAccountId={selectedAccountId}
          deepSearchQuery={deepSearchQuery}
          onDeepSearchQueryChange={setDeepSearchQuery}
          deepSearchResults={deepSearchResults}
          isSearching={isSearching}
          onClearSearch={() => {
            setDeepSearchQuery('');
            setDeepSearchResults(null);
          }}
          onOpenThread={(href) => router.push(href)}
        />
      ) : selectedFolder || isRecentPanel ? (
        <MailThreadsSection />
      ) : (
        <MailAccountSettingsSection
          selectedAccountLabel={selectedAccountLabel}
          selectedAccount={selectedAccount}
          syncingAccountId={syncingAccountId}
          handleSyncAccount={handleSyncAccount}
          draft={draft}
          setDraft={setDraft}
          folderAllowlistValue={folderAllowlistValue}
          setFolderAllowlistValue={setFolderAllowlistValue}
          handleSaveAccount={handleSaveAccount}
          isSavingAccount={isSavingAccount}
          onComposeFromAccount={(accountId) => {
            router.push(buildComposeHref({ accountId }));
          }}
        />
      )}
    </div>
  );
}

export function AdminFilemakerMailPage(): React.JSX.Element {
  return (
    <MailPageProvider>
      <AdminFilemakerMailPageContent />
    </MailPageProvider>
  );
}
