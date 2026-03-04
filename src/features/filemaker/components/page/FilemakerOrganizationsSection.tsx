'use client';

import React from 'react';

import { FilemakerEntityCardsSection } from '../shared/FilemakerEntityCardsSection';
import { useAdminFilemakerPageContext } from '../../context/AdminFilemakerPageContext';
import { formatFilemakerAddress } from '../../settings';
import { formatTimestamp } from '../../pages/filemaker-page-utils';

import type { FilemakerOrganization } from '../../types';

export function FilemakerOrganizationsSection(): React.JSX.Element {
  const { database, openCreateOrg, handleStartEditOrg, handleDeleteOrganization, updateSetting } =
    useAdminFilemakerPageContext();

  return (
    <FilemakerEntityCardsSection
      title='Organizations'
      addLabel='Add Organization'
      emptyTitle='No organizations'
      emptyDescription='No organizations added yet.'
      items={database.organizations}
      renderMain={(organization: FilemakerOrganization) => (
        <>
          <div className='text-sm font-semibold text-white'>{organization.name}</div>
          <div className='text-xs text-gray-300'>{formatFilemakerAddress(organization)}</div>
        </>
      )}
      renderMeta={(organization: FilemakerOrganization) => (
        <>
          <div className='text-[11px] text-gray-500'>
            NIP: {organization.taxId || 'n/a'} | KRS: {organization.krs || 'n/a'}
          </div>
          <div className='text-[10px] text-gray-600'>
            Updated: {formatTimestamp(organization.updatedAt)}
          </div>
        </>
      )}
      onAdd={openCreateOrg}
      onEdit={handleStartEditOrg}
      onDelete={(organization: FilemakerOrganization): void => {
        void handleDeleteOrganization(organization.id);
      }}
      isPending={updateSetting.isPending}
    />
  );
}
