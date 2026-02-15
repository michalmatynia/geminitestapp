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
import { useOptionalPromptEngineValidationPageContext } from '../context/PromptEngineValidationPageContext';

const DEFAULT_EYEBROW = 'AI · Prompt Engine';
const DEFAULT_BACK_LINK_HREF = '/admin/prompt-engine';
const DEFAULT_BACK_LINK_LABEL = 'Back to Prompt Engine';

export function PromptEngineToolbar(): React.JSX.Element {
  const pageContext = useOptionalPromptEngineValidationPageContext();
  const resolvedEmbedded = pageContext?.embedded ?? false;
  const resolvedEyebrow = pageContext?.eyebrow ?? DEFAULT_EYEBROW;
  const resolvedBackLinkHref = pageContext?.backLinkHref ?? DEFAULT_BACK_LINK_HREF;
  const resolvedBackLinkLabel = pageContext?.backLinkLabel ?? DEFAULT_BACK_LINK_LABEL;
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
        : exploderSubTab === 'case_resolver_rules'
          ? 'Add Case Resolver Rule'
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
