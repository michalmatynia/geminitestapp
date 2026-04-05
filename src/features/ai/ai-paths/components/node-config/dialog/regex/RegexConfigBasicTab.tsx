'use client';

import React from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { RegexConfig } from '@/shared/lib/ai-paths';
import { Button, Input, Label } from '@/shared/ui/primitives.public';
import { FormField, Hint, SelectSimple, ToggleRow } from '@/shared/ui/forms-and-actions.public';
import { insetPanelVariants } from '@/shared/ui/navigation-and-layout.public';

import { extractRegexLiteral, normalizeRegexFlags } from '../regex-node-config-preview';

const REGEX_MODE_OPTIONS = [
  { value: 'group', label: 'Group matches' },
  { value: 'extract', label: 'Extract value' },
  { value: 'extract_json', label: 'Extract JSON/object' },
] as const satisfies ReadonlyArray<LabeledOptionDto<NonNullable<RegexConfig['mode']>>>;

const REGEX_MATCH_MODE_OPTIONS = [
  { value: 'first', label: 'First match' },
  { value: 'first_overall', label: 'First overall' },
  { value: 'all', label: 'All matches' },
] as const satisfies ReadonlyArray<LabeledOptionDto<NonNullable<RegexConfig['matchMode']>>>;

const REGEX_OUTPUT_MODE_OPTIONS = [
  { value: 'object', label: 'Object (Record)' },
  { value: 'array', label: 'Array (Groups list)' },
] as const satisfies ReadonlyArray<LabeledOptionDto<NonNullable<RegexConfig['outputMode']>>>;

const JSON_INTEGRITY_POLICY_OPTIONS = [
  { value: 'strict', label: 'Strict (no repair)' },
  { value: 'repair', label: 'Repair malformed JSON' },
] as const satisfies ReadonlyArray<
  LabeledOptionDto<NonNullable<RegexConfig['jsonIntegrityPolicy']>>
>;

export type RegexConfigBasicTabProps = {
  regexConfig: RegexConfig;
  onUpdateVariantField: (field: 'pattern' | 'flags' | 'groupBy', value: string) => void;
  onUpdateRegex: (patch: Partial<RegexConfig>) => void;
  templateName: string;
  onTemplateNameChange: (value: string) => void;
  onSaveNodeTemplate: () => void;
  onSaveGlobalTemplate: () => void;
  isSavingGlobal: boolean;
  isExtractMode: boolean;
  regexMode: string;
  regexValidation: { ok: boolean; error: string };
};

export function RegexConfigBasicTab(props: RegexConfigBasicTabProps): React.JSX.Element {
  const {
    regexConfig,
    onUpdateVariantField,
    onUpdateRegex,
    templateName,
    onTemplateNameChange,
    onSaveNodeTemplate,
    onSaveGlobalTemplate,
    isSavingGlobal,
    isExtractMode,
    regexMode,
    regexValidation,
  } = props;

  return (
    <div className='space-y-4'>
      <div className='flex items-start justify-between gap-3'>
        <div className='flex-1'>
          <FormField label='Regex Pattern'>
            <Input
              className='mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white'
              value={regexConfig.pattern ?? ''}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                onUpdateVariantField('pattern', event.target.value)
              }
              placeholder='Example: ^(?<prefix>[A-Z]+)-(?<id>\d+)$'
             aria-label='Example: ^(?<prefix>[A-Z]+)-(?<id>\\d+)$' title='Example: ^(?<prefix>[A-Z]+)-(?<id>\\d+)$'/>
            <p className='mt-2 text-[11px] text-gray-500'>
              Pattern is stored without / delimiters. You can paste /pattern/flags and click
              Normalize.
            </p>
          </FormField>
        </div>
        <div className='w-[140px]'>
          <FormField label='Flags'>
            <Input
              className='mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white'
              value={regexConfig.flags ?? ''}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                onUpdateVariantField('flags', event.target.value)
              }
              placeholder='gim'
             aria-label='gim' title='gim'/>
            <div className='mt-2 flex gap-2'>
              <Button
                type='button'
                className='h-7 flex-1 rounded-md border border-border px-2 text-[10px] text-gray-200 hover:bg-muted/50'
                onClick={() => {
                  const combined = (regexConfig.pattern ?? '').trim();
                  const extracted = extractRegexLiteral(combined);
                  if (!extracted) {
                    onUpdateVariantField('flags', normalizeRegexFlags(regexConfig.flags));
                    return;
                  }
                  onUpdateVariantField('pattern', extracted.pattern);
                  onUpdateVariantField('flags', normalizeRegexFlags(extracted.flags));
                }}
                title='Normalize flags / parse /pattern/flags if pasted into the Pattern field'
              >
                Normalize
              </Button>
            </div>
          </FormField>
        </div>
      </div>

      <div
        className={`${insetPanelVariants({ radius: 'compact', padding: 'sm' })} border-border bg-card/50`}
      >
        <div className='flex flex-wrap items-end gap-2'>
          <div className='flex-1 min-w-[200px]'>
            <FormField label='Save Regex Template'>
              <Input
                className='mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white'
                value={templateName}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  onTemplateNameChange(event.target.value)
                }
                placeholder='Template name'
               aria-label='Template name' title='Template name'/>
            </FormField>
          </div>
          <div className='flex gap-2 mb-0.5'>
            <Button
              type='button'
              className='h-8 rounded-md border border-emerald-600/50 bg-emerald-500/10 px-3 text-[11px] text-emerald-200 hover:bg-emerald-500/20'
              onClick={onSaveNodeTemplate}
            >
              Save Node
            </Button>
            <Button
              type='button'
              className='h-8 rounded-md border border-sky-600/50 bg-sky-500/10 px-3 text-[11px] text-sky-200 hover:bg-sky-500/20 disabled:opacity-60'
              onClick={onSaveGlobalTemplate}
              disabled={isSavingGlobal}
            >
              {isSavingGlobal ? 'Saving...' : 'Save Global'}
            </Button>
          </div>
        </div>
        <Hint className='mt-2'>
          Saved templates can be managed in the Templates tab. Global templates are shared across
          nodes/paths.
        </Hint>
      </div>

      <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
        <div>
          <Label className='text-xs text-gray-400'>Mode</Label>
          <SelectSimple
            size='sm'
            value={regexMode}
            onValueChange={(value: string): void =>
              onUpdateRegex({ mode: value as NonNullable<RegexConfig['mode']> })
            }
            ariaLabel='Regex mode'
            placeholder='Select mode'
            triggerClassName='mt-2 h-8 w-full border-border bg-card/70 text-xs text-white'
            contentClassName='border-border bg-gray-900'
            options={REGEX_MODE_OPTIONS}
           title='Select mode'/>
        </div>
        <div>
          <Label className='text-xs text-gray-400'>Match Mode</Label>
          <SelectSimple
            size='sm'
            value={regexConfig.matchMode ?? 'first'}
            onValueChange={(value: string): void =>
              onUpdateRegex({ matchMode: value as NonNullable<RegexConfig['matchMode']> })
            }
            ariaLabel='Regex match mode'
            placeholder='Select mode'
            triggerClassName='mt-2 h-8 w-full border-border bg-card/70 text-xs text-white'
            contentClassName='border-border bg-gray-900'
            options={REGEX_MATCH_MODE_OPTIONS}
           title='Select mode'/>
          <p className='mt-1 text-[11px] text-gray-500'>
            First overall stops after the first match across all inputs.
          </p>
        </div>
        <div>
          <Label className='text-xs text-gray-400'>Grouped Output Mode</Label>
          <SelectSimple
            size='sm'
            value={regexConfig.outputMode ?? 'object'}
            onValueChange={(value: string): void =>
              onUpdateRegex({ outputMode: value as NonNullable<RegexConfig['outputMode']> })
            }
            ariaLabel='Grouped output mode'
            placeholder='Select output'
            triggerClassName='mt-2 h-8 w-full border-border bg-card/70 text-xs text-white'
            contentClassName='border-border bg-gray-900'
            options={REGEX_OUTPUT_MODE_OPTIONS}
           title='Select output'/>
        </div>
      </div>

      <div>
        <Label className='text-xs text-gray-400'>JSON Integrity Policy</Label>
        <SelectSimple
          size='sm'
          value={regexConfig.jsonIntegrityPolicy ?? 'repair'}
          onValueChange={(value: string): void =>
            onUpdateRegex({
              jsonIntegrityPolicy: value === 'strict' ? 'strict' : 'repair',
            })
          }
          ariaLabel='JSON integrity policy'
          placeholder='Select policy'
          triggerClassName='mt-2 h-8 w-full border-border bg-card/70 text-xs text-white md:w-[280px]'
          contentClassName='border-border bg-gray-900'
          options={JSON_INTEGRITY_POLICY_OPTIONS}
         title='Select policy'/>
        <p className='mt-1 text-[11px] text-gray-500'>
          Applies in <span className='text-gray-300'>extract_json</span> mode.
        </p>
      </div>

      <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
        <div>
          <Label className='text-xs text-gray-400'>
            {isExtractMode ? 'Extract By' : 'Group By'}
          </Label>
          <Input
            className='mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white'
            value={regexConfig.groupBy ?? 'match'}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
              onUpdateVariantField('groupBy', event.target.value)
            }
            aria-label={isExtractMode ? 'Extract by' : 'Group by'}
            placeholder={
              isExtractMode ? 'match | 1 | amount | groups | captures' : 'match | 1 | prefix'
            }
           title={isExtractMode ? 'match | 1 | amount | groups | captures' : 'match | 1 | prefix'}/>
          <p className='mt-1 text-[11px] text-gray-500'>
            {isExtractMode ? (
              <>
                Use <span className='text-gray-300'>match</span>, a capture index, a named group,{' '}
                <span className='text-gray-300'>groups</span> (named-group object), or{' '}
                <span className='text-gray-300'>captures</span> (captures array).
                {regexMode === 'extract_json' ? (
                  <span className='mt-1 block text-gray-400'>
                    Extract JSON parses the selected value when possible.
                  </span>
                ) : null}
              </>
            ) : (
              <>
                Use <span className='text-gray-300'>match</span>, a capture index (1,2,...) or a
                named group.
              </>
            )}
          </p>
        </div>
        <div className='flex flex-col justify-between gap-2'>
          <ToggleRow
            variant='switch'
            label='Split lines'
            description='Treat each line as an input item.'
            checked={regexConfig.splitLines ?? true}
            onCheckedChange={(checked: boolean) => onUpdateRegex({ splitLines: checked })}
            className='flex-1'
          />
          <ToggleRow
            variant='switch'
            label='Include unmatched'
            description={
              isExtractMode
                ? 'Keep non-matching inputs in matches with the fallback key.'
                : 'Keep non-matching inputs under a group key.'
            }
            checked={regexConfig.includeUnmatched ?? true}
            onCheckedChange={(checked: boolean) => onUpdateRegex({ includeUnmatched: checked })}
            className='flex-1'
          />
        </div>
      </div>

      <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
        <div>
          <Label className='text-xs text-gray-400'>Unmatched Key</Label>
          <Input
            className='mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white'
            value={regexConfig.unmatchedKey ?? '__unmatched__'}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
              onUpdateRegex({ unmatchedKey: event.target.value })
            }
            aria-label='Unmatched key'
            placeholder='__unmatched__'
           title='__unmatched__'/>
        </div>
        <div className='rounded-md border border-border bg-card/50 px-3 py-2'>
          <div className='text-[11px] text-gray-300'>Validation</div>
          <div
            className={`mt-1 text-[11px] ${regexValidation.ok ? 'text-emerald-200' : 'text-rose-200'}`}
          >
            {regexValidation.ok ? 'Regex compiles' : regexValidation.error}
          </div>
          {!regexValidation.ok ? (
            <div className='mt-1 text-[11px] text-gray-500'>
              Tip: use <span className='text-gray-300'>\</span> to escape backslashes in string
              patterns.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
