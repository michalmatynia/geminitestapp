'use client';

import { Edit2, Plus, Trash2 } from 'lucide-react';
import React from 'react';

import { Button, FormSection, Card, EmptyState } from '@/shared/ui';
import { useAdminFilemakerPageContext } from '../../context/AdminFilemakerPageContext';
import { formatFilemakerAddress } from '../../settings';
import type { FilemakerPerson } from '../../types';

const formatTimestamp = (value: string | null | undefined): string => {
  if (!value) return 'Unknown';
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return 'Unknown';
  return new Date(parsed).toLocaleString();
};

export function FilemakerPersonsSection(): React.JSX.Element {
  const { database, openCreatePerson, handleStartEditPerson, handleDeletePerson, updateSetting } =
    useAdminFilemakerPageContext();

  const { persons } = database;

  return (
    <FormSection
      title='Persons'
      className='space-y-4 p-4'
      actions={
        <Button
          type='button'
          onClick={openCreatePerson}
          disabled={updateSetting.isPending}
          className='h-8'
        >
          <Plus className='mr-1.5 size-3.5' />
          Add Person
        </Button>
      }
    >
      <div className='space-y-2'>
        {persons.length === 0 ? (
          <EmptyState
            title='No persons'
            description='No persons added yet.'
            variant='compact'
            className='bg-card/20 border-dashed border-border/60 py-8'
          />
        ) : (
          persons.map((person: FilemakerPerson) => (
            <Card
              key={person.id}
              variant='subtle-compact'
              padding='md'
              className='border-border/60 bg-card/35'
            >
              <div className='flex flex-wrap items-start justify-between gap-3'>
                <div className='min-w-0 flex-1 space-y-1'>
                  <div className='text-sm font-semibold text-white'>
                    {person.firstName} {person.lastName}
                  </div>
                  <div className='text-xs text-gray-300'>{formatFilemakerAddress(person)}</div>
                  <div className='text-[11px] text-gray-500'>
                    NIP: {person.nip || 'n/a'} | REGON: {person.regon || 'n/a'}
                  </div>
                  <div className='text-[11px] text-gray-500'>
                    Phones:{' '}
                    {person.phoneNumbers.length > 0 ? person.phoneNumbers.join(', ') : 'n/a'}
                  </div>
                  <div className='text-[10px] text-gray-600'>
                    Updated: {formatTimestamp(person.updatedAt ?? undefined)}
                  </div>
                </div>
                <div className='flex items-center gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    className='h-8 w-8 p-0'
                    onClick={(): void => {
                      handleStartEditPerson(person);
                    }}
                  >
                    <Edit2 className='size-3.5' />
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    className='h-8 w-8 p-0 text-red-200 hover:text-red-100'
                    onClick={(): void => {
                      void handleDeletePerson(person.id);
                    }}
                  >
                    <Trash2 className='size-3.5' />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </FormSection>
  );
}
