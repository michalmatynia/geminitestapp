'use client';

import React from 'react';
import { RefreshCcw, Settings2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  AdminAiEyebrow,
  Alert,
  Button,
  SectionHeader,
} from '@/shared/ui';

import {
  PromptExploderDocsTooltipSwitchFromRuntime,
  PromptExploderDocsTooltipSwitchRuntimeContext,
} from '../../components/PromptExploderDocsTooltipSwitch';
import { useDocumentActions } from '../../context/DocumentContext';


type PromptExploderErrorBoundaryState = {
  hasError: boolean;
  errorMessage: string | null;
};

export class PromptExploderErrorBoundary extends React.Component<
  { children: React.ReactNode },
  PromptExploderErrorBoundaryState
> {
  override state: PromptExploderErrorBoundaryState = {
    hasError: false,
    errorMessage: null,
  };

  static getDerivedStateFromError(error: unknown): PromptExploderErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : 'Unknown Prompt Exploder error.',
    };
  }

  override render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className='space-y-3'>
        <Alert variant='error'>
          Prompt Exploder encountered a runtime error: {this.state.errorMessage ?? 'Unknown error'}
        </Alert>
        <Button
          type='button'
          variant='outline'
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.location.reload();
            }
          }}
        >
          Reload Prompt Exploder
        </Button>
      </div>
    );
  }
}

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
  const docsTooltipRuntimeValue = React.useMemo(
    () => ({ docsTooltipsEnabled, onDocsTooltipsChange }),
    [docsTooltipsEnabled, onDocsTooltipsChange]
  );

  return (
    <PromptExploderDocsTooltipSwitchRuntimeContext.Provider value={docsTooltipRuntimeValue}>
      <SectionHeader
        eyebrow={<AdminAiEyebrow section='Prompt Exploder' />}
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
