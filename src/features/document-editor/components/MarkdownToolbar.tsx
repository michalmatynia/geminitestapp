'use client';

import { Redo, Undo } from 'lucide-react';
import React from 'react';

import { Button, Input, Label, UnifiedSelect } from '@/shared/ui';

import type { DocumentEditorMode } from '../types';

export type MarkdownToolbarActionHandlers = {
  onApplyWrap: (prefix: string, suffix: string, placeholder: string) => void;
  onApplyLinePrefix: (prefix: string) => void;
  onInsertAtCursor: (value: string) => void;
  onApplyBulletList: () => void;
  onApplyChecklist: () => void;
  onApplySpanStyle: (colorValue: string, fontValue: string) => void;
};

export interface MarkdownToolbarProps extends MarkdownToolbarActionHandlers {
  mode: DocumentEditorMode;
  onModeChange: (mode: DocumentEditorMode) => void;
  isModeLocked?: boolean | undefined;
  isMigrating?: boolean | undefined;
  onMigrateToWysiwyg?: (() => void) | undefined;
  onMigrateToMarkdown?: (() => void) | undefined;
  showPreview?: boolean | undefined;
  onTogglePreview?: (() => void) | undefined;
  onUndo?: (() => void) | undefined;
  onRedo?: (() => void) | undefined;
  canUndo?: boolean | undefined;
  canRedo?: boolean | undefined;
  textColor: string;
  onTextColorChange: (next: string) => void;
  fontFamily: string;
  onFontFamilyChange: (next: string) => void;
  fileReferenceOptions?: Array<{ value: string; label: string }> | undefined;
  onInsertFileReference?: ((value: string) => void) | undefined;
}

export function MarkdownToolbar({
  mode,
  onModeChange,
  isModeLocked = false,
  isMigrating = false,
  onMigrateToWysiwyg,
  onMigrateToMarkdown,
  showPreview = false,
  onTogglePreview,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  textColor,
  onTextColorChange,
  fontFamily,
  onFontFamilyChange,
  fileReferenceOptions,
  onInsertFileReference,
  onApplyWrap,
  onApplyLinePrefix,
  onInsertAtCursor,
  onApplyBulletList,
  onApplyChecklist,
  onApplySpanStyle,
}: MarkdownToolbarProps): React.JSX.Element {
  return (
    <div className='mb-2 flex flex-wrap items-center gap-2 rounded-lg border bg-gray-900 px-3 py-2'>
      <div className='flex items-center gap-2'>
        {isModeLocked ? (
          <>
            <span className='rounded border border-border/60 bg-gray-800 px-2 py-1 text-xs text-gray-300'>
              {mode === 'markdown' ? 'Markdown' : mode === 'wysiwyg' ? 'WYSIWYG' : 'Code'}
            </span>
            {mode === 'markdown' ? (
              <Button
                type='button'
                onClick={(): void => {
                  onMigrateToWysiwyg?.();
                }}
                disabled={isMigrating}
                className='rounded border border-purple-500/40 bg-purple-600/20 px-2 py-1 text-xs text-purple-300 hover:bg-purple-600/30 disabled:opacity-50'
                title='Convert this document to WYSIWYG format'
              >
                {isMigrating ? 'Migrating...' : 'To WYSIWYG'}
              </Button>
            ) : null}
            {mode === 'wysiwyg' || mode === 'code' ? (
              <Button
                type='button'
                onClick={(): void => {
                  onMigrateToMarkdown?.();
                }}
                disabled={isMigrating}
                className='rounded border border-purple-500/40 bg-purple-600/20 px-2 py-1 text-xs text-purple-300 hover:bg-purple-600/30 disabled:opacity-50'
                title='Convert this document to Markdown format'
              >
                {isMigrating ? 'Migrating...' : 'To Markdown'}
              </Button>
            ) : null}
          </>
        ) : (
          <div className='flex overflow-hidden rounded-md border border-border/60'>
            <Button
              type='button'
              onClick={(): void => onModeChange('markdown')}
              className={`px-2 py-1 text-xs transition-colors ${
                mode === 'markdown'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
              title='Markdown editor'
            >
              Markdown
            </Button>
            <Button
              type='button'
              onClick={(): void => onModeChange('wysiwyg')}
              className={`px-2 py-1 text-xs transition-colors ${
                mode === 'wysiwyg'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
              title='WYSIWYG editor'
            >
              WYSIWYG
            </Button>
            <Button
              type='button'
              onClick={(): void => onModeChange('code')}
              className={`px-2 py-1 text-xs transition-colors ${
                mode === 'code'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
              title='Code snippets editor'
            >
              Code
            </Button>
          </div>
        )}
      </div>

      <div className='mx-1 h-6 w-px bg-gray-700' />

      {mode === 'markdown' || mode === 'code' ? (
        <>
          <Button
            type='button'
            onClick={(): void => onTogglePreview?.()}
            className='rounded border bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700'
            title='Toggle preview'
          >
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </Button>

          <div className='mx-1 h-6 w-px bg-gray-700' />

          <Button
            type='button'
            onClick={(): void => onUndo?.()}
            disabled={!canUndo}
            className='rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50'
            title='Undo'
          >
            <Undo className='size-3.5' />
          </Button>
          <Button
            type='button'
            onClick={(): void => onRedo?.()}
            disabled={!canRedo}
            className='rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50'
            title='Redo'
          >
            <Redo className='size-3.5' />
          </Button>

          <div className='mx-1 h-6 w-px bg-gray-700' />

          <Button
            type='button'
            onClick={(): void => onApplyWrap('**', '**', 'bold text')}
            className='rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700'
            title='Bold'
          >
            Bold
          </Button>
          <Button
            type='button'
            onClick={(): void => onApplyWrap('*', '*', 'italic text')}
            className='rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700'
            title='Italic'
          >
            Italic
          </Button>
          <Button
            type='button'
            onClick={(): void => onApplyWrap('`', '`', 'code')}
            className='rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700'
            title='Inline code'
          >
            Code
          </Button>
          <Button
            type='button'
            onClick={onApplyBulletList}
            className='rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700'
            title='Bullet list'
          >
            Bullet
          </Button>
          <Button
            type='button'
            onClick={onApplyChecklist}
            className='rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700'
            title='Checklist'
          >
            Checklist
          </Button>
          <Button
            type='button'
            onClick={(): void => onApplyLinePrefix('# ')}
            className='rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700'
            title='Heading 1'
          >
            H1
          </Button>
          <Button
            type='button'
            onClick={(): void => onApplyLinePrefix('## ')}
            className='rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700'
            title='Heading 2'
          >
            H2
          </Button>
          <Button
            type='button'
            onClick={(): void => onApplyLinePrefix('### ')}
            className='rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700'
            title='Heading 3'
          >
            H3
          </Button>
          <Button
            type='button'
            onClick={(): void => onApplyLinePrefix('> ')}
            className='rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700'
            title='Blockquote'
          >
            Quote
          </Button>
          <Button
            type='button'
            onClick={(): void => onInsertAtCursor('\n---\n')}
            className='rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700'
            title='Horizontal rule'
          >
            HR
          </Button>
          <Button
            type='button'
            onClick={(): void => onInsertAtCursor('\n```text\ncode\n```\n')}
            className='rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700'
            title='Code block'
          >
            Code Block
          </Button>
          <Button
            type='button'
            onClick={(): void => onApplyWrap('[', '](https://example.com)', 'link text')}
            className='rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700'
            title='Link'
          >
            Link
          </Button>
          <Button
            type='button'
            onClick={(): void => onInsertAtCursor('\n| Header | Header |\n| --- | --- |\n| Cell | Cell |\n')}
            className='rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700'
            title='Table'
          >
            Table
          </Button>

          {fileReferenceOptions && fileReferenceOptions.length > 0 && onInsertFileReference ? (
            <UnifiedSelect
              value=''
              onValueChange={(value: string): void => {
                onInsertFileReference(value);
              }}
              options={fileReferenceOptions}
              placeholder='Insert File'
              triggerClassName='h-auto rounded border bg-gray-800 px-2 py-1 text-xs text-gray-200'
              contentClassName='border-border bg-gray-800 text-white'
            />
          ) : null}

          <div className='ml-2 flex items-center gap-2 border-l border-border pl-2'>
            <Label className='text-xs text-gray-400'>Font</Label>
            <UnifiedSelect
              value={fontFamily}
              onValueChange={onFontFamilyChange}
              options={[
                { value: 'inherit', label: 'Default' },
                { value: 'Georgia, serif', label: 'Serif' },
                { value: 'Trebuchet MS, sans-serif', label: 'Sans' },
                { value: 'Courier New, monospace', label: 'Mono' },
              ]}
              triggerClassName='h-auto rounded border bg-gray-800 px-2 py-1 text-xs text-gray-200'
              contentClassName='border-border bg-gray-800 text-white'
            />
          </div>

          <div className='flex items-center gap-2'>
            <Label className='text-xs text-gray-400'>Color</Label>
            <Input
              type='color'
              value={textColor}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                onTextColorChange(event.target.value);
              }}
              className='h-7 w-10 border-none bg-gray-800 p-0'
            />
          </div>
          <Button
            type='button'
            onClick={(): void => onApplySpanStyle(textColor, fontFamily)}
            className='rounded border border-border/40 bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700'
            title='Apply font and color'
          >
            Apply
          </Button>
        </>
      ) : null}
    </div>
  );
}
