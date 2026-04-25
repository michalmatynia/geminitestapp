import React, { startTransition } from 'react';

import {
  useAdminFilemakerPageActionsContext,
  useAdminFilemakerPageStateContext,
} from '../../context/AdminFilemakerPageContext';
import { formatTimestamp } from '../../pages/filemaker-page-utils';
import { formatFilemakerAddress } from '../../settings';
import { FilemakerEntityCardsSection } from '../shared/FilemakerEntityCardsSection';

import type { FilemakerPerson } from '../../types';

const formatOptionalPersonField = (value: string | null | undefined): string => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : 'n/a';
};

export function FilemakerPersonsSection(): React.JSX.Element {
  const { database, updateSetting, router } = useAdminFilemakerPageStateContext();
  const { handleDeletePerson } = useAdminFilemakerPageActionsContext();

  return (
    <FilemakerEntityCardsSection
      title='Persons'
      addLabel='Add Person'
      emptyTitle='No persons'
      emptyDescription='No persons added yet.'
      items={database.persons}
      renderMain={(person: FilemakerPerson) => (
        <>
          <div className='text-sm font-semibold text-white'>
            {person.firstName} {person.lastName}
          </div>
          <div className='text-xs text-gray-300'>{formatFilemakerAddress(person)}</div>
        </>
      )}
      renderMeta={(person: FilemakerPerson) => (
        <>
          <div className='text-[11px] text-gray-500'>
            NIP: {formatOptionalPersonField(person.nip)} | REGON:{' '}
            {formatOptionalPersonField(person.regon)}
          </div>
          <div className='text-[11px] text-gray-500'>
            Phones: {person.phoneNumbers.length > 0 ? person.phoneNumbers.join(', ') : 'n/a'}
          </div>
          <div className='text-[10px] text-gray-600'>
            Updated: {formatTimestamp(person.updatedAt)}
          </div>
        </>
      )}
      onAdd={() => {
        startTransition(() => {
          router.push('/admin/filemaker/persons/new');
        });
      }}
      onEdit={(person: FilemakerPerson): void => {
        startTransition(() => {
          router.push(`/admin/filemaker/persons/${encodeURIComponent(person.id)}`);
        });
      }}
      onDelete={(person: FilemakerPerson): void => {
        void handleDeletePerson(person.id);
      }}
      isPending={updateSetting.isPending}
    />
  );
}
