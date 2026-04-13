'use client';

import React, { startTransition } from 'react';

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
    isAttentionPanel,
    isSearchPanel,
    isRecentPanel,
    selectedFolder,
  } = useMailPageContext();

  return (
    <div className='page-section-compact grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]'>
      <FilemakerMailSidebar />

      {isAttentionPanel ? (
        <MailboxesAttentionSection />
      ) : isSearchPanel ? (
        <MailSearchSection />
      ) : selectedFolder || isRecentPanel ? (
        <MailThreadsSection />
      ) : (
        <MailAccountSettingsSection />
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
