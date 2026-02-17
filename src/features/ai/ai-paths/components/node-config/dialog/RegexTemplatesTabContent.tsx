import React from 'react';

import type { RegexConfig, RegexTemplate } from '@/features/ai/ai-paths/lib';
import { Button, Input, Label, SelectSimple, Switch } from '@/shared/ui';

type RegexTemplatesTabContentProps = {
  globalTemplates: RegexTemplate[];
  onApplyGlobalTemplate: (template: RegexTemplate) => void;
  onApplyNodeTemplate: (template: RegexTemplate) => void;
  onRemoveGlobalTemplate: (templateId: string) => void;
  onRemoveNodeTemplate: (templateId: string) => void;
  onUpdateGlobalTemplate: (templateId: string, patch: Partial<RegexTemplate>) => void;
  onUpdateNodeTemplate: (templateId: string, patch: Partial<RegexTemplate>) => void;
  regexTemplates: RegexTemplate[];
  settingsLoading: boolean;
};

export function RegexTemplatesTabContent({
  globalTemplates,
  onApplyGlobalTemplate,
  onApplyNodeTemplate,
  onRemoveGlobalTemplate,
  onRemoveNodeTemplate,
  onUpdateGlobalTemplate,
  onUpdateNodeTemplate,
  regexTemplates,
  settingsLoading,
}: RegexTemplatesTabContentProps): React.JSX.Element {
  return (
    <div className='space-y-6'>
      <div className='rounded-md border border-border/60 bg-card/50 p-3 text-[11px] text-gray-400'>
        Local templates live on this node. Global templates are shared across all nodes/paths.
      </div>

      <div className='space-y-4'>
        <div className='flex items-center justify-between'>
          <Label className='text-xs text-gray-400'>Node Templates</Label>
          <span className='text-[11px] text-gray-500'>{regexTemplates.length} saved</span>
        </div>
        {regexTemplates.length === 0 ? (
          <div className='rounded-md border border-dashed border-border/70 bg-card/40 p-4 text-xs text-gray-400'>
            No node templates yet. Save one from the Config tab.
          </div>
        ) : (
          <div className='space-y-4'>
            {regexTemplates.map((template: RegexTemplate) => (
              <div key={template.id} className='rounded-md border border-border bg-card/60 p-3 space-y-3'>
                <div className='flex flex-wrap items-center justify-between gap-3'>
                  <div className='min-w-[220px] flex-1'>
                    <Label className='text-[10px] text-gray-400'>Template Name</Label>
                    <Input
                      className='mt-1 w-full rounded-md border border-border bg-card/70 text-sm text-white'
                      value={template.name}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        onUpdateNodeTemplate(template.id, { name: event.target.value })
                      }
                    />
                  </div>
                  <div className='flex gap-2'>
                    <Button
                      type='button'
                      className='h-8 rounded-md border border-emerald-600/50 bg-emerald-500/10 px-3 text-[11px] text-emerald-200 hover:bg-emerald-500/20'
                      onClick={() => onApplyNodeTemplate(template)}
                    >
                      Apply
                    </Button>
                    <Button
                      type='button'
                      className='h-8 rounded-md border border-rose-600/50 bg-rose-500/10 px-3 text-[11px] text-rose-200 hover:bg-rose-500/20'
                      onClick={() => onRemoveNodeTemplate(template.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>

                <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                  <div>
                    <Label className='text-[10px] text-gray-400'>Pattern</Label>
                    <Input
                      className='mt-1 w-full rounded-md border border-border bg-card/70 text-sm text-white'
                      value={template.pattern}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        onUpdateNodeTemplate(template.id, { pattern: event.target.value })
                      }
                    />
                  </div>
                  <div className='grid grid-cols-2 gap-2'>
                    <div>
                      <Label className='text-[10px] text-gray-400'>Flags</Label>
                      <Input
                        className='mt-1 w-full rounded-md border border-border bg-card/70 text-sm text-white'
                        value={template.flags ?? ''}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                          onUpdateNodeTemplate(template.id, { flags: event.target.value })
                        }
                        placeholder='gim'
                      />
                    </div>
                    <div>
                      <Label className='text-[10px] text-gray-400'>Group By</Label>
                      <Input
                        className='mt-1 w-full rounded-md border border-border bg-card/70 text-sm text-white'
                        value={template.groupBy ?? 'match'}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                          onUpdateNodeTemplate(template.id, { groupBy: event.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
                  <div>
                    <Label className='text-[10px] text-gray-400'>Mode</Label>
                    <SelectSimple size='sm'
                      value={template.mode ?? 'group'}
                      onValueChange={(value: string): void =>
                        onUpdateNodeTemplate(template.id, { mode: value as RegexConfig['mode'] })
                      }
                      placeholder='Select mode'
                      triggerClassName='mt-1 h-8 w-full border-border bg-card/70 text-xs text-white'
                      contentClassName='border-border bg-gray-900'
                      options={[
                        { value: 'group', label: 'Group matches' },
                        { value: 'extract', label: 'Extract value' },
                        { value: 'extract_json', label: 'Extract JSON/object' },
                      ]}
                    />
                  </div>
                  <div>
                    <Label className='text-[10px] text-gray-400'>Match Mode</Label>
                    <SelectSimple size='sm'
                      value={template.matchMode ?? 'first'}
                      onValueChange={(value: string): void =>
                        onUpdateNodeTemplate(template.id, { matchMode: value as RegexConfig['matchMode'] })
                      }
                      placeholder='Select mode'
                      triggerClassName='mt-1 h-8 w-full border-border bg-card/70 text-xs text-white'
                      contentClassName='border-border bg-gray-900'
                      options={[
                        { value: 'first', label: 'First match' },
                        { value: 'first_overall', label: 'First overall' },
                        { value: 'all', label: 'All matches' },
                      ]}
                    />
                  </div>
                  <div>
                    <Label className='text-[10px] text-gray-400'>Output Mode</Label>
                    <SelectSimple size='sm'
                      value={template.outputMode ?? 'object'}
                      onValueChange={(value: string): void =>
                        onUpdateNodeTemplate(template.id, { outputMode: value as RegexConfig['outputMode'] })
                      }
                      placeholder='Select output'
                      triggerClassName='mt-1 h-8 w-full border-border bg-card/70 text-xs text-white'
                      contentClassName='border-border bg-gray-900'
                      options={[
                        { value: 'object', label: 'Object (Record)' },
                        { value: 'array', label: 'Array (Groups list)' },
                      ]}
                    />
                  </div>
                </div>

                <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                  <div className='flex items-center justify-between rounded-md border border-border bg-card/50 px-3 py-2'>
                    <div>
                      <div className='text-[11px] text-gray-300'>Split lines</div>
                      <div className='text-[11px] text-gray-500'>Treat each line as an input item.</div>
                    </div>
                    <Switch
                      checked={template.splitLines ?? true}
                      onCheckedChange={(checked: boolean) =>
                        onUpdateNodeTemplate(template.id, { splitLines: checked })
                      }
                    />
                  </div>
                  <div className='flex items-center justify-between rounded-md border border-border bg-card/50 px-3 py-2'>
                    <div>
                      <div className='text-[11px] text-gray-300'>Include unmatched</div>
                      <div className='text-[11px] text-gray-500'>
                        Keep non-matching inputs under a group key.
                      </div>
                    </div>
                    <Switch
                      checked={template.includeUnmatched ?? true}
                      onCheckedChange={(checked: boolean) =>
                        onUpdateNodeTemplate(template.id, { includeUnmatched: checked })
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label className='text-[10px] text-gray-400'>Unmatched Key</Label>
                  <Input
                    className='mt-1 w-full rounded-md border border-border bg-card/70 text-sm text-white'
                    value={template.unmatchedKey ?? '__unmatched__'}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                      onUpdateNodeTemplate(template.id, { unmatchedKey: event.target.value })
                    }
                  />
                </div>

                <div className='text-[10px] text-gray-500'>
                  Created: {template.createdAt ? new Date(template.createdAt).toLocaleString() : '—'}
                  {template.updatedAt ? ` • Updated: ${new Date(template.updatedAt).toLocaleString()}` : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className='space-y-4'>
        <div className='flex items-center justify-between'>
          <Label className='text-xs text-gray-400'>Global Templates</Label>
          <span className='text-[11px] text-gray-500'>{globalTemplates.length} shared</span>
        </div>
        {settingsLoading && globalTemplates.length === 0 ? (
          <div className='rounded-md border border-dashed border-border/70 bg-card/40 p-4 text-xs text-gray-400'>
            Loading global templates…
          </div>
        ) : globalTemplates.length === 0 ? (
          <div className='rounded-md border border-dashed border-border/70 bg-card/40 p-4 text-xs text-gray-400'>
            No global templates yet. Save one from the Config tab.
          </div>
        ) : (
          <div className='space-y-4'>
            {globalTemplates.map((template: RegexTemplate) => (
              <div key={template.id} className='rounded-md border border-border bg-card/60 p-3 space-y-3'>
                <div className='flex flex-wrap items-center justify-between gap-3'>
                  <div className='min-w-[220px] flex-1'>
                    <Label className='text-[10px] text-gray-400'>Template Name</Label>
                    <Input
                      className='mt-1 w-full rounded-md border border-border bg-card/70 text-sm text-white'
                      value={template.name}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        onUpdateGlobalTemplate(template.id, { name: event.target.value })
                      }
                    />
                  </div>
                  <div className='flex gap-2'>
                    <Button
                      type='button'
                      className='h-8 rounded-md border border-emerald-600/50 bg-emerald-500/10 px-3 text-[11px] text-emerald-200 hover:bg-emerald-500/20'
                      onClick={() => onApplyGlobalTemplate(template)}
                    >
                      Apply
                    </Button>
                    <Button
                      type='button'
                      className='h-8 rounded-md border border-rose-600/50 bg-rose-500/10 px-3 text-[11px] text-rose-200 hover:bg-rose-500/20'
                      onClick={() => onRemoveGlobalTemplate(template.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>

                <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                  <div>
                    <Label className='text-[10px] text-gray-400'>Pattern</Label>
                    <Input
                      className='mt-1 w-full rounded-md border border-border bg-card/70 text-sm text-white'
                      value={template.pattern}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        onUpdateGlobalTemplate(template.id, { pattern: event.target.value })
                      }
                    />
                  </div>
                  <div className='grid grid-cols-2 gap-2'>
                    <div>
                      <Label className='text-[10px] text-gray-400'>Flags</Label>
                      <Input
                        className='mt-1 w-full rounded-md border border-border bg-card/70 text-sm text-white'
                        value={template.flags ?? ''}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                          onUpdateGlobalTemplate(template.id, { flags: event.target.value })
                        }
                        placeholder='gim'
                      />
                    </div>
                    <div>
                      <Label className='text-[10px] text-gray-400'>Group By</Label>
                      <Input
                        className='mt-1 w-full rounded-md border border-border bg-card/70 text-sm text-white'
                        value={template.groupBy ?? 'match'}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                          onUpdateGlobalTemplate(template.id, { groupBy: event.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
                  <div>
                    <Label className='text-[10px] text-gray-400'>Mode</Label>
                    <SelectSimple size='sm'
                      value={template.mode ?? 'group'}
                      onValueChange={(value: string): void =>
                        onUpdateGlobalTemplate(template.id, { mode: value as RegexConfig['mode'] })
                      }
                      placeholder='Select mode'
                      triggerClassName='mt-1 h-8 w-full border-border bg-card/70 text-xs text-white'
                      contentClassName='border-border bg-gray-900'
                      options={[
                        { value: 'group', label: 'Group matches' },
                        { value: 'extract', label: 'Extract value' },
                        { value: 'extract_json', label: 'Extract JSON/object' },
                      ]}
                    />
                  </div>
                  <div>
                    <Label className='text-[10px] text-gray-400'>Match Mode</Label>
                    <SelectSimple size='sm'
                      value={template.matchMode ?? 'first'}
                      onValueChange={(value: string): void =>
                        onUpdateGlobalTemplate(template.id, { matchMode: value as RegexConfig['matchMode'] })
                      }
                      placeholder='Select mode'
                      triggerClassName='mt-1 h-8 w-full border-border bg-card/70 text-xs text-white'
                      contentClassName='border-border bg-gray-900'
                      options={[
                        { value: 'first', label: 'First match' },
                        { value: 'first_overall', label: 'First overall' },
                        { value: 'all', label: 'All matches' },
                      ]}
                    />
                  </div>
                  <div>
                    <Label className='text-[10px] text-gray-400'>Output Mode</Label>
                    <SelectSimple size='sm'
                      value={template.outputMode ?? 'object'}
                      onValueChange={(value: string): void =>
                        onUpdateGlobalTemplate(template.id, { outputMode: value as RegexConfig['outputMode'] })
                      }
                      placeholder='Select output'
                      triggerClassName='mt-1 h-8 w-full border-border bg-card/70 text-xs text-white'
                      contentClassName='border-border bg-gray-900'
                      options={[
                        { value: 'object', label: 'Object (Record)' },
                        { value: 'array', label: 'Array (Groups list)' },
                      ]}
                    />
                  </div>
                </div>

                <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                  <div className='flex items-center justify-between rounded-md border border-border bg-card/50 px-3 py-2'>
                    <div>
                      <div className='text-[11px] text-gray-300'>Split lines</div>
                      <div className='text-[11px] text-gray-500'>Treat each line as an input item.</div>
                    </div>
                    <Switch
                      checked={template.splitLines ?? true}
                      onCheckedChange={(checked: boolean) =>
                        onUpdateGlobalTemplate(template.id, { splitLines: checked })
                      }
                    />
                  </div>
                  <div className='flex items-center justify-between rounded-md border border-border bg-card/50 px-3 py-2'>
                    <div>
                      <div className='text-[11px] text-gray-300'>Include unmatched</div>
                      <div className='text-[11px] text-gray-500'>
                        Keep non-matching inputs under a group key.
                      </div>
                    </div>
                    <Switch
                      checked={template.includeUnmatched ?? true}
                      onCheckedChange={(checked: boolean) =>
                        onUpdateGlobalTemplate(template.id, { includeUnmatched: checked })
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label className='text-[10px] text-gray-400'>Unmatched Key</Label>
                  <Input
                    className='mt-1 w-full rounded-md border border-border bg-card/70 text-sm text-white'
                    value={template.unmatchedKey ?? '__unmatched__'}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                      onUpdateGlobalTemplate(template.id, { unmatchedKey: event.target.value })
                    }
                  />
                </div>

                <div className='text-[10px] text-gray-500'>
                  Created: {template.createdAt ? new Date(template.createdAt).toLocaleString() : '—'}
                  {template.updatedAt ? ` • Updated: ${new Date(template.updatedAt).toLocaleString()}` : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
