'use client';

import { Plus } from 'lucide-react';
import React from 'react';

import { Button, EmptyState, FormSection, LoadingState, useToast } from '@/shared/ui';

import { buildFullValidatorDocumentationClipboardText } from './validator-documentation-clipboard';
import { ValidatorPatternImportModal } from './ValidatorPatternImportModal';
import { ValidatorPatternTree } from './ValidatorPatternTree';
import { useValidatorSettingsContext } from './ValidatorSettingsContext';

/**
 * Validator docs: see docs/validator/function-reference.md#ui.validatorpatterntablepanel
 */
export function ValidatorPatternTablePanel(): React.JSX.Element {
  const { toast } = useToast();
  const {
    summary,
    loading,
    patterns,
    patternActionsPending,
    openCreate,
    onCreateSkuAutoIncrementSequence,
    onCreateLatestPriceStockSequence,
    handleCreateNameLengthMirrorPattern,
    handleCreateNameCategoryMirrorPattern,
    handleCreateNameMirrorPolishSequence,
  } = useValidatorSettingsContext();

  const handleCreateSkuAutoIncrement = (): void => {
    void onCreateSkuAutoIncrementSequence();
  };
  const handleCreateLatestPriceStock = (): void => {
    void onCreateLatestPriceStockSequence();
  };
  const handleCreateNameLengthMirror = (): void => {
    void handleCreateNameLengthMirrorPattern();
  };
  const handleCreateNameCategoryMirror = (): void => {
    void handleCreateNameCategoryMirrorPattern();
  };
  const handleCreateNameMirrorPolish = (): void => {
    void handleCreateNameMirrorPolishSequence();
  };
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
    } catch {
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
      actions={
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            onClick={handleCreateSkuAutoIncrement}
            disabled={patternActionsPending}
            variant='outline'
            className='border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/10'
          >
            + SKU Auto Sequence
          </Button>
          <Button
            onClick={handleCreateLatestPriceStock}
            disabled={patternActionsPending}
            variant='outline'
            className='border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10'
          >
            + Latest Price & Stock
          </Button>
          <Button
            onClick={handleCreateNameLengthMirror}
            disabled={patternActionsPending}
            variant='outline'
            className='border-teal-500/40 text-teal-200 hover:bg-teal-500/10'
          >
            + Name Segment to Length + Height
          </Button>
          <Button
            onClick={handleCreateNameCategoryMirror}
            disabled={patternActionsPending}
            variant='outline'
            className='border-lime-500/40 text-lime-200 hover:bg-lime-500/10'
          >
            + Name Segment to Category
          </Button>
          <Button
            onClick={handleCreateNameMirrorPolish}
            disabled={patternActionsPending}
            variant='outline'
            className='border-indigo-500/40 text-indigo-200 hover:bg-indigo-500/10'
          >
            + Name EN to PL
          </Button>
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
          <Button onClick={() => openCreate()} variant='default'>
            <Plus className='mr-2 size-4' />
            Add Pattern
          </Button>
        </div>
      }
    >
      <div className='mt-4'>
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
