'use client';

import { Redo, Undo } from 'lucide-react';
import React from 'react';

import { Button, Input, Label, SelectSimple, Card, Badge } from '@/shared/ui';

import {
  useOptionalMarkdownToolbarContext,
  type MarkdownToolbarActionHandlers,
  type MarkdownToolbarContextValue,
} from '../context/MarkdownToolbarContext';

export type { MarkdownToolbarActionHandlers };

export interface MarkdownToolbarProps extends Partial<MarkdownToolbarContextValue> {}

export function MarkdownToolbar(props: MarkdownToolbarProps): React.JSX.Element {
  const context = useOptionalMarkdownToolbarContext();
  const {
    mode = props.mode ?? context?.mode ?? 'markdown',
    onModeChange = props.onModeChange ?? context?.onModeChange ?? ((): void => {}),
    isModeLocked = props.isModeLocked ?? context?.isModeLocked ?? false,
    isMigrating = props.isMigrating ?? context?.isMigrating ?? false,
    onMigrateToWysiwyg = props.onMigrateToWysiwyg ?? context?.onMigrateToWysiwyg,
    onMigrateToMarkdown = props.onMigrateToMarkdown ?? context?.onMigrateToMarkdown,
    showPreview = props.showPreview ?? context?.showPreview ?? false,
    onTogglePreview = props.onTogglePreview ?? context?.onTogglePreview,
    onUndo = props.onUndo ?? context?.onUndo,
    onRedo = props.onRedo ?? context?.onRedo,
    canUndo = props.canUndo ?? context?.canUndo ?? false,
    canRedo = props.canRedo ?? context?.canRedo ?? false,
    textColor = props.textColor ?? context?.textColor ?? '',
    onTextColorChange = props.onTextColorChange ?? context?.onTextColorChange ?? ((): void => {}),
    fontFamily = props.fontFamily ?? context?.fontFamily ?? 'inherit',
    onFontFamilyChange = props.onFontFamilyChange ?? context?.onFontFamilyChange ?? ((): void => {}),
    fileReferenceOptions = props.fileReferenceOptions ?? context?.fileReferenceOptions,
    onInsertFileReference = props.onInsertFileReference ?? context?.onInsertFileReference,
    onApplyWrap = props.onApplyWrap ?? context?.onApplyWrap ?? ((): void => {}),
    onApplyLinePrefix = props.onApplyLinePrefix ??
      context?.onApplyLinePrefix ??
      ((): void => {}),
    onInsertAtCursor = props.onInsertAtCursor ?? context?.onInsertAtCursor ?? ((): void => {}),
    onApplyBulletList = props.onApplyBulletList ??
      context?.onApplyBulletList ??
      ((): void => {}),
    onApplyChecklist = props.onApplyChecklist ??
      context?.onApplyChecklist ??
      ((): void => {}),
    onApplySpanStyle = props.onApplySpanStyle ?? context?.onApplySpanStyle ?? ((): void => {}),
  } = props;

  return (
    <Card
      variant='subtle-compact'
      padding='none'
      className='mb-2 flex flex-wrap items-center gap-2 border bg-card/40 px-3 py-2'
    >
      <div className='flex items-center gap-2'>
        {isModeLocked ? (
          <>
            <Badge variant='neutral' className='bg-card/70 font-normal'>
              {mode === 'markdown' ? 'Markdown' : mode === 'wysiwyg' ? 'WYSIWYG' : 'Code'}
            </Badge>
            {mode === 'markdown' ? (
              <Button
                type='button'
                onClick={(): void => {
                  onMigrateToWysiwyg?.();
                }}
                disabled={isMigrating}
                variant='outline'
                className='border-purple-500/40 bg-purple-600/20 px-2 py-1 text-xs text-purple-300 hover:bg-purple-600/30'
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
                variant='outline'
                className='border-purple-500/40 bg-purple-600/20 px-2 py-1 text-xs text-purple-300 hover:bg-purple-600/30'
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
              variant={mode === 'markdown' ? 'solid' : 'ghost'}
              className='px-2 py-1 text-xs rounded-none h-auto'
              title='Markdown editor'
            >
              Markdown
            </Button>
            <Button
              type='button'
              onClick={(): void => onModeChange('wysiwyg')}
              variant={mode === 'wysiwyg' ? 'solid' : 'ghost'}
              className='px-2 py-1 text-xs rounded-none h-auto border-x border-border/60'
              title='WYSIWYG editor'
            >
              WYSIWYG
            </Button>
            <Button
              type='button'
              onClick={(): void => onModeChange('code')}
              variant={mode === 'code' ? 'success' : 'ghost'}
              className='px-2 py-1 text-xs rounded-none h-auto'
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
            variant='outline'
            className='h-7 px-2 text-xs text-gray-200'
            title='Toggle preview'
          >
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </Button>

          <div className='mx-1 h-6 w-px bg-gray-700' />

          <Button
            type='button'
            onClick={(): void => onUndo?.()}
            disabled={!canUndo}
            variant='outline'
            className='h-7 px-2 text-xs text-gray-200'
            title='Undo'
          >
            <Undo className='size-3.5' />
          </Button>
          <Button
            type='button'
            onClick={(): void => onRedo?.()}
            disabled={!canRedo}
            variant='outline'
            className='h-7 px-2 text-xs text-gray-200'
            title='Redo'
          >
            <Redo className='size-3.5' />
          </Button>

          <div className='mx-1 h-6 w-px bg-gray-700' />

          <Button
            type='button'
            onClick={(): void => onApplyWrap('**', '**', 'bold text')}
            variant='outline'
            className='h-7 px-2 text-xs text-gray-200'
            title='Bold'
          >
            Bold
          </Button>
          <Button
            type='button'
            onClick={(): void => onApplyWrap('*', '*', 'italic text')}
            variant='outline'
            className='h-7 px-2 text-xs text-gray-200'
            title='Italic'
          >
            Italic
          </Button>
          <Button
            type='button'
            onClick={(): void => onApplyWrap('`', '`', 'code')}
            variant='outline'
            className='h-7 px-2 text-xs text-gray-200'
            title='Inline code'
          >
            Code
          </Button>
          <Button
            type='button'
            onClick={onApplyBulletList}
            variant='outline'
            className='h-7 px-2 text-xs text-gray-200'
            title='Bullet list'
          >
            Bullet
          </Button>
          <Button
            type='button'
            onClick={onApplyChecklist}
            variant='outline'
            className='h-7 px-2 text-xs text-gray-200'
            title='Checklist'
          >
            Checklist
          </Button>
          <Button
            type='button'
            onClick={(): void => onApplyLinePrefix('# ')}
            variant='outline'
            className='h-7 px-2 text-xs text-gray-200'
            title='Heading 1'
          >
            H1
          </Button>
          <Button
            type='button'
            onClick={(): void => onApplyLinePrefix('## ')}
            variant='outline'
            className='h-7 px-2 text-xs text-gray-200'
            title='Heading 2'
          >
            H2
          </Button>
          <Button
            type='button'
            onClick={(): void => onApplyLinePrefix('### ')}
            variant='outline'
            className='h-7 px-2 text-xs text-gray-200'
            title='Heading 3'
          >
            H3
          </Button>
          <Button
            type='button'
            onClick={(): void => onApplyLinePrefix('> ')}
            variant='outline'
            className='h-7 px-2 text-xs text-gray-200'
            title='Blockquote'
          >
            Quote
          </Button>
          <Button
            type='button'
            onClick={(): void => onInsertAtCursor('\n---\n')}
            variant='outline'
            className='h-7 px-2 text-xs text-gray-200'
            title='Horizontal rule'
          >
            HR
          </Button>
          <Button
            type='button'
            onClick={(): void => onInsertAtCursor('\n```text\ncode\n```\n')}
            variant='outline'
            className='h-7 px-2 text-xs text-gray-200'
            title='Code block'
          >
            Code Block
          </Button>
          <Button
            type='button'
            onClick={(): void => onApplyWrap('[', '](https://example.com)', 'link text')}
            variant='outline'
            className='h-7 px-2 text-xs text-gray-200'
            title='Link'
          >
            Link
          </Button>
          <Button
            type='button'
            onClick={(): void =>
              onInsertAtCursor('\n| Header | Header |\n| --- | --- |\n| Cell | Cell |\n')
            }
            variant='outline'
            className='h-7 px-2 text-xs text-gray-200'
            title='Table'
          >
            Table
          </Button>

          {fileReferenceOptions && fileReferenceOptions.length > 0 && onInsertFileReference ? (
            <SelectSimple
              size='sm'
              value=''
              onValueChange={(value: string): void => {
                onInsertFileReference(value);
              }}
              options={fileReferenceOptions}
              placeholder='Insert File'
              triggerClassName='h-7 rounded border bg-card/40 px-2 text-xs text-gray-200'
              contentClassName='border-border bg-card text-white'
             ariaLabel="Insert File" title="Insert File"/>
          ) : null}

          <div className='ml-2 flex items-center gap-2 border-l border-border pl-2'>
            <Label className='text-xs text-gray-400'>Font</Label>
            <SelectSimple
              size='sm'
              value={fontFamily}
              onValueChange={onFontFamilyChange}
              options={[
                { value: 'inherit', label: 'Default' },
                { value: 'Georgia, serif', label: 'Serif' },
                { value: 'Trebuchet MS, sans-serif', label: 'Sans' },
                { value: 'Courier New, monospace', label: 'Mono' },
              ]}
              triggerClassName='h-7 rounded border bg-card/40 px-2 text-xs text-gray-200'
              contentClassName='border-border bg-card text-white'
             ariaLabel="Select option" title="Select option"/>
          </div>

          <div className='flex items-center gap-2'>
            <Label className='text-xs text-gray-400'>Color</Label>
            <Input
              type='color'
              value={textColor}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                onTextColorChange(event.target.value);
              }}
              className='h-7 w-10 border-none bg-card/40 p-0'
             aria-label="Input field" title="Input field"/>
          </div>
          <Button
            type='button'
            onClick={(): void => onApplySpanStyle(textColor, fontFamily)}
            variant='outline'
            className='h-7 px-2 text-xs text-gray-200 border-border/40'
            title='Apply font and color'
          >
            Apply
          </Button>
        </>
      ) : null}
    </Card>
  );
}
