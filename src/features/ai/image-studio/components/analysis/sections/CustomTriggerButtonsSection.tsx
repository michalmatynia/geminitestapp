'use client';

import React, { useEffect, useState } from 'react';

import { Pencil, Plus, Trash2 } from 'lucide-react';

import { cn } from '@/shared/utils';
import { focusOnMount } from '@/shared/utils/focus-on-mount';
import { Button, SelectSimple } from '@/shared/ui';

import {
  loadCustomTriggerButtons,
  saveCustomTriggerButtons,
  type ImageStudioCustomTriggerButton,
} from '@/features/ai/image-studio/utils/ai-paths-object-analysis';
import {
  type CustomTriggerButtonsSectionRuntime,
  useOptionalImageStudioAnalysisRuntime,
} from './ImageStudioAnalysisRuntimeContext';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type CustomTriggerButtonsSectionProps = CustomTriggerButtonsSectionRuntime;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CustomTriggerButtonsSection(
  props: Partial<CustomTriggerButtonsSectionProps> = {}
): React.JSX.Element {
  const analysisRuntime = useOptionalImageStudioAnalysisRuntime();
  const runtime =
    props.triggerAnalysisForPath !== undefined
      ? (props as CustomTriggerButtonsSectionProps)
      : analysisRuntime?.customTriggerButtonsRuntime;

  if (!runtime) {
    throw new Error(
      'CustomTriggerButtonsSection must be used within ImageStudioAnalysisRuntimeProvider or receive explicit props'
    );
  }

  const { projectId, pathMetas, triggerAnalysisForPath, isRunning } = runtime;

  const [buttons, setButtons] = useState<ImageStudioCustomTriggerButton[]>(() =>
    loadCustomTriggerButtons(projectId)
  );

  // Editing state: null = not editing, 'new' = adding new, string = button id being edited
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editPathId, setEditPathId] = useState('');

  // Sync buttons when projectId changes
  useEffect(() => {
    setButtons(loadCustomTriggerButtons(projectId));
    setEditingId(null);
  }, [projectId]);

  const pathOptions = React.useMemo(
    () =>
      pathMetas.length === 0
        ? [{ value: '__empty__', label: 'No AI Paths found', disabled: true }]
        : pathMetas.map((m) => ({ value: m.id, label: m.name })),
    [pathMetas]
  );

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  const persistButtons = (next: ImageStudioCustomTriggerButton[]): void => {
    setButtons(next);
    saveCustomTriggerButtons(projectId, next);
  };

  const startAdd = (): void => {
    setEditLabel('');
    setEditPathId('');
    setEditingId('__new__');
  };

  const startEdit = (btn: ImageStudioCustomTriggerButton): void => {
    setEditLabel(btn.label);
    setEditPathId(btn.pathId);
    setEditingId(btn.id);
  };

  const cancelEdit = (): void => {
    setEditingId(null);
    setEditLabel('');
    setEditPathId('');
  };

  const saveEdit = (): void => {
    const trimmedLabel = editLabel.trim();
    const trimmedPathId = editPathId.trim();
    if (!trimmedLabel || !trimmedPathId || trimmedPathId === '__empty__') return;

    if (editingId === '__new__') {
      const newBtn: ImageStudioCustomTriggerButton = {
        id: Date.now().toString(),
        label: trimmedLabel,
        pathId: trimmedPathId,
      };
      persistButtons([...buttons, newBtn]);
    } else {
      persistButtons(
        buttons.map((b) =>
          b.id === editingId ? { ...b, label: trimmedLabel, pathId: trimmedPathId } : b
        )
      );
    }
    cancelEdit();
  };

  const removeButton = (id: string): void => {
    persistButtons(buttons.filter((b) => b.id !== id));
    if (editingId === id) cancelEdit();
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className='space-y-2'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div className='text-[10px] uppercase tracking-wide text-gray-500'>
          Custom Trigger Buttons
        </div>
        <button
          type='button'
          className={cn(
            'flex h-5 w-5 items-center justify-center rounded',
            'text-gray-500 hover:bg-white/5 hover:text-gray-300',
            'transition-colors'
          )}
          onClick={startAdd}
          disabled={editingId === '__new__'}
          title='Add custom trigger button'
          aria-label='Add custom trigger button'
        >
          <Plus className='h-3 w-3' />
        </button>
      </div>

      {/* Button list */}
      {buttons.length === 0 && editingId !== '__new__' && (
        <div className='text-[10px] text-gray-600 italic'>
          No custom buttons. Click + to add one.
        </div>
      )}

      {buttons.map((btn) => (
        <div key={btn.id} className='space-y-1'>
          {editingId === btn.id ? (
            // Inline edit row
            <EditRow
              label={editLabel}
              pathId={editPathId}
              pathOptions={pathOptions}
              onLabelChange={setEditLabel}
              onPathChange={setEditPathId}
              onSave={saveEdit}
              onCancel={cancelEdit}
            />
          ) : (
            // Trigger button row
            <div className='flex items-center gap-1.5'>
              <Button
                size='xs'
                type='button'
                variant='outline'
                disabled={isRunning || !btn.pathId}
                onClick={() => void triggerAnalysisForPath(btn.pathId)}
                className='flex-1 truncate text-left'
              >
                {btn.label}
              </Button>
              <button
                type='button'
                className='flex h-5 w-5 shrink-0 items-center justify-center rounded text-gray-600 hover:bg-white/5 hover:text-gray-300 transition-colors'
                onClick={() => startEdit(btn)}
                title='Edit button'
                aria-label={`Edit "${btn.label}"`}
              >
                <Pencil className='h-2.5 w-2.5' />
              </button>
              <button
                type='button'
                className='flex h-5 w-5 shrink-0 items-center justify-center rounded text-gray-600 hover:bg-white/5 hover:text-red-400 transition-colors'
                onClick={() => removeButton(btn.id)}
                title='Remove button'
                aria-label={`Remove "${btn.label}"`}
              >
                <Trash2 className='h-2.5 w-2.5' />
              </button>
            </div>
          )}
        </div>
      ))}

      {/* New button edit row */}
      {editingId === '__new__' && (
        <EditRow
          label={editLabel}
          pathId={editPathId}
          pathOptions={pathOptions}
          onLabelChange={setEditLabel}
          onPathChange={setEditPathId}
          onSave={saveEdit}
          onCancel={cancelEdit}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit row sub-component
// ---------------------------------------------------------------------------

interface EditRowProps {
  label: string;
  pathId: string;
  pathOptions: Array<{ value: string; label: string; disabled?: boolean | undefined }>;
  onLabelChange: (v: string) => void;
  onPathChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

function EditRow(props: EditRowProps): React.JSX.Element {
  const { label, pathId, pathOptions, onLabelChange, onPathChange, onSave, onCancel } = props;

  const canSave = label.trim().length > 0 && pathId.trim().length > 0 && pathId !== '__empty__';

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && canSave) onSave();
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div className='space-y-1.5 rounded border border-border/40 bg-background/30 p-2'>
      <input
        ref={focusOnMount}
        type='text'
        value={label}
        onChange={(e) => onLabelChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder='Button label…'
        className={cn(
          'h-6 w-full rounded border border-border/60 bg-background/50 px-2',
          'text-xs text-gray-200 placeholder:text-gray-600',
          'focus:outline-none focus:ring-1 focus:ring-ring'
        )}
      />
      <SelectSimple
        size='xs'
        value={pathId || undefined}
        onValueChange={onPathChange}
        options={pathOptions}
        placeholder='Select AI Path…'
        ariaLabel='AI Path for this trigger button'
      />
      <div className='flex items-center gap-1.5'>
        <Button size='xs' type='button' variant='default' disabled={!canSave} onClick={onSave}>
          Save
        </Button>
        <Button size='xs' type='button' variant='ghost' onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
