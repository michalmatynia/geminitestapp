'use client';

import React, { useMemo } from 'react';

import { Checkbox, FormField, Input, Label, Textarea } from '@/shared/ui';

import { useAiPathOrchestrator, useAiPathSelection } from '../../AiPathConfigContext';

const DEFAULT_NOTE_COLOR = '#f5e7c3';
const NOTE_COLOR_SWATCHES = [
  DEFAULT_NOTE_COLOR,
  '#f1f5f9',
  '#fde68a',
  '#fecaca',
  '#bbf7d0',
  '#bfdbfe',
  '#e9d5ff',
  '#fed7aa',
];

const resolveColor = (value?: string | null): string => {
  if (typeof value !== 'string') return DEFAULT_NOTE_COLOR;
  const trimmed = value.trim();
  return trimmed ? trimmed : DEFAULT_NOTE_COLOR;
};

export function NodeNotesTab(): React.JSX.Element | null {
  const { selectedNode } = useAiPathSelection();
  const { updateSelectedNodeConfig } = useAiPathOrchestrator();
  if (!selectedNode) return null;

  const notes = selectedNode.config?.notes ?? {};
  const noteText = typeof notes.text === 'string' ? notes.text : '';
  const noteColor = resolveColor(notes.color);
  const showOnCanvas = Boolean(notes.showOnCanvas);

  const previewStyle = useMemo(() => ({ backgroundColor: noteColor }), [noteColor]);

  return (
    <div className='space-y-4'>
      <FormField label='Node Notes'>
        <Textarea
          variant='subtle'
          size='sm'
          value={noteText}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
            updateSelectedNodeConfig({ notes: { text: event.target.value } });
          }}
          placeholder='Add notes about this node...'
          className='min-h-[140px]'
        />
      </FormField>

      <div className='flex items-center gap-3 py-1'>
        <Checkbox
          id='showNoteOnCanvas'
          checked={showOnCanvas}
          onCheckedChange={(checked: boolean) => {
            updateSelectedNodeConfig({ notes: { showOnCanvas: checked } });
          }}
        />
        <Label htmlFor='showNoteOnCanvas' className='text-xs font-medium text-gray-300'>
          Show note on canvas
        </Label>
      </div>

      <FormField label='Note color'>
        <div className='flex flex-wrap items-center gap-2'>
          {NOTE_COLOR_SWATCHES.map((swatch: string) => (
            <button
              key={swatch}
              type='button'
              className={`h-7 w-7 rounded border transition-all ${
                noteColor === swatch
                  ? 'border-white ring-2 ring-white/20'
                  : 'border-border/60 hover:border-white/40'
              }`}
              style={{ backgroundColor: swatch }}
              onClick={() => updateSelectedNodeConfig({ notes: { color: swatch } })}
              aria-label={`Set note color ${swatch}`}
              title={`Set note color ${swatch}`}
            />
          ))}
          <div className='flex items-center gap-2'>
            <Input
              type='color'
              variant='subtle'
              size='sm'
              value={noteColor}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                updateSelectedNodeConfig({ notes: { color: event.target.value } });
              }}
              className='h-8 w-10 cursor-pointer p-1'
            />
            <span className='text-[11px] text-gray-400 font-mono'>{noteColor}</span>
          </div>
        </div>
      </FormField>

      <div
        className='rounded border border-border/60 px-3 py-2 text-[11px] text-gray-900 shadow-sm'
        style={previewStyle}
      >
        {noteText.trim() ? noteText : 'Preview: your note will appear here.'}
      </div>
    </div>
  );
}
