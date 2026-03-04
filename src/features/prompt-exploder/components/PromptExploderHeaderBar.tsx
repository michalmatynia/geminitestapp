'use client';

import { RefreshCcw, Settings2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useMemo } from 'react';

import { SectionHeader, Button } from '@/shared/ui';

import {
  PromptExploderDocsTooltipSwitchFromRuntime,
  PromptExploderDocsTooltipSwitchRuntimeContext,
} from './PromptExploderDocsTooltipSwitch';
import { useDocumentActions } from '../context/hooks/useDocument';

export function PromptExploderHeaderBar({
  docsTooltipsEnabled,
  onDocsTooltipsChange,
}: {
  docsTooltipsEnabled: boolean;
  onDocsTooltipsChange: (enabled: boolean) => void;
}): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams?.get('returnTo') || '/admin/image-studio';
  const returnTarget = returnTo.startsWith('/admin/case-resolver')
    ? 'case-resolver'
    : 'image-studio';
  const { handleReloadFromStudio } = useDocumentActions();
  const docsTooltipRuntimeValue = useMemo(
    () => ({ docsTooltipsEnabled, onDocsTooltipsChange }),
    [docsTooltipsEnabled, onDocsTooltipsChange]
  );

  return (
    <PromptExploderDocsTooltipSwitchRuntimeContext.Provider value={docsTooltipRuntimeValue}>
      <SectionHeader
        eyebrow='AI · Prompt Exploder'
        title='Prompt Exploder'
        description='Explode prompts into typed segments, edit structure, and reassemble with references intact.'
        actions={
          <div className='flex flex-wrap items-center gap-2'>
            <Button
              size='xs'
              variant='outline'
              onClick={handleReloadFromStudio}
              data-doc-id='reload_incoming_draft'
            >
              <RefreshCcw className='mr-2 size-4' />
              Reload Incoming Draft
            </Button>
            <Button
              size='xs'
              variant='outline'
              onClick={() => {
                router.push('/admin/prompt-exploder/settings');
              }}
              data-doc-id='open_settings'
            >
              <Settings2 className='mr-2 size-4' />
              Settings
            </Button>
            <Button
              size='xs'
              variant='outline'
              onClick={() => {
                router.push(returnTo);
              }}
              data-doc-id='back_to_source'
            >
              {returnTarget === 'case-resolver' ? 'Back to Case Resolver' : 'Back to Image Studio'}
            </Button>
            <PromptExploderDocsTooltipSwitchFromRuntime />
          </div>
        }
      />
    </PromptExploderDocsTooltipSwitchRuntimeContext.Provider>
  );
}
