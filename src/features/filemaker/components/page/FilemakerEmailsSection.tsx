'use client';

import { Edit2, Mail, Plus, Trash2 } from 'lucide-react';
import React from 'react';

import {
  Button,
  FormSection,
  Card,
  EmptyState,
} from '@/shared/ui';
import { useAdminFilemakerPageContext } from '../../context/AdminFilemakerPageContext';
import type { FilemakerEmail } from '../../types';

const formatTimestamp = (value: string | null | undefined): string => {
  if (!value) return 'Unknown';
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return 'Unknown';
  return new Date(parsed).toLocaleString();
};

export function FilemakerEmailsSection(): React.JSX.Element {
  const {
    database,
    openCreateEmail,
    handleStartEditEmail,
    handleDeleteEmail,
    updateSetting,
    emailLinkCountByEmailId,
  } = useAdminFilemakerPageContext();

  const { emails } = database;

  return (
    <FormSection
      title='Emails'
      className='space-y-4 p-4'
      actions={(
        <Button
          type='button'
          onClick={openCreateEmail}
          disabled={updateSetting.isPending}
          className='h-8'
        >
          <Plus className='mr-1.5 size-3.5' />
          Add Email
        </Button>
      )}
    >
      <div className='space-y-2'>
        {emails.length === 0 ? (
          <EmptyState
            title='No emails'
            description='No emails added yet.'
            variant='compact'
            className='bg-card/20 border-dashed border-border/60 py-8'
          />
        ) : (
          emails.map((email: FilemakerEmail) => (
            <Card key={email.id} variant='subtle-compact' padding='md' className='border-border/60 bg-card/35'>
              <div className='flex flex-wrap items-start justify-between gap-3'>
                <div className='min-w-0 flex-1 space-y-1'>
                  <div className='flex items-center gap-2 text-sm font-semibold text-white'>
                    <Mail className='size-3.5 text-blue-200' />
                    {email.email}
                  </div>
                  <div className='text-[11px] text-gray-500'>
                    Status: {email.status}
                  </div>
                  <div className='text-[11px] text-gray-500'>
                    Linked parties: {emailLinkCountByEmailId.get(email.id) ?? 0}
                  </div>
                  <div className='text-[10px] text-gray-600'>
                    Updated: {formatTimestamp(email.updatedAt ?? undefined)}
                  </div>
                </div>
                <div className='flex items-center gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    className='h-8 w-8 p-0'
                    onClick={(): void => {
                      handleStartEditEmail(email);
                    }}
                  >
                    <Edit2 className='size-3.5' />
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    className='h-8 w-8 p-0 text-red-200 hover:text-red-100'
                    onClick={(): void => {
                      void handleDeleteEmail(email.id);
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
