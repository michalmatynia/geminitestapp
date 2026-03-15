'use client';

import React from 'react';

import type { SettingsField } from '@/features/cms/types/page-builder';
import { Input, Label } from '@/shared/ui';

import { SettingsFieldRenderer } from '../SettingsFieldRenderer';


const PADDING_KEYS = new Set(['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft']);
const MARGIN_KEYS = new Set(['marginTop', 'marginRight', 'marginBottom', 'marginLeft']);
const MANAGEMENT_FIELDS: SettingsField[] = [
  { key: 'label', label: 'Label', type: 'text', defaultValue: '' },
  { key: 'notes', label: 'Internal notes', type: 'text', defaultValue: '' },
];
const RUNTIME_VISIBILITY_FIELDS: SettingsField[] = [
  {
    key: 'runtimeVisibilityMode',
    label: 'Runtime visibility',
    type: 'select',
    defaultValue: 'always',
    options: [
      { label: 'Always render', value: 'always' },
      { label: 'Value equals', value: 'equals' },
      { label: 'Value does not equal', value: 'not-equals' },
      { label: 'Value is truthy', value: 'truthy' },
      { label: 'Value is falsy', value: 'falsy' },
    ],
  },
  {
    key: 'runtimeVisibilitySource',
    label: 'Runtime source',
    type: 'text',
    defaultValue: '',
  },
  {
    key: 'runtimeVisibilityPath',
    label: 'Runtime path',
    type: 'text',
    defaultValue: '',
  },
  {
    key: 'runtimeVisibilityValue',
    label: 'Expected value',
    type: 'text',
    defaultValue: '',
  },
];

function prependManagementFields(schema: SettingsField[]): SettingsField[] {
  const existing = new Set(schema.map((field: SettingsField) => field.key));
  const extra = MANAGEMENT_FIELDS.filter((field: SettingsField) => !existing.has(field.key));
  return extra.length ? [...extra, ...schema] : schema;
}

function appendRuntimeVisibilityFields(schema: SettingsField[]): SettingsField[] {
  const existing = new Set(schema.map((field: SettingsField) => field.key));
  const extra = RUNTIME_VISIBILITY_FIELDS.filter(
    (field: SettingsField) => !existing.has(field.key)
  );
  return extra.length ? [...schema, ...extra] : schema;
}

interface FieldGroup {
  kind: 'single' | 'padding' | 'margin';
  fields: SettingsField[];
}

/** Groups consecutive padding / margin number fields so they render compactly. */
function groupSettingsFields(schema: SettingsField[]): FieldGroup[] {
  const groups: FieldGroup[] = [];
  let paddingBuf: SettingsField[] = [];
  let marginBuf: SettingsField[] = [];

  const flushPadding = (): void => {
    if (paddingBuf.length) {
      groups.push({ kind: 'padding', fields: paddingBuf });
      paddingBuf = [];
    }
  };
  const flushMargin = (): void => {
    if (marginBuf.length) {
      groups.push({ kind: 'margin', fields: marginBuf });
      marginBuf = [];
    }
  };

  for (const field of schema) {
    if (PADDING_KEYS.has(field.key)) {
      flushMargin();
      paddingBuf.push(field);
    } else if (MARGIN_KEYS.has(field.key)) {
      flushPadding();
      marginBuf.push(field);
    } else {
      flushPadding();
      flushMargin();
      groups.push({ kind: 'single', fields: [field] });
    }
  }
  flushPadding();
  flushMargin();
  return groups;
}

function renderFieldGroups(
  groups: FieldGroup[],
  settings?: Record<string, unknown>,
  onChange?: (key: string, value: unknown) => void,
  resolveField?: (field: SettingsField) => SettingsField
): React.ReactNode[] {
  const effectiveSettings = settings ?? {};
  const effectiveOnChange = onChange;

  return groups.map((group: FieldGroup) => {
    if (group.kind === 'single') {
      const raw = group.fields[0]!;
      const field = resolveField ? resolveField(raw) : raw;
      return (
        <SettingsFieldRenderer
          key={field.key}
          field={field}
          value={effectiveSettings[field.key]}
          onChange={effectiveOnChange}
        />
      );
    }
    const label = group.kind === 'padding' ? 'Padding' : 'Margin';
    return (
      <div key={group.kind} className='space-y-1.5'>
        <Label className='text-xs text-gray-400'>{label}</Label>
        <div className='grid grid-cols-2 gap-2'>
          {group.fields.map((field: SettingsField) => {
            const side = field.key.replace(/^(padding|margin)/, '');
            return (
              <div key={field.key} className='space-y-0.5'>
                <span className='text-[10px] text-gray-500 uppercase'>{side}</span>
                <Input
                  type='number'
                  value={(effectiveSettings[field.key] as number) ?? field.defaultValue ?? 0}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                    if (effectiveOnChange) {
                      effectiveOnChange(field.key, Number(e.target.value));
                    }
                  }}
                  className='text-xs h-7 px-1.5'
                  aria-label={`${label} ${side}`.trim()}
                 title='Input field'/>
              </div>
            );
          })}
        </div>
      </div>
    );
  });
}

export {
  PADDING_KEYS,
  MARGIN_KEYS,
  MANAGEMENT_FIELDS,
  RUNTIME_VISIBILITY_FIELDS,
  prependManagementFields,
  appendRuntimeVisibilityFields,
  groupSettingsFields,
  renderFieldGroups,
};
export type { FieldGroup };
