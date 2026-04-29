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

type ValidatorPatternActionsProps = {
  onImport: () => void;
  onCopyDocumentation: () => Promise<void>;
  onCreateStarGaterProducerPattern: () => void | Promise<void>;
  onCreatePattern: () => void;
};

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
        <ValidatorPatternActions
          onImport={() => setShowImportModal(true)}
          onCopyDocumentation={handleCopyFullDocumentation}
          onCreateStarGaterProducerPattern={handleCreateStarGaterProducerPattern}
          onCreatePattern={openCreate}
        />
        <ValidatorPatternTableBody loading={loading} patternCount={patterns.length} onCreate={openCreate} />
      </div>
      <ValidatorPatternImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
      />
    </FormSection>
  );
}

function ValidatorPatternActions({
  onImport,
  onCopyDocumentation,
  onCreateStarGaterProducerPattern,
  onCreatePattern,
}: ValidatorPatternActionsProps): React.JSX.Element {
  return (
    <div data-testid='validator-pattern-actions' className='flex w-full flex-wrap items-center gap-2'>
      <Button
        type='button'
        onClick={onImport}
        variant='outline'
        className='border-fuchsia-500/40 text-fuchsia-200 hover:bg-fuchsia-500/10'
      >
        Import JSON
      </Button>
      <Button
        type='button'
        onClick={() => {
          void onCopyDocumentation();
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
          void onCreateStarGaterProducerPattern();
        }}
        variant='outline'
        className='border-amber-500/40 text-amber-200 hover:bg-amber-500/10'
      >
        Producer: StarGater.net
      </Button>
      <Button onClick={onCreatePattern} variant='default'>
        <Plus className='mr-2 size-4' />
        Add Pattern
      </Button>
    </div>
  );
}

function ValidatorPatternTableBody({
  loading,
  patternCount,
  onCreate,
}: {
  loading: boolean;
  patternCount: number;
  onCreate: () => void;
}): React.JSX.Element {
  if (loading) {
    return <LoadingState message='Loading validator patterns...' className='py-8 border border-dashed' />;
  }

  if (patternCount === 0) {
    return (
      <EmptyState
        title='No validator patterns'
        description='Create your first regex rule to validate product names, descriptions, and SKU.'
        action={
          <Button onClick={onCreate} variant='outline'>
            <Plus className='mr-2 size-4' />
            Create Pattern
          </Button>
        }
      />
    );
  }

  return <ValidatorPatternTree />;
}
