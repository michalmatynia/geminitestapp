'use client';

import React, { useMemo } from 'react';

import type { AiNode, NodeConfig } from '@/features/ai/ai-paths/lib';
import { Input, Label, Textarea } from '@/shared/ui';

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

type NodeNotesTabProps = {
  selectedNode: AiNode;
  updateSelectedNodeConfig: (patch: Partial<NodeConfig>) => void;
};

export function NodeNotesTab({ selectedNode, updateSelectedNodeConfig }: NodeNotesTabProps): React.JSX.Element {
  const notes = selectedNode.config?.notes ?? {};
  const noteText = typeof notes.text === 'string' ? notes.text : '';
  const noteColor = resolveColor(notes.color);
  const showOnCanvas = Boolean(notes.showOnCanvas);

  const previewStyle = useMemo(
    () => ({ backgroundColor: noteColor }),
    [noteColor]
  );

  return (
    <div className='space-y-4'>
      <div className='space-y-2'>
        <Label className='text-xs text-gray-400'>Node Notes</Label>
        <Textarea
          value={noteText}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
            updateSelectedNodeConfig({ notes: { text: event.target.value } });
          }}
          placeholder='Add notes about this node...'
          className='min-h-[140px] text-xs'
        />
      </div>

      <label className='flex items-center gap-2 text-xs text-gray-300'>
        <input
          type='checkbox'
          checked={showOnCanvas}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            updateSelectedNodeConfig({ notes: { showOnCanvas: event.target.checked } });
          }}
        />
        Show note on canvas
      </label>

      <div className='space-y-2'>
        <div className='text-xs text-gray-400'>Note color</div>
        <div className='flex flex-wrap items-center gap-2'>
          {NOTE_COLOR_SWATCHES.map((swatch: string) => (
            <button
              key={swatch}
              type='button'
              className={`h-7 w-7 rounded border ${
                noteColor === swatch ? 'border-white/70 ring-2 ring-white/40' : 'border-border'
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
              value={noteColor}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                updateSelectedNodeConfig({ notes: { color: event.target.value } });
              }}
              className='h-8 w-10 cursor-pointer border-border bg-transparent p-1'
            />
            <span className='text-[11px] text-gray-400'>{noteColor}</span>
          </div>
        </div>
        <div className='rounded border border-border px-3 py-2 text-[11px] text-gray-900' style={previewStyle}>
          {noteText.trim() ? noteText : 'Preview: your note will appear here.'}
        </div>
      </div>
    </div>
  );
}
