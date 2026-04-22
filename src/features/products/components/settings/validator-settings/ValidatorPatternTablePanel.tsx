'use client';

import { Plus } from 'lucide-react';
import React from 'react';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { FormSection } from '@/shared/ui/form-section';
import { LoadingState } from '@/shared/ui/LoadingState';
import { useToast } from '@/shared/ui/toast';

import { buildFullValidatorDocumentationClipboardText } from './validator-documentation-clipboard';
import { ValidatorPatternImportModal } from './ValidatorPatternImportModal';
import { ValidatorPatternTree } from './ValidatorPatternTree';
import { useValidatorSettingsContext } from './ValidatorSettingsContext';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

/**
 * Validator docs: see docs/validator/function-reference.md#ui.validatorpatterntablepanel
 */
export function ValidatorPatternTablePanel(): React.JSX.Element {
  const { toast } = useToast();
  const {
    summary,
    loading,
    patterns,
    openCreate,
    handleCreateStarGaterProducerPattern,
  } = useValidatorSettingsContext();
  const handleCopyFullDocumentation = async (): Promise<void> => {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      toast('Clipboard API is not available in this browser.', { variant: 'error' });
      return;
    }
    try {
      await navigator.clipboard.writeText(buildFullValidatorDocumentationClipboardText());
      toast('Full validator documentation copied (including JSON snippets).', {
        variant: 'success',
      });
    } catch (error) {
      logClientError(error);
      toast('Failed to copy full validator documentation.', { variant: 'error' });
    }
  };

  const [showImportModal, setShowImportModal] = React.useState(false);

  return (
    <FormSection
      title='Regex Pattern Table'
      description={`Active patterns: ${summary.enabled}/${summary.total}`}
      variant='subtle'
      className='p-4'
    >
      <div className='space-y-4'>
        <div
          data-testid='validator-pattern-actions'
          className='flex w-full flex-wrap items-center gap-2'
        >
          <Button
            type='button'
            onClick={() => setShowImportModal(true)}
            variant='outline'
            className='border-fuchsia-500/40 text-fuchsia-200 hover:bg-fuchsia-500/10'
          >
            Import JSON
          </Button>
          <Button
            type='button'
            onClick={() => {
              void handleCopyFullDocumentation();
            }}
            variant='outline'
            className='border-sky-500/40 text-sky-200 hover:bg-sky-500/10'
            title='Copy all validation docs sections including JSON snippets'
          >
            Copy Full Validation Docs
          </Button>
          <Button
            type='button'
            onClick={() => {
              void handleCreateStarGaterProducerPattern();
            }}
            variant='outline'
            className='border-amber-500/40 text-amber-200 hover:bg-amber-500/10'
          >
            Producer: StarGater.net
          </Button>
          <Button
            onClick={() => openCreate()}
            variant='default'
          >
            <Plus className='mr-2 size-4' />
            Add Pattern
          </Button>
        </div>
        {loading ? (
          <LoadingState
            message='Loading validator patterns...'
            className='py-8 border border-dashed'
          />
        ) : patterns.length === 0 ? (
          <EmptyState
            title='No validator patterns'
            description='Create your first regex rule to validate product names, descriptions, and SKU.'
            action={
              <Button onClick={() => openCreate()} variant='outline'>
                <Plus className='mr-2 size-4' />
                Create Pattern
              </Button>
            }
          />
        ) : (
          <ValidatorPatternTree />
        )}
      </div>
      <ValidatorPatternImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
      />
    </FormSection>
  );
}
