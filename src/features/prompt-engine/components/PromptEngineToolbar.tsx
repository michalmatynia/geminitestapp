'use client';

import { RefreshCcw } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import {
  Button,
  FileUploadButton,
  SectionHeader,
} from '@/shared/ui';
import { cn } from '@/shared/utils';

import { usePromptEngine } from '../context/PromptEngineContext';
import { useOptionalPromptEnginePageChrome } from '../context/PromptEnginePageChromeContext';

type PromptEngineToolbarProps = {
  embedded?: boolean | undefined;
  eyebrow?: string | undefined;
  backLinkHref?: string | undefined;
  backLinkLabel?: string | undefined;
};

export function PromptEngineToolbar({
  embedded = false,
  eyebrow = 'AI · Prompt Engine',
  backLinkHref = '/admin/prompt-engine',
  backLinkLabel = 'Back to Prompt Engine',
}: PromptEngineToolbarProps): React.JSX.Element {
  const pageChrome = useOptionalPromptEnginePageChrome();
  const resolvedEmbedded = pageChrome?.embedded ?? embedded;
  const resolvedEyebrow = pageChrome?.eyebrow ?? eyebrow;
  const resolvedBackLinkHref = pageChrome?.backLinkHref ?? backLinkHref;
  const resolvedBackLinkLabel = pageChrome?.backLinkLabel ?? backLinkLabel;
  const {
    patternTab,
    exploderSubTab,
    isSaving,
    isDirty,
    learnedDirty,
    isLoading,
    handleExport,
    handleExportLearned,
    handleImport,
    handleImportLearned,
    handleAddRule,
    handleAddLearnedRule,
    handleSave,
    handleRefresh,
  } = usePromptEngine();
  const addRuleLabel =
    patternTab === 'prompt_exploder'
      ? exploderSubTab === 'image_studio_rules'
        ? 'Add Image Studio Rule'
        : 'Add Exploder Rule'
      : 'Add rule';

  return (
    <SectionHeader
      eyebrow={resolvedEyebrow}
      title='Validation Patterns'
      description='Browse Prompt Validator rules (patterns, similar matches, and autofix operations).'
      actions={
        <>
          {!resolvedEmbedded ? (
            <Button type='button' variant='outline' asChild>
              <Link href={resolvedBackLinkHref}>{resolvedBackLinkLabel}</Link>
            </Button>
          ) : null}
          <Button type='button' variant='outline' onClick={handleExport}>
            Export JSON
          </Button>
          <Button type='button' variant='outline' onClick={handleExportLearned}>
            Export learned
          </Button>
          <FileUploadButton
            variant='outline'
            accept='application/json'
            onFilesSelected={(files: File[]) => {
              const file = files[0];
              if (!file) return;
              void handleImport(file);
            }}
          >
            Import JSON
          </FileUploadButton>
          <FileUploadButton
            variant='outline'
            accept='application/json'
            onFilesSelected={(files: File[]) => {
              const file = files[0];
              if (!file) return;
              void handleImportLearned(file);
            }}
          >
            Import learned
          </FileUploadButton>
          <Button type='button' variant='outline' onClick={handleAddRule}>
            {addRuleLabel}
          </Button>
          <Button type='button' variant='outline' onClick={handleAddLearnedRule}>
            Add learned
          </Button>
          <Button
            type='button'
            onClick={() => void handleSave()}
            disabled={isSaving || (!isDirty && !learnedDirty)}
          >
            {isSaving ? 'Saving...' : 'Save changes'}
          </Button>
          <Button
            type='button'
            variant='outline'
            onClick={() => void handleRefresh()}
            disabled={isLoading}
            title='Reload settings'
          >
            <RefreshCcw className={cn('mr-2 size-4', isLoading ? 'animate-spin' : '')} />
            Refresh
          </Button>
        </>
      }
    />
  );
}
