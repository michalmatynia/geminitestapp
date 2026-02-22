'use client';

import { RefreshCcw } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import {
  AppModal,
  Button,
  FileUploadButton,
  SectionHeader,
  Textarea,
} from '@/shared/ui';

import { usePromptEngine } from '../context/PromptEngineContext';
import { useOptionalPromptEngineValidationPageContext } from '../context/PromptEngineValidationPageContext';

const DEFAULT_EYEBROW = 'AI · Prompt Engine';
const DEFAULT_BACK_LINK_HREF = '/admin/prompt-engine/validation';
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
  const [pasteModalOpen, setPasteModalOpen] = React.useState(false);
  const [pasteTarget, setPasteTarget] = React.useState<'rules' | 'learned'>('rules');
  const [pasteValue, setPasteValue] = React.useState('');

  const openPasteModal = (target: 'rules' | 'learned'): void => {
    setPasteTarget(target);
    setPasteValue('');
    setPasteModalOpen(true);
  };

  const applyPastedJson = async (): Promise<void> => {
    const trimmed = pasteValue.trim();
    if (!trimmed) return;
    const file = new File(
      [trimmed],
      pasteTarget === 'rules'
        ? 'prompt-engine-validation-patterns.pasted.json'
        : 'prompt-engine-learned-patterns.pasted.json',
      { type: 'application/json' }
    );
    if (pasteTarget === 'rules') {
      await handleImport(file);
      return;
    }
    await handleImportLearned(file);
  };

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
          <Button
            type='button'
            variant='outline'
            onClick={() => openPasteModal('rules')}
          >
            Paste JSON
          </Button>
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
          <Button
            type='button'
            variant='outline'
            onClick={() => openPasteModal('learned')}
          >
            Paste learned
          </Button>
          <Button type='button' variant='outline' onClick={handleAddRule}>
            {addRuleLabel}
          </Button>
          <Button type='button' variant='outline' onClick={handleAddLearnedRule}>
            Add learned
          </Button>
          <Button
            type='button'
            onClick={() => void handleSave()}
            loading={isSaving}
            disabled={!isDirty && !learnedDirty}
          >
            Save changes
          </Button>
          <Button
            type='button'
            variant='outline'
            onClick={() => void handleRefresh()}
            loading={isLoading}
            title='Reload settings'
          >
            <RefreshCcw className='mr-2 size-4' />
            Refresh
          </Button>
        </>
      }
    >
      <AppModal
        isOpen={pasteModalOpen}
        onClose={() => setPasteModalOpen(false)}
        title={pasteTarget === 'rules' ? 'Paste Validation Patterns JSON' : 'Paste Learned Patterns JSON'}
        subtitle='Paste a JSON array of rule objects, then import into the current tab.'
        size='lg'
        footer={(
          <>
            <Button
              type='button'
              variant='outline'
              onClick={() => setPasteModalOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type='button'
              onClick={() => {
                void applyPastedJson();
              }}
              disabled={isSaving || !pasteValue.trim()}
            >
              Import Pasted JSON
            </Button>
          </>
        )}
      >
        <Textarea
          value={pasteValue}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
            setPasteValue(event.target.value);
          }}
          className='min-h-[360px] font-mono text-xs'
          placeholder='Paste JSON array of rules here'
          spellCheck={false}
        />
      </AppModal>
    </SectionHeader>
  );
}
