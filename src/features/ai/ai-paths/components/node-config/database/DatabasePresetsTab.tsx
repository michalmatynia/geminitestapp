'use client';

import { Eye } from 'lucide-react';
import React from 'react';

import type { DbQueryPreset } from '@/shared/lib/ai-paths';
import type { DatabasePresetOption } from '@/shared/contracts/database';
import { Button, Input, Label, Textarea } from '@/shared/ui';
import { DetailModal } from '@/shared/ui/templates/modals/DetailModal';

import {
  useDatabasePresetsTabActionsContext,
  useDatabasePresetsTabStateContext,
} from './DatabasePresetsTabContext';
import { useAiPathPresets } from '../../AiPathConfigContext';

export function DatabasePresetsTab(): React.JSX.Element {
  const { builtInPresets } = useDatabasePresetsTabStateContext();
  const { onApplyBuiltInPreset, onRenameQueryPreset, onDeleteQueryPreset } =
    useDatabasePresetsTabActionsContext();
  const { dbQueryPresets } = useAiPathPresets();
  const [queryNameDrafts, setQueryNameDrafts] = React.useState<Record<string, string>>({});
  const [viewPresetId, setViewPresetId] = React.useState<string | null>(null);
  const activePreset = viewPresetId
    ? (dbQueryPresets.find((preset: DbQueryPreset): boolean => preset.id === viewPresetId) ?? null)
    : null;

  React.useEffect((): void => {
    setQueryNameDrafts((prev: Record<string, string>): Record<string, string> => {
      const next = { ...prev };
      dbQueryPresets.forEach((preset: DbQueryPreset): void => {
        if (!next[preset.id]) {
          next[preset.id] = preset.name;
        }
      });
      Object.keys(next).forEach((key: string): void => {
        if (!dbQueryPresets.some((preset: DbQueryPreset): boolean => preset.id === key)) {
          delete next[key];
        }
      });
      return next;
    });
  }, [dbQueryPresets]);

  const handleRename = async (presetId: string, nextName: string): Promise<void> => {
    const trimmed = nextName.trim();
    if (!trimmed) return;
    await onRenameQueryPreset(presetId, trimmed);
  };

  return (
    <div className='space-y-4'>
      {/* Built-in Presets Section */}
      {builtInPresets && builtInPresets.length > 0 && (
        <div className='rounded-md border border-border bg-card/50 p-3'>
          <div className='flex items-center justify-between'>
            <Label className='text-xs text-gray-400'>Built-in Presets</Label>
            <span className='text-[10px] text-gray-500'>
              {
                builtInPresets.filter((p: DatabasePresetOption): boolean => p.id !== 'custom')
                  .length
              }{' '}
              presets
            </span>
          </div>
          <div className='mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2'>
            {builtInPresets
              .filter((p: DatabasePresetOption): boolean => p.id !== 'custom')
              .map(
                (preset: DatabasePresetOption): React.JSX.Element => (
                  <div key={preset.id} className='rounded-md border border-border bg-card/60 p-2'>
                    <div className='flex flex-col gap-1'>
                      <div className='flex items-center justify-between'>
                        <span className='text-xs font-medium text-white'>{preset.label}</span>
                        {onApplyBuiltInPreset && (
                          <Button
                            type='button'
                            className='h-6 rounded-md border border-emerald-500/40 px-2 text-[10px] text-emerald-200 hover:bg-emerald-500/10'
                            onClick={(): void => onApplyBuiltInPreset(preset.id)}
                          >
                            Apply
                          </Button>
                        )}
                      </div>
                      <span className='text-[10px] text-gray-400'>{preset.description}</span>
                    </div>
                  </div>
                )
              )}
          </div>
        </div>
      )}

      {/* User Query Presets Section */}
      <div className='rounded-md border border-border bg-card/50 p-3'>
        <div className='flex items-center justify-between'>
          <Label className='text-xs text-gray-400'>Saved Query Presets</Label>
          <span className='text-[10px] text-gray-500'>{dbQueryPresets.length} presets</span>
        </div>
        {dbQueryPresets.length === 0 ? (
          <div className='mt-3 text-xs text-gray-500'>No query presets saved.</div>
        ) : (
          <div className='mt-3 space-y-2'>
            {dbQueryPresets.map((preset: DbQueryPreset): React.JSX.Element => {
              const draftName = queryNameDrafts[preset.id] ?? preset.name;
              const nameChanged = draftName.trim() !== preset.name.trim();
              return (
                <div key={preset.id} className='rounded-md border border-border bg-card/60 p-2'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <Input
                      className='h-7 flex-1 rounded-md border border-border bg-card/70 text-xs text-white'
                      value={draftName}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        setQueryNameDrafts(
                          (prev: Record<string, string>): Record<string, string> => ({
                            ...prev,
                            [preset.id]: event.target.value,
                          })
                        )
                      }
                      onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>): void => {
                        if (event.key === 'Enter') {
                          void handleRename(preset.id, draftName);
                        }
                      }}
                    />
                    <Button
                      type='button'
                      className='h-7 rounded-md border border-sky-500/40 px-2 text-[10px] text-sky-200 hover:bg-sky-500/10'
                      onClick={(): void => setViewPresetId(preset.id)}
                      title='View preset'
                    >
                      <Eye className='h-3.5 w-3.5' />
                    </Button>
                    <Button
                      type='button'
                      className='h-7 rounded-md border border-emerald-500/40 px-2 text-[10px] text-emerald-200 hover:bg-emerald-500/10'
                      disabled={!nameChanged}
                      onClick={(): void => void handleRename(preset.id, draftName)}
                    >
                      Rename
                    </Button>
                    <Button
                      type='button'
                      className='h-7 rounded-md border border-rose-500/40 px-2 text-[10px] text-rose-200 hover:bg-rose-500/10'
                      onClick={(): void => void onDeleteQueryPreset(preset.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <DetailModal
        isOpen={Boolean(activePreset)}
        onClose={(): void => {
          setViewPresetId(null);
        }}
        title={activePreset?.name ?? 'Query Preset'}
        size='md'
      >
        <div className='space-y-3'>
          <div className='space-y-1'>
            <Label className='text-xs text-gray-400'>Filter Query</Label>
            <Textarea
              className='min-h-[120px] w-full rounded-md border border-border bg-card/70 text-xs text-white'
              value={activePreset?.queryTemplate ?? ''}
              readOnly
            />
          </div>
          <div className='space-y-1'>
            <Label className='text-xs text-gray-400'>Update Document</Label>
            <Textarea
              className='min-h-[120px] w-full rounded-md border border-border bg-card/70 text-xs text-white'
              value={
                activePreset?.updateTemplate?.trim() ? activePreset.updateTemplate : '// Not set'
              }
              readOnly
            />
          </div>
        </div>
      </DetailModal>
    </div>
  );
}
