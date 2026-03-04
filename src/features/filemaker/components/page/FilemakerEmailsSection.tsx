'use client';

import { Mail } from 'lucide-react';
import React from 'react';

import { FilemakerEntityCardsSection } from '../shared/FilemakerEntityCardsSection';
import { useAdminFilemakerPageContext } from '../../context/AdminFilemakerPageContext';
import { formatTimestamp } from '../../pages/filemaker-page-utils';

import type { FilemakerEmail } from '../../types';

export function FilemakerEmailsSection(): React.JSX.Element {
  const {
    database,
    openCreateEmail,
    handleStartEditEmail,
    handleDeleteEmail,
    updateSetting,
    emailLinkCountByEmailId,
  } = useAdminFilemakerPageContext();

  return (
    <FilemakerEntityCardsSection
      title='Emails'
      addLabel='Add Email'
      emptyTitle='No emails'
      emptyDescription='No emails added yet.'
      items={database.emails}
      renderMain={(email: FilemakerEmail) => (
        <div className='flex items-center gap-2 text-sm font-semibold text-white'>
          <Mail className='size-3.5 text-blue-200' />
          {email.email}
        </div>
      )}
      renderMeta={(email: FilemakerEmail) => (
        <>
          <div className='text-[11px] text-gray-500'>Status: {email.status}</div>
          <div className='text-[11px] text-gray-500'>
            Linked parties: {emailLinkCountByEmailId.get(email.id) ?? 0}
          </div>
          <div className='text-[10px] text-gray-600'>Updated: {formatTimestamp(email.updatedAt)}</div>
        </>
      )}
      onAdd={openCreateEmail}
      onEdit={handleStartEditEmail}
      onDelete={(email: FilemakerEmail): void => {
        void handleDeleteEmail(email.id);
      }}
      isPending={updateSetting.isPending}
    />
  );
}
