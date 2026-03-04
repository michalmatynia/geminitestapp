'use client';

import React from 'react';

import { FilemakerEntityCardsSection } from '../shared/FilemakerEntityCardsSection';
import { useAdminFilemakerPageContext } from '../../context/AdminFilemakerPageContext';
import { formatFilemakerAddress } from '../../settings';
import { formatTimestamp } from '../../pages/filemaker-page-utils';

import type { FilemakerPerson } from '../../types';

export function FilemakerPersonsSection(): React.JSX.Element {
  const { database, openCreatePerson, handleStartEditPerson, handleDeletePerson, updateSetting } =
    useAdminFilemakerPageContext();

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
            NIP: {person.nip || 'n/a'} | REGON: {person.regon || 'n/a'}
          </div>
          <div className='text-[11px] text-gray-500'>
            Phones: {person.phoneNumbers.length > 0 ? person.phoneNumbers.join(', ') : 'n/a'}
          </div>
          <div className='text-[10px] text-gray-600'>Updated: {formatTimestamp(person.updatedAt)}</div>
        </>
      )}
      onAdd={openCreatePerson}
      onEdit={handleStartEditPerson}
      onDelete={(person: FilemakerPerson): void => {
        void handleDeletePerson(person.id);
      }}
      isPending={updateSetting.isPending}
    />
  );
}
