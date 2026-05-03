'use client';

import { Trash2 } from 'lucide-react';
import { type JSX } from 'react';

import { Button, Card, Input, Label, Switch } from '@/shared/ui/primitives.public';

import { BUILTIN_TRANSFORMS } from '../transforms';
import type { FieldBinding, FieldMap, FieldMapTargetField } from '../types';

const TARGET_FIELDS: FieldMapTargetField[] = [
  'title',
  'description',
  'price',
  'currency',
  'images',
  'sku',
  'ean',
  'brand',
  'category',
  'sourceUrl',
  'externalId',
];

const TRANSFORM_NAMES = Object.keys(BUILTIN_TRANSFORMS).sort();

export type ScripterFieldMapFormProps = {
  fieldMap: FieldMap;
  onChange: (fieldMap: FieldMap) => void;
};

const PathChain = ({
  paths,
  onChange,
}: {
  paths: string[];
  onChange: (paths: string[]) => void;
}): JSX.Element => (
  <div className='space-y-1'>
    {paths.map((path, idx) => (
      <div key={idx} className='flex items-center gap-2'>
        <Input
          value={path}
          onChange={(e) => {
            const next = [...paths];
            next[idx] = e.target.value;
            onChange(next);
          }}
          placeholder={idx === 0 ? '$.field.path' : 'fallback path'}
          className='font-mono text-xs'
        />
        <Button
          type='button'
          size='icon'
          variant='ghost'
          onClick={() => onChange(paths.filter((_, i) => i !== idx))}
          aria-label='Remove path'
        >
          <Trash2 className='size-4 text-destructive' />
        </Button>
      </div>
    ))}
    <Button
      type='button'
      size='sm'
      variant='ghost'
      onClick={() => onChange([...paths, ''])}
    >
      + fallback path
    </Button>
  </div>
);

const TransformChain = ({
  transforms,
  onChange,
}: {
  transforms: NonNullable<FieldBinding['transforms']>;
  onChange: (next: FieldBinding['transforms']) => void;
}): JSX.Element => (
  <div className='space-y-1'>
    {transforms.map((transform, idx) => (
      <div key={idx} className='flex items-center gap-2'>
        <select
          className='h-9 rounded-md border border-input bg-background px-2 text-xs'
          value={transform.name}
          onChange={(e) => {
            const next = [...transforms];
            next[idx] = { ...transform, name: e.target.value };
            onChange(next);
          }}
        >
          {TRANSFORM_NAMES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <Input
          value={transform.args ? JSON.stringify(transform.args) : ''}
          placeholder='args (JSON, optional)'
          className='flex-1 font-mono text-xs'
          onChange={(e) => {
            const raw = e.target.value.trim();
            const next = [...transforms];
            if (!raw) {
              const { args: _drop, ...rest } = transform;
              next[idx] = rest;
            } else {
              try {
                const parsed = JSON.parse(raw) as Record<string, unknown>;
                next[idx] = { ...transform, args: parsed };
              } catch {
                next[idx] = { ...transform, args: { __invalid: raw } };
              }
            }
            onChange(next);
          }}
        />
        <Button
          type='button'
          size='icon'
          variant='ghost'
          onClick={() => onChange(transforms.filter((_, i) => i !== idx))}
          aria-label='Remove transform'
        >
          <Trash2 className='size-4 text-destructive' />
        </Button>
      </div>
    ))}
    <Button
      type='button'
      size='sm'
      variant='ghost'
      onClick={() => onChange([...transforms, { name: TRANSFORM_NAMES[0]! }])}
    >
      + transform
    </Button>
  </div>
);

const FieldBindingRow = ({
  field,
  binding,
  onChange,
  onRemove,
}: {
  field: FieldMapTargetField;
  binding: FieldBinding;
  onChange: (binding: FieldBinding) => void;
  onRemove: () => void;
}): JSX.Element => {
  const paths = binding.paths ?? (binding.path ? [binding.path] : ['']);
  const transforms = binding.transforms ?? [];
  const updatePaths = (next: string[]): void => {
    const cleaned = next.filter((p) => p.trim().length > 0);
    if (cleaned.length === 0) {
      const { path: _p, paths: _ps, ...rest } = binding;
      onChange({ ...rest });
      return;
    }
    if (cleaned.length === 1) {
      const { paths: _ps, ...rest } = binding;
      onChange({ ...rest, path: cleaned[0] });
    } else {
      const { path: _p, ...rest } = binding;
      onChange({ ...rest, paths: cleaned });
    }
  };
  return (
    <Card className='p-3'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <Label className='text-sm font-semibold'>{field}</Label>
          <label className='flex items-center gap-1 text-xs text-muted-foreground'>
            <Switch
              checked={binding.required ?? false}
              onCheckedChange={(value) => onChange({ ...binding, required: value || undefined })}
            />
            required
          </label>
        </div>
        <Button type='button' size='icon' variant='ghost' onClick={onRemove} aria-label='Remove binding'>
          <Trash2 className='size-4 text-destructive' />
        </Button>
      </div>
      <div className='mt-2 space-y-2'>
        <div className='space-y-1'>
          <Label className='text-xs uppercase tracking-wide text-muted-foreground'>
            Paths (first non-empty wins)
          </Label>
          <PathChain paths={paths} onChange={updatePaths} />
        </div>
        <div className='space-y-1'>
          <Label className='text-xs uppercase tracking-wide text-muted-foreground'>
            Transform chain
          </Label>
          <TransformChain transforms={transforms} onChange={(next) => onChange({ ...binding, transforms: next?.length ? next : undefined })} />
        </div>
        <div className='space-y-1'>
          <Label className='text-xs uppercase tracking-wide text-muted-foreground'>
            Fallback (used if mapped value is empty)
          </Label>
          <Input
            value={binding.fallback === undefined ? '' : String(binding.fallback)}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '') {
                const { fallback: _f, ...rest } = binding;
                onChange(rest);
              } else {
                onChange({ ...binding, fallback: value });
              }
            }}
            placeholder='(none)'
          />
        </div>
      </div>
    </Card>
  );
};

export function ScripterFieldMapForm({ fieldMap, onChange }: ScripterFieldMapFormProps): JSX.Element {
  const bindings = fieldMap.bindings;
  const usedFields = Object.keys(bindings) as FieldMapTargetField[];
  const availableToAdd = TARGET_FIELDS.filter((f) => !usedFields.includes(f));
  return (
    <div className='space-y-3'>
      {usedFields.map((field) => (
        <FieldBindingRow
          key={field}
          field={field}
          binding={bindings[field] as FieldBinding}
          onChange={(next) => onChange({ ...fieldMap, bindings: { ...bindings, [field]: next } })}
          onRemove={() => {
            const next = { ...bindings };
            delete next[field];
            onChange({ ...fieldMap, bindings: next });
          }}
        />
      ))}
      {availableToAdd.length > 0 && (
        <div className='flex items-center gap-2'>
          <select
            className='h-9 rounded-md border border-input bg-background px-2 text-sm'
            value=''
            onChange={(e) => {
              const field = e.target.value as FieldMapTargetField;
              if (!field) return;
              onChange({
                ...fieldMap,
                bindings: { ...bindings, [field]: { path: '' } },
              });
            }}
          >
            <option value=''>Add binding for…</option>
            {availableToAdd.map((field) => (
              <option key={field} value={field}>
                {field}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
