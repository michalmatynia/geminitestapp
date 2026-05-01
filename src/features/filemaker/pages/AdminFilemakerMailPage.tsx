'use client';

import React from 'react';

import { FilemakerMailSidebar } from '../components/FilemakerMailSidebar';
import { MailAccountSettingsSection } from './mail-page-sections/MailAccountSettingsSection';
import { MailboxesAttentionSection } from './mail-page-sections/MailboxesAttentionSection';
import { MailSearchSection } from './mail-page-sections/MailSearchSection';
import { MailThreadsSection } from './mail-page-sections/MailThreadsSection';
import { MailPageProvider, useMailPageContext } from './FilemakerMail.context';

function AdminFilemakerMailPageContent(): React.JSX.Element {
  const {
    isAttentionPanel,
    isSearchPanel,
    isRecentPanel,
    selectedFolder,
  } = useMailPageContext();
  let content: React.JSX.Element;
  if (isAttentionPanel) {
    content = <MailboxesAttentionSection />;
  } else if (isSearchPanel) {
    content = <MailSearchSection />;
  } else if (selectedFolder !== null || isRecentPanel) {
    content = <MailThreadsSection />;
  } else {
    content = <MailAccountSettingsSection />;
  }

  return (
    <div className='page-section-compact grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]'>
      <FilemakerMailSidebar />
      {content}
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
