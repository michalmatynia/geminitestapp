'use client';

import { Undo, Redo } from 'lucide-react';
import React from 'react';

import { useNoteFormContext } from '@/features/notesapp/context/NoteFormContext';
import type { NoteFileRecord } from '@/shared/types/notes';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui';


interface MarkdownToolbarProps {
  onApplyWrap: (prefix: string, suffix: string, placeholder: string) => void;
  onApplyLinePrefix: (prefix: string) => void;
  onInsertAtCursor: (value: string) => void;
  onApplyBulletList: () => void;
  onApplyChecklist: () => void;
  onApplySpanStyle: (color: string, font: string) => void;
}

export function MarkdownToolbar({
  onApplyWrap,
  onApplyLinePrefix,
  onInsertAtCursor,
  onApplyBulletList,
  onApplyChecklist,
  onApplySpanStyle,
}: MarkdownToolbarProps): React.JSX.Element {
  const {
    noteFiles,
    textColor,
    setTextColor,
    fontFamily,
    setFontFamily,
    showPreview,
    setShowPreview,
    insertFileReference,
    undo,
    redo,
    canUndo,
    canRedo,
    editorMode,
    setEditorMode,
    isEditorModeLocked,
    isMigrating,
    handleMigrateToWysiwyg,
    handleMigrateToMarkdown,
    content,
  } = useNoteFormContext();

  return (
    <div className='mb-2 flex flex-wrap items-center gap-2 rounded-lg border bg-gray-900 px-3 py-2'>
      {/* Editor Mode Display/Toggle */}
      <div className='flex items-center gap-2'>
        {isEditorModeLocked ? (
          <>
            {/* Display current mode (locked) */}
            <span className='px-2 py-1 text-xs bg-gray-800 text-gray-300 rounded border border-border/60'>
              {editorMode === 'markdown' ? 'Markdown' : editorMode === 'wysiwyg' ? 'WYSIWYG' : 'Code'}
            </span>
            {/* Migration buttons */}
            {editorMode === 'markdown' && (
              <div className='flex gap-1'>
                <Button
                  type='button'
                  onClick={() => { void handleMigrateToWysiwyg(content); }}
                  disabled={isMigrating}
                  className='px-2 py-1 text-xs bg-purple-600/20 text-purple-300 border border-purple-500/40 rounded hover:bg-purple-600/30 disabled:opacity-50'
                  title='Convert this note to WYSIWYG format'
                >
                  {isMigrating ? 'Migrating...' : 'To WYSIWYG'}
                </Button>
              </div>
            )}
            {editorMode === 'wysiwyg' && (
              <Button
                type='button'
                onClick={() => { void handleMigrateToMarkdown(content); }}
                disabled={isMigrating}
                className='px-2 py-1 text-xs bg-purple-600/20 text-purple-300 border border-purple-500/40 rounded hover:bg-purple-600/30 disabled:opacity-50'
                title='Convert this note to Markdown format'
              >
                {isMigrating ? 'Migrating...' : 'To Markdown'}
              </Button>
            )}
            {editorMode === 'code' && (
              <Button
                type='button'
                onClick={() => { void handleMigrateToMarkdown(content); }}
                disabled={isMigrating}
                className='px-2 py-1 text-xs bg-purple-600/20 text-purple-300 border border-purple-500/40 rounded hover:bg-purple-600/30 disabled:opacity-50'
                title='Convert this note to Markdown format'
              >
                {isMigrating ? 'Migrating...' : 'To Markdown'}
              </Button>
            )}
          </>
        ) : (
          /* Mode toggle for new notes */
          <div className='flex rounded-md border border-border/60 overflow-hidden'>
            <Button
              type='button'
              onClick={(): void => setEditorMode('markdown')}
              className={`px-2 py-1 text-xs transition-colors ${
                editorMode === 'markdown'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
              title='Markdown editor'
            >
              Markdown
            </Button>
            <Button
              type='button'
              onClick={(): void => setEditorMode('wysiwyg')}
              className={`px-2 py-1 text-xs transition-colors ${
                editorMode === 'wysiwyg'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
              title='WYSIWYG editor'
            >
              WYSIWYG
            </Button>
            <Button
              type='button'
              onClick={(): void => setEditorMode('code')}
              className={`px-2 py-1 text-xs transition-colors ${
                editorMode === 'code'
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
      <div className='h-6 w-px bg-gray-700 mx-1' />
      {(editorMode === 'markdown' || editorMode === 'code') && (
        <>
          <Button
            type='button'
            onClick={(): void => setShowPreview(!showPreview)}
            className='rounded border bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700'
            title='Toggle preview'
          >
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </Button>
          <div className='h-6 w-px bg-gray-700 mx-1' />
          <Button
            type='button'
            onClick={undo}
            disabled={!canUndo}
            className='rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'
            title='Undo'
          >
            <Undo className='size-3.5' />
          </Button>
          <Button
            type='button'
            onClick={redo}
            disabled={!canRedo}
            className='rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'
            title='Redo'
          >
            <Redo className='size-3.5' />
          </Button>
          <div className='h-6 w-px bg-gray-700 mx-1' />
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
            title='Heading'
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
            onClick={(): void =>
              onInsertAtCursor(
                '\n| Header | Header |\n| --- | --- |\n| Cell | Cell |\n')
            }
            className='rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700'
            title='Table'
          >
        Table
          </Button>
          {noteFiles.length > 0 && (
            <div className='relative'>
              <Select
                value=''
                onValueChange={(value: string): void => {
                  const slotIndex = parseInt(value, 10);
                  const file = noteFiles.find((f: NoteFileRecord) => f.slotIndex === slotIndex);
                  if (file) {
                    insertFileReference(file);
                  }
                }}
              >
                <SelectTrigger className='rounded border bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700 h-auto' title='Insert file reference'>
                  <SelectValue placeholder='Insert File' />
                </SelectTrigger>
                <SelectContent className='bg-gray-800 border-border text-white'>
                  {noteFiles.map((file: NoteFileRecord) => (
                    <SelectItem key={file.slotIndex} value={String(file.slotIndex)}>
                  Slot {file.slotIndex + 1}: {file.filename.replace(/^slot-\d+-\d+-/, '').slice(0, 15)}
                      {file.filename.replace(/^slot-\d+-\d+-/, '').length > 15 ? '...' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className='ml-2 flex items-center gap-2 border-l border pl-2'>
            <Label className='text-xs text-gray-400'>Font</Label>
            <Select
              value={fontFamily}
              onValueChange={setFontFamily}
            >
              <SelectTrigger className='rounded border bg-gray-800 px-2 py-1 text-xs text-gray-200 h-auto'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className='bg-gray-800 border-border text-white'>
                <SelectItem value='inherit'>Default</SelectItem>
                <SelectItem value='Georgia, serif'>Serif</SelectItem>
                <SelectItem value='Trebuchet MS, sans-serif'>Sans</SelectItem>
                <SelectItem value='Courier New, monospace'>Mono</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className='flex items-center gap-2'>
            <Label className='text-xs text-gray-400'>Color</Label>
            <Input
              type='color'
              value={textColor}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => setTextColor(event.target.value)}
              className='h-7 w-10 rounded border bg-gray-800 p-0 border-none'
            />
          </div>
          <Button
            type='button'
            onClick={(): void => onApplySpanStyle(textColor, fontFamily)}
            className='rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700 border border-border/40'
            title='Apply font and color'
          >
        Apply
          </Button>
        </>
      )}
    </div>
  );
}

