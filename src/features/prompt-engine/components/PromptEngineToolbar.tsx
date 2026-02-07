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

type PromptEngineToolbarProps = {
  embedded?: boolean;
  eyebrow?: string;
  backLinkHref?: string;
  backLinkLabel?: string;
};

export function PromptEngineToolbar({
  embedded = false,
  eyebrow = 'AI · Prompt Engine',
  backLinkHref = '/admin/prompt-engine',
  backLinkLabel = 'Back to Prompt Engine',
}: PromptEngineToolbarProps): React.JSX.Element {
  const {
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

  return (
    <SectionHeader
      eyebrow={eyebrow}
      title="Validation Patterns"
      description="Browse Prompt Validator rules (patterns, similar matches, and autofix operations)."
      actions={
        <>
          {!embedded ? (
            <Button type="button" variant="outline" asChild>
              <Link href={backLinkHref}>{backLinkLabel}</Link>
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={handleExport}>
            Export JSON
          </Button>
          <Button type="button" variant="outline" onClick={handleExportLearned}>
            Export learned
          </Button>
          <FileUploadButton
            variant="outline"
            accept="application/json"
            onFilesSelected={(files: File[]) => {
              const file = files[0];
              if (!file) return;
              void handleImport(file);
            }}
          >
            Import JSON
          </FileUploadButton>
          <FileUploadButton
            variant="outline"
            accept="application/json"
            onFilesSelected={(files: File[]) => {
              const file = files[0];
              if (!file) return;
              void handleImportLearned(file);
            }}
          >
            Import learned
          </FileUploadButton>
          <Button type="button" variant="outline" onClick={handleAddRule}>
            Add rule
          </Button>
          <Button type="button" variant="outline" onClick={handleAddLearnedRule}>
            Add learned
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving || (!isDirty && !learnedDirty)}
          >
            {isSaving ? 'Saving...' : 'Save changes'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleRefresh()}
            disabled={isLoading}
            title="Reload settings"
          >
            <RefreshCcw className={cn('mr-2 size-4', isLoading ? 'animate-spin' : '')} />
            Refresh
          </Button>
        </>
      }
    />
  );
}
