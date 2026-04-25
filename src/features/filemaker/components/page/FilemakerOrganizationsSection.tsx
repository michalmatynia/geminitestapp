import React, { startTransition } from 'react';

import {
  useAdminFilemakerPageActionsContext,
  useAdminFilemakerPageStateContext,
} from '../../context/AdminFilemakerPageContext';
import { formatTimestamp } from '../../pages/filemaker-page-utils';
import { formatFilemakerAddress } from '../../settings';
import { FilemakerEntityCardsSection } from '../shared/FilemakerEntityCardsSection';

import type { FilemakerOrganization } from '../../types';

const formatOptionalOrganizationField = (value: string | null | undefined): string => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : 'n/a';
};

export function FilemakerOrganizationsSection(): React.JSX.Element {
  const { database, updateSetting, router } = useAdminFilemakerPageStateContext();
  const { handleDeleteOrganization } = useAdminFilemakerPageActionsContext();

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
          {(organization.tradingName?.trim() ?? '').length > 0 ? (
            <div className='text-xs italic text-gray-400'>{organization.tradingName}</div>
          ) : null}
          <div className='text-xs text-gray-300'>{formatFilemakerAddress(organization)}</div>
        </>
      )}
      renderMeta={(organization: FilemakerOrganization) => (
        <>
          <div className='text-[11px] text-gray-500'>
            NIP: {formatOptionalOrganizationField(organization.taxId)} | KRS:{' '}
            {formatOptionalOrganizationField(organization.krs)}
          </div>
          <div className='text-[10px] text-gray-600'>
            Updated: {formatTimestamp(organization.updatedAt)}
          </div>
        </>
      )}
      onAdd={() => {
        startTransition(() => {
          router.push('/admin/filemaker/organizations/new');
        });
      }}
      onEdit={(organization: FilemakerOrganization): void => {
        startTransition(() => {
          router.push(`/admin/filemaker/organizations/${encodeURIComponent(organization.id)}`);
        });
      }}
      onDelete={(organization: FilemakerOrganization): void => {
        void handleDeleteOrganization(organization.id);
      }}
      isPending={updateSetting.isPending}
    />
  );
}
