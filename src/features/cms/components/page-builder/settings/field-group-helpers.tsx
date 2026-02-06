'use client';

import React from 'react';

import { Input, Label } from '@/shared/ui';

import { SettingsFieldRenderer } from '../SettingsFieldRenderer';

import type { SettingsField } from '../../../types/page-builder';

const PADDING_KEYS = new Set(['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft']);
const MARGIN_KEYS = new Set(['marginTop', 'marginRight', 'marginBottom', 'marginLeft']);
const MANAGEMENT_FIELDS: SettingsField[] = [
  { key: 'label', label: 'Label', type: 'text', defaultValue: '' },
  { key: 'notes', label: 'Internal notes', type: 'text', defaultValue: '' },
];

function prependManagementFields(schema: SettingsField[]): SettingsField[] {
  const existing = new Set(schema.map((field: SettingsField) => field.key));
  const extra = MANAGEMENT_FIELDS.filter((field: SettingsField) => !existing.has(field.key));
  return extra.length ? [...extra, ...schema] : schema;
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
    if (paddingBuf.length) { groups.push({ kind: 'padding', fields: paddingBuf }); paddingBuf = []; }
  };
  const flushMargin = (): void => {
    if (marginBuf.length) { groups.push({ kind: 'margin', fields: marginBuf }); marginBuf = []; }
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
  settings: Record<string, unknown>,
  onChange: (key: string, value: unknown) => void,
  resolveField?: (field: SettingsField) => SettingsField,
): React.ReactNode[] {
  return groups.map((group: FieldGroup) => {
    if (group.kind === 'single') {
      const raw = group.fields[0]!;
      const field = resolveField ? resolveField(raw) : raw;
      const legacyBackground =
        field.type === 'background' && settings[field.key] === undefined
          ? ((): Record<string, unknown> | undefined => {
            const bgColor = settings['backgroundColor'];
            if (typeof bgColor !== 'string') return undefined;
            const trimmed = bgColor.trim();
            if (!trimmed) return undefined;
            return { type: 'solid', color: trimmed };
          })()
          : undefined;
      return (
        <SettingsFieldRenderer
          key={field.key}
          field={field}
          value={legacyBackground ?? settings[field.key]}
          onChange={onChange}
        />
      );
    }
    const label = group.kind === 'padding' ? 'Padding' : 'Margin';
    return (
      <div key={group.kind} className="space-y-1.5">
        <Label className="text-xs text-gray-400">{label}</Label>
        <div className="grid grid-cols-2 gap-2">
          {group.fields.map((field: SettingsField) => (
            <div key={field.key} className="space-y-0.5">
              <span className="text-[10px] text-gray-500 uppercase">
                {field.key.replace(/^(padding|margin)/, '')}
              </span>
              <Input
                type="number"
                value={(settings[field.key] as number) ?? field.defaultValue ?? 0}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => onChange(field.key, Number(e.target.value))}
                className="text-xs h-7 px-1.5"
              />
            </div>
          ))}
        </div>
      </div>
    );
  });
}

export { PADDING_KEYS, MARGIN_KEYS, MANAGEMENT_FIELDS, prependManagementFields, groupSettingsFields, renderFieldGroups };
export type { FieldGroup };
