import React from 'react';

import type { RegexConfig, RegexTemplate } from '@/shared/lib/ai-paths';
import {
  Button,
  CompactEmptyState,
  FormField,
  Input,
  Label,
  SelectSimple,
  ToggleRow,
} from '@/shared/ui';
import type { SelectSimpleOption } from '@/shared/ui/select-simple';

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

const TEMPLATE_MODE_OPTIONS: SelectSimpleOption[] = [
  { value: 'group', label: 'Group matches' },
  { value: 'extract', label: 'Extract value' },
  { value: 'extract_json', label: 'Extract JSON/object' },
];

const TEMPLATE_MATCH_MODE_OPTIONS: SelectSimpleOption[] = [
  { value: 'first', label: 'First match' },
  { value: 'first_overall', label: 'First overall' },
  { value: 'all', label: 'All matches' },
];

const TEMPLATE_OUTPUT_MODE_OPTIONS: SelectSimpleOption[] = [
  { value: 'object', label: 'Object (Record)' },
  { value: 'array', label: 'Array (Groups list)' },
];

export function RegexTemplatesTabContent(props: RegexTemplatesTabContentProps): React.JSX.Element {
  const {
    globalTemplates,
    onApplyGlobalTemplate,
    onApplyNodeTemplate,
    onRemoveGlobalTemplate,
    onRemoveNodeTemplate,
    onUpdateGlobalTemplate,
    onUpdateNodeTemplate,
    regexTemplates,
    settingsLoading,
  } = props;

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
          <CompactEmptyState
            title='No node templates'
            description='No node templates yet. Save one from the Config tab.'
            className='bg-card/40 border-dashed border-border/70 py-4'
           />
        ) : (
          <div className='space-y-4'>
            {regexTemplates.map((template: RegexTemplate) => (
              <div
                key={template.id}
                className='rounded-md border border-border bg-card/60 p-3 space-y-3'
              >
                <div className='flex flex-wrap items-center justify-between gap-3'>
                  <div className='min-w-[220px] flex-1'>
                    <FormField label='Template Name'>
                      <Input
                        className='mt-1 w-full rounded-md border border-border bg-card/70 text-sm text-white'
                        value={template.name}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                          onUpdateNodeTemplate(template.id, { name: event.target.value })
                        }
                       aria-label='Template Name' title='Template Name'/>
                    </FormField>
                  </div>
                  <div className='flex gap-2 self-end'>
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
                  <FormField label='Pattern'>
                    <Input
                      className='mt-1 w-full rounded-md border border-border bg-card/70 text-sm text-white'
                      value={template.pattern}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        onUpdateNodeTemplate(template.id, { pattern: event.target.value })
                      }
                     aria-label='Pattern' title='Pattern'/>
                  </FormField>
                  <div className='grid grid-cols-2 gap-2'>
                    <FormField label='Flags'>
                      <Input
                        className='mt-1 w-full rounded-md border border-border bg-card/70 text-sm text-white'
                        value={template.flags ?? ''}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                          onUpdateNodeTemplate(template.id, { flags: event.target.value })
                        }
                        placeholder='gim'
                       aria-label='gim' title='gim'/>
                    </FormField>
                    <FormField label='Group By'>
                      <Input
                        className='mt-1 w-full rounded-md border border-border bg-card/70 text-sm text-white'
                        value={template.groupBy ?? 'match'}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                          onUpdateNodeTemplate(template.id, { groupBy: event.target.value })
                        }
                       aria-label='Group By' title='Group By'/>
                    </FormField>
                  </div>
                </div>

                <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
                  <FormField label='Mode'>
                    <SelectSimple
                      size='sm'
                      value={template.mode ?? 'group'}
                      onValueChange={(value: string): void =>
                        onUpdateNodeTemplate(template.id, { mode: value as RegexConfig['mode'] })
                      }
                      placeholder='Select mode'
                      triggerClassName='mt-1 h-8 w-full border-border bg-card/70 text-xs text-white'
                      contentClassName='border-border bg-gray-900'
                      options={TEMPLATE_MODE_OPTIONS}
                     ariaLabel='Select mode' title='Select mode'/>
                  </FormField>
                  <FormField label='Match Mode'>
                    <SelectSimple
                      size='sm'
                      value={template.matchMode ?? 'first'}
                      onValueChange={(value: string): void =>
                        onUpdateNodeTemplate(template.id, {
                          matchMode: value as RegexConfig['matchMode'],
                        })
                      }
                      placeholder='Select mode'
                      triggerClassName='mt-1 h-8 w-full border-border bg-card/70 text-xs text-white'
                      contentClassName='border-border bg-gray-900'
                      options={TEMPLATE_MATCH_MODE_OPTIONS}
                     ariaLabel='Select mode' title='Select mode'/>
                  </FormField>
                  <FormField label='Output Mode'>
                    <SelectSimple
                      size='sm'
                      value={template.outputMode ?? 'object'}
                      onValueChange={(value: string): void =>
                        onUpdateNodeTemplate(template.id, {
                          outputMode: value as RegexConfig['outputMode'],
                        })
                      }
                      placeholder='Select output'
                      triggerClassName='mt-1 h-8 w-full border-border bg-card/70 text-xs text-white'
                      contentClassName='border-border bg-gray-900'
                      options={TEMPLATE_OUTPUT_MODE_OPTIONS}
                     ariaLabel='Select output' title='Select output'/>
                  </FormField>
                </div>

                <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                  <ToggleRow
                    label='Split lines'
                    description='Treat each line as an input item.'
                    checked={template.splitLines ?? true}
                    onCheckedChange={(checked: boolean) =>
                      onUpdateNodeTemplate(template.id, { splitLines: checked })
                    }
                    className='bg-card/50'
                  />
                  <ToggleRow
                    label='Include unmatched'
                    description='Keep non-matching inputs under a group key.'
                    checked={template.includeUnmatched ?? true}
                    onCheckedChange={(checked: boolean) =>
                      onUpdateNodeTemplate(template.id, { includeUnmatched: checked })
                    }
                    className='bg-card/50'
                  />
                </div>

                <FormField label='Unmatched Key'>
                  <Input
                    className='mt-1 w-full rounded-md border border-border bg-card/70 text-sm text-white'
                    value={template.unmatchedKey ?? '__unmatched__'}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                      onUpdateNodeTemplate(template.id, { unmatchedKey: event.target.value })
                    }
                   aria-label='Unmatched Key' title='Unmatched Key'/>
                </FormField>

                <div className='text-[10px] text-gray-500'>
                  Created:{' '}
                  {template.createdAt ? new Date(template.createdAt).toLocaleString() : '—'}
                  {template.updatedAt
                    ? ` • Updated: ${new Date(template.updatedAt).toLocaleString()}`
                    : ''}
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
          <CompactEmptyState
            title='Loading...'
            description='Loading global templates…'
            className='bg-card/40 border-dashed border-border/70 py-4'
           />
        ) : globalTemplates.length === 0 ? (
          <CompactEmptyState
            title='No global templates'
            description='No global templates yet. Save one from the Config tab.'
            className='bg-card/40 border-dashed border-border/70 py-4'
           />
        ) : (
          <div className='space-y-4'>
            {globalTemplates.map((template: RegexTemplate) => (
              <div
                key={template.id}
                className='rounded-md border border-border bg-card/60 p-3 space-y-3'
              >
                <div className='flex flex-wrap items-center justify-between gap-3'>
                  <div className='min-w-[220px] flex-1'>
                    <FormField label='Template Name'>
                      <Input
                        className='mt-1 w-full rounded-md border border-border bg-card/70 text-sm text-white'
                        value={template.name}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                          onUpdateGlobalTemplate(template.id, { name: event.target.value })
                        }
                       aria-label='Template Name' title='Template Name'/>
                    </FormField>
                  </div>
                  <div className='flex gap-2 self-end'>
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
                  <FormField label='Pattern'>
                    <Input
                      className='mt-1 w-full rounded-md border border-border bg-card/70 text-sm text-white'
                      value={template.pattern}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        onUpdateGlobalTemplate(template.id, { pattern: event.target.value })
                      }
                     aria-label='Pattern' title='Pattern'/>
                  </FormField>
                  <div className='grid grid-cols-2 gap-2'>
                    <FormField label='Flags'>
                      <Input
                        className='mt-1 w-full rounded-md border border-border bg-card/70 text-sm text-white'
                        value={template.flags ?? ''}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                          onUpdateGlobalTemplate(template.id, { flags: event.target.value })
                        }
                        placeholder='gim'
                       aria-label='gim' title='gim'/>
                    </FormField>
                    <FormField label='Group By'>
                      <Input
                        className='mt-1 w-full rounded-md border border-border bg-card/70 text-sm text-white'
                        value={template.groupBy ?? 'match'}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                          onUpdateGlobalTemplate(template.id, { groupBy: event.target.value })
                        }
                       aria-label='Group By' title='Group By'/>
                    </FormField>
                  </div>
                </div>

                <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
                  <FormField label='Mode'>
                    <SelectSimple
                      size='sm'
                      value={template.mode ?? 'group'}
                      onValueChange={(value: string): void =>
                        onUpdateGlobalTemplate(template.id, { mode: value as RegexConfig['mode'] })
                      }
                      placeholder='Select mode'
                      triggerClassName='mt-1 h-8 w-full border-border bg-card/70 text-xs text-white'
                      contentClassName='border-border bg-gray-900'
                      options={TEMPLATE_MODE_OPTIONS}
                     ariaLabel='Select mode' title='Select mode'/>
                  </FormField>
                  <FormField label='Match Mode'>
                    <SelectSimple
                      size='sm'
                      value={template.matchMode ?? 'first'}
                      onValueChange={(value: string): void =>
                        onUpdateGlobalTemplate(template.id, {
                          matchMode: value as RegexConfig['matchMode'],
                        })
                      }
                      placeholder='Select mode'
                      triggerClassName='mt-1 h-8 w-full border-border bg-card/70 text-xs text-white'
                      contentClassName='border-border bg-gray-900'
                      options={TEMPLATE_MATCH_MODE_OPTIONS}
                     ariaLabel='Select mode' title='Select mode'/>
                  </FormField>
                  <FormField label='Output Mode'>
                    <SelectSimple
                      size='sm'
                      value={template.outputMode ?? 'object'}
                      onValueChange={(value: string): void =>
                        onUpdateGlobalTemplate(template.id, {
                          outputMode: value as RegexConfig['outputMode'],
                        })
                      }
                      placeholder='Select output'
                      triggerClassName='mt-1 h-8 w-full border-border bg-card/70 text-xs text-white'
                      contentClassName='border-border bg-gray-900'
                      options={TEMPLATE_OUTPUT_MODE_OPTIONS}
                     ariaLabel='Select output' title='Select output'/>
                  </FormField>
                </div>

                <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                  <ToggleRow
                    label='Split lines'
                    description='Treat each line as an input item.'
                    checked={template.splitLines ?? true}
                    onCheckedChange={(checked: boolean) =>
                      onUpdateGlobalTemplate(template.id, { splitLines: checked })
                    }
                    className='bg-card/50'
                  />
                  <ToggleRow
                    label='Include unmatched'
                    description='Keep non-matching inputs under a group key.'
                    checked={template.includeUnmatched ?? true}
                    onCheckedChange={(checked: boolean) =>
                      onUpdateGlobalTemplate(template.id, { includeUnmatched: checked })
                    }
                    className='bg-card/50'
                  />
                </div>

                <FormField label='Unmatched Key'>
                  <Input
                    className='mt-1 w-full rounded-md border border-border bg-card/70 text-sm text-white'
                    value={template.unmatchedKey ?? '__unmatched__'}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                      onUpdateGlobalTemplate(template.id, { unmatchedKey: event.target.value })
                    }
                   aria-label='Unmatched Key' title='Unmatched Key'/>
                </FormField>

                <div className='text-[10px] text-gray-500'>
                  Created:{' '}
                  {template.createdAt ? new Date(template.createdAt).toLocaleString() : '—'}
                  {template.updatedAt
                    ? ` • Updated: ${new Date(template.updatedAt).toLocaleString()}`
                    : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
