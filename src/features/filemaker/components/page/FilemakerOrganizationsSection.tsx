'use client';

import React from 'react';

import {
  useAdminFilemakerPageActionsContext,
  useAdminFilemakerPageStateContext,
} from '../../context/AdminFilemakerPageContext';
import { formatTimestamp } from '../../pages/filemaker-page-utils';
import { formatFilemakerAddress } from '../../settings';
import { FilemakerEntityCardsSection } from '../shared/FilemakerEntityCardsSection';

import type { FilemakerOrganization } from '../../types';

export function FilemakerOrganizationsSection(): React.JSX.Element {
  const { database, updateSetting } = useAdminFilemakerPageStateContext();
  const { openCreateOrg, handleStartEditOrg, handleDeleteOrganization } =
    useAdminFilemakerPageActionsContext();

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
