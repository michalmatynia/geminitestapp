import { Mail, Plus } from 'lucide-react';
import React from 'react';

import type { FilemakerEmail } from '@/features/filemaker/types';
import { Badge, Button, Card, Textarea } from '@/shared/ui/primitives.public';
import { FormField, FormSection } from '@/shared/ui/forms-and-actions.public';


export interface FilemakerLinkedEmailsSectionProps {
  emails: FilemakerEmail[];
  emailExtractionText: string;
  onEmailExtractionTextChange: (value: string) => void;
  onExtractEmails: () => void | Promise<void>;
  isSaving: boolean;
}

export function FilemakerLinkedEmailsSection(
  props: FilemakerLinkedEmailsSectionProps
): React.JSX.Element {
  const { emails, emailExtractionText, onEmailExtractionTextChange, onExtractEmails, isSaving } =
    props;

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
                  <div className='flex min-w-0 items-center gap-2'>
                    <Mail className='size-3.5 text-blue-300' />
                    <span className='truncate text-xs text-white'>{email.email}</span>
                  </div>
                  <Badge variant='outline' className='h-5 text-[10px] uppercase'>
                    {email.status}
                  </Badge>
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
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
              onEmailExtractionTextChange(event.target.value);
            }}
            placeholder='Paste document content, headers, or any text here...'
            className='min-h-[120px] text-xs font-mono'
           aria-label='Paste document content, headers, or any text here...' title='Paste document content, headers, or any text here...'/>
        </FormField>
        <div className='flex justify-end'>
          <Button
            type='button'
            size='sm'
            onClick={() => {
              void onExtractEmails();
            }}
            disabled={emailExtractionText.trim().length === 0 || isSaving}
          >
            <Plus className='mr-1.5 size-3.5' />
            Extract Emails
          </Button>
        </div>
      </FormSection>
    </div>
  );
}
