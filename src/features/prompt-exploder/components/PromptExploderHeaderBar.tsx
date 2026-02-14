'use client';

import { RefreshCcw, Settings2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React from 'react';

import { SectionHeader, UnifiedButton } from '@/shared/ui';

import { useDocumentActions } from '../context/hooks/useDocument';

export function PromptExploderHeaderBar(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams?.get('returnTo') || '/admin/image-studio';
  const { handleReloadFromStudio } = useDocumentActions();

  return (
    <SectionHeader
      eyebrow='AI · Prompt Exploder'
      title='Prompt Exploder'
      description='Explode prompts into typed segments, edit structure, and reassemble with references intact.'
      actions={
        <div className='flex flex-wrap items-center gap-2'>
          <UnifiedButton
            variant='outline'
            size='sm'
            onClick={handleReloadFromStudio}
          >
            <RefreshCcw className='mr-2 size-4' />
            Reload Studio Draft
          </UnifiedButton>
          <UnifiedButton
            variant='outline'
            size='sm'
            onClick={() => {
              router.push('/admin/prompt-exploder/settings');
            }}
          >
            <Settings2 className='mr-2 size-4' />
            Settings
          </UnifiedButton>
          <UnifiedButton
            variant='outline'
            size='sm'
            onClick={() => {
              router.push(returnTo);
            }}
          >
            Back to Image Studio
          </UnifiedButton>
        </div>
      }
    />
  );
}
