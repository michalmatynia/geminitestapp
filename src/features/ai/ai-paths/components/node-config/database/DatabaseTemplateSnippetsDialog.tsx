import React from 'react';

import type { DbQueryConfig } from '@/features/ai/ai-paths/lib';
import { Button, AppModal, Label } from '@/shared/ui';

type TemplateSnippet = { label: string; value: string };
type ReadQuerySnippet = {
  label: string;
  value: string;
  disabled?: boolean;
  note?: string;
};
type OperatorGroup = {
  label: string;
  items: Array<{ label: string; value: string }>;
};
type StageSnippet = { label: string; value: string };
type SortPreset = { id: string; label: string; value: string };
type ProjectionPreset = { id: string; label: string; value: string };

type DatabaseTemplateSnippetsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateSnippets: TemplateSnippet[];
  readQueryTypes: ReadQuerySnippet[];
  queryOperatorGroups: OperatorGroup[];
  updateOperatorGroups: OperatorGroup[];
  aggregationStageSnippets: StageSnippet[];
  sortPresets: SortPreset[];
  projectionPresets: ProjectionPreset[];
  isPrismaProvider: boolean;
  setSelectedAiQueryId: React.Dispatch<React.SetStateAction<string>>;
  updateQueryConfig: (patch: Partial<DbQueryConfig>) => void;
  insertTemplateSnippet: (snippet: string) => void;
  toast: (
    message: string,
    options?: { variant?: 'success' | 'error' | 'info' | 'warning' }
  ) => void;
};

export function DatabaseTemplateSnippetsDialog({
  open,
  onOpenChange,
  templateSnippets,
  readQueryTypes,
  queryOperatorGroups,
  updateOperatorGroups,
  aggregationStageSnippets,
  sortPresets,
  projectionPresets,
  isPrismaProvider,
  setSelectedAiQueryId,
  updateQueryConfig,
  insertTemplateSnippet,
  toast,
}: DatabaseTemplateSnippetsDialogProps): React.JSX.Element {
  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title='Template Snippets'
      size='lg'
    >
      <div className='space-y-4 max-h-[60vh] overflow-y-auto'>
        <div className='space-y-2'>
          <Label className='text-xs text-gray-400 uppercase tracking-wide'>Query Templates</Label>
          <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
            {templateSnippets.map((snippet: TemplateSnippet): React.JSX.Element => (
              <Button
                key={snippet.label}
                type='button'
                className='h-auto flex-col items-start gap-1 rounded-md border border-emerald-600/50 bg-emerald-500/10 p-3 text-left hover:bg-emerald-500/20'
                onClick={(): void => {
                  setSelectedAiQueryId('');
                  updateQueryConfig({
                    mode: 'custom',
                    queryTemplate: snippet.value,
                  });
                  onOpenChange(false);
                  toast(`Applied: ${snippet.label}`, { variant: 'success' });
                }}
              >
                <span className='text-[11px] font-medium text-emerald-200'>{snippet.label}</span>
                <pre className='text-[9px] text-gray-400 whitespace-pre-wrap break-all line-clamp-2'>{snippet.value}</pre>
              </Button>
            ))}
          </div>
        </div>

        <div className='space-y-2'>
          <Label className='text-xs text-gray-400 uppercase tracking-wide'>Read Query Types</Label>
          <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
            {readQueryTypes.map((snippet: ReadQuerySnippet): React.JSX.Element => (
              <Button
                key={snippet.label}
                type='button'
                disabled={snippet.disabled}
                className={`h-auto flex-col items-start gap-1 rounded-md border p-3 text-left ${
                  snippet.disabled
                    ? 'border-gray-700 bg-gray-800/30 text-gray-500'
                    : 'border-indigo-600/50 bg-indigo-500/10 hover:bg-indigo-500/20'
                }`}
                onClick={(): void => {
                  if (snippet.disabled) return;
                  insertTemplateSnippet(snippet.value);
                  toast(`Inserted: ${snippet.label}`, { variant: 'success' });
                }}
                title={snippet.note ?? undefined}
              >
                <span className='text-[11px] font-medium text-indigo-200'>{snippet.label}</span>
                {snippet.note ? (
                  <span className='text-[9px] text-gray-400'>{snippet.note}</span>
                ) : null}
              </Button>
            ))}
          </div>
        </div>

        <div className='space-y-2'>
          <Label className='text-xs text-gray-400 uppercase tracking-wide'>Query Operators</Label>
          <div className='space-y-3'>
            {queryOperatorGroups.map((group: OperatorGroup): React.JSX.Element => (
              <div key={group.label} className='space-y-1'>
                <div className='text-[10px] text-gray-500'>{group.label}</div>
                <div className='flex flex-wrap gap-2'>
                  {group.items.map((item: { label: string; value: string }): React.JSX.Element => (
                    <Button
                      key={item.label}
                      type='button'
                      className='h-6 rounded-md border border-emerald-600/50 bg-emerald-500/10 px-2 text-[10px] text-emerald-200 hover:bg-emerald-500/20'
                      onClick={(): void => {
                        insertTemplateSnippet(item.value);
                        toast(`Inserted ${item.label}`, { variant: 'success' });
                      }}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className='space-y-2'>
          <Label className='text-xs text-gray-400 uppercase tracking-wide'>Update Operators</Label>
          <div className='space-y-3'>
            {updateOperatorGroups.map((group: OperatorGroup): React.JSX.Element => (
              <div key={group.label} className='space-y-1'>
                <div className='text-[10px] text-gray-500'>{group.label}</div>
                <div className='flex flex-wrap gap-2'>
                  {group.items.map((item: { label: string; value: string }): React.JSX.Element => (
                    <Button
                      key={item.label}
                      type='button'
                      className='h-6 rounded-md border border-sky-600/50 bg-sky-500/10 px-2 text-[10px] text-sky-200 hover:bg-sky-500/20'
                      onClick={(): void => {
                        insertTemplateSnippet(item.value);
                        toast(`Inserted ${item.label}`, { variant: 'success' });
                      }}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className='space-y-2'>
          <Label className='text-xs text-gray-400 uppercase tracking-wide'>Aggregation Stages</Label>
          {aggregationStageSnippets.length > 0 ? (
            <div className='flex flex-wrap gap-2'>
              {aggregationStageSnippets.map((stage: StageSnippet): React.JSX.Element => (
                <Button
                  key={stage.label}
                  type='button'
                  className='h-6 rounded-md border border-amber-600/50 bg-amber-500/10 px-2 text-[10px] text-amber-200 hover:bg-amber-500/20'
                  onClick={(): void => {
                    insertTemplateSnippet(stage.value);
                    toast(`Inserted ${stage.label}`, { variant: 'success' });
                  }}
                >
                  {stage.label}
                </Button>
              ))}
            </div>
          ) : (
            <div className='text-[10px] text-amber-200/80'>
              Aggregation pipelines are MongoDB-only.
            </div>
          )}
        </div>

        <div className='space-y-2'>
          <Label className='text-xs text-gray-400 uppercase tracking-wide'>
            {isPrismaProvider ? 'Order By Options' : 'Sort Options'}
          </Label>
          <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
            {sortPresets.map((preset: SortPreset): React.JSX.Element => (
              <Button
                key={preset.id}
                type='button'
                className='h-auto flex-col items-start gap-1 rounded-md border border-sky-600/50 bg-sky-500/10 p-3 text-left hover:bg-sky-500/20'
                onClick={(): void => {
                  updateQueryConfig({
                    mode: 'custom',
                    sort: preset.value,
                  });
                  onOpenChange(false);
                  toast(`Applied sort: ${preset.label}`, { variant: 'success' });
                }}
              >
                <span className='text-[11px] font-medium text-sky-200'>{preset.label}</span>
                <pre className='text-[9px] text-gray-400 whitespace-pre-wrap break-all'>{preset.value}</pre>
              </Button>
            ))}
          </div>
        </div>

        <div className='space-y-2'>
          <Label className='text-xs text-gray-400 uppercase tracking-wide'>
            {isPrismaProvider ? 'Select (Fields)' : 'Projection (Fields)'}
          </Label>
          <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
            {projectionPresets.map((preset: ProjectionPreset): React.JSX.Element => (
              <Button
                key={preset.id}
                type='button'
                className='h-auto flex-col items-start gap-1 rounded-md border border-amber-600/50 bg-amber-500/10 p-3 text-left hover:bg-amber-500/20'
                onClick={(): void => {
                  updateQueryConfig({
                    mode: 'custom',
                    projection: preset.value,
                  });
                  onOpenChange(false);
                  toast(`Applied projection: ${preset.label}`, { variant: 'success' });
                }}
              >
                <span className='text-[11px] font-medium text-amber-200'>{preset.label}</span>
                <pre className='text-[9px] text-gray-400 whitespace-pre-wrap break-all line-clamp-2'>{preset.value}</pre>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </AppModal>
  );
}
