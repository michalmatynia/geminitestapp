'use client';

import { Mail, Plus } from 'lucide-react';
import React from 'react';
import { FormSection, FormField, Textarea, Button, Card, Badge } from '@/shared/ui';
import { useAdminFilemakerOrganizationEditPageContext } from '../../context/AdminFilemakerOrganizationEditPageContext';

export function OrganizationEmailsSection(): React.JSX.Element {
  const { 
    emails, 
    emailExtractionText, 
    setEmailExtractionText, 
    handleExtractEmails,
    updateSetting
  } = useAdminFilemakerOrganizationEditPageContext();

  return (
    <div className='space-y-6'>
      <FormSection title='Linked Emails' className='space-y-2 p-4'>
        {emails.length === 0 ? (
          <div className='text-xs text-gray-500'>No emails linked yet.</div>
        ) : (
          <div className='grid gap-2 sm:grid-cols-2'>
            {emails.map((email) => (
              <Card key={email.id} variant='subtle-compact' className='bg-card/20'>
                <div className='flex items-center justify-between gap-2 p-2'>
                  <div className='flex items-center gap-2 min-w-0'>
                    <Mail className='size-3.5 text-blue-300' />
                    <span className='truncate text-xs text-white'>{email.email}</span>
                  </div>
                  <Badge variant='outline' className='text-[10px] uppercase h-5'>{email.status}</Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </FormSection>

      <FormSection title='Extract & Link Emails' className='space-y-4 p-4'>
        <FormField label='Paste text containing emails'>
          <Textarea
            value={emailExtractionText}
            onChange={(e) => setEmailExtractionText(e.target.value)}
            placeholder='Paste document content, headers, or any text here...'
            className='min-h-[120px] text-xs font-mono'
          />
        </FormField>
        <div className='flex justify-end'>
          <Button
            type='button'
            size='sm'
            onClick={() => { void handleExtractEmails(); }}
            disabled={!emailExtractionText.trim() || updateSetting.isPending}
          >
            <Plus className='mr-1.5 size-3.5' />
            Extract Emails
          </Button>
        </div>
      </FormSection>
    </div>
  );
}
