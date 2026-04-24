'use client';

import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { type JSX, useCallback } from 'react';

import { Badge, Button, Card, Input, Label } from '@/shared/ui/primitives.public';

import type { ScripterExtractionStep } from '../types';

export type ScripterStepFormProps = {
  step: ScripterExtractionStep;
  index: number;
  total: number;
  selectedFieldKey?: string | null;
  onChange: (step: ScripterExtractionStep) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (index: number) => void;
  onProbeSelector?: (selector: string) => void;
};

const STEP_KIND_LABELS: Record<ScripterExtractionStep['kind'], string> = {
  goto: 'Navigate',
  dismissConsent: 'Dismiss consent',
  waitFor: 'Wait',
  extractJsonLd: 'Extract JSON-LD',
  extractList: 'Extract list',
  paginate: 'Paginate',
};

const StepHeader = ({
  index,
  total,
  step,
  onMove,
  onRemove,
}: {
  index: number;
  total: number;
  step: ScripterExtractionStep;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (index: number) => void;
}): JSX.Element => (
  <div className='flex items-center justify-between gap-2 border-b border-border/40 px-3 py-2'>
    <div className='flex min-w-0 flex-wrap items-center gap-2'>
      <Badge variant='secondary'>{STEP_KIND_LABELS[step.kind]}</Badge>
      <span className='truncate text-sm font-medium'>{step.label || step.id}</span>
    </div>
    <div className='flex items-center gap-1'>
      <Button
        type='button'
        size='icon'
        variant='ghost'
        disabled={index === 0}
        onClick={() => onMove(index, -1)}
        aria-label='Move step up'
      >
        <ChevronUp className='size-4' />
      </Button>
      <Button
        type='button'
        size='icon'
        variant='ghost'
        disabled={index === total - 1}
        onClick={() => onMove(index, 1)}
        aria-label='Move step down'
      >
        <ChevronDown className='size-4' />
      </Button>
      <Button
        type='button'
        size='icon'
        variant='ghost'
        onClick={() => onRemove(index)}
        aria-label='Remove step'
      >
        <Trash2 className='size-4 text-destructive' />
      </Button>
    </div>
  </div>
);

const TextRow = ({
  label,
  value,
  onChange,
  placeholder,
  monospace,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  monospace?: boolean;
}): JSX.Element => (
  <div className='space-y-1'>
    <Label className='text-xs uppercase tracking-wide text-muted-foreground'>{label}</Label>
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={monospace ? 'font-mono text-sm' : ''}
    />
  </div>
);

const NumberRow = ({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  placeholder?: string;
}): JSX.Element => (
  <div className='space-y-1'>
    <Label className='text-xs uppercase tracking-wide text-muted-foreground'>{label}</Label>
    <Input
      type='number'
      value={value === undefined ? '' : value}
      onChange={(e) => {
        const raw = e.target.value.trim();
        if (raw === '') { onChange(undefined); return; }
        const parsed = Number(raw);
        onChange(Number.isFinite(parsed) ? parsed : undefined);
      }}
      placeholder={placeholder}
    />
  </div>
);

const SelectorList = ({
  values,
  onChange,
  onProbe,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  onProbe?: (selector: string) => void;
}): JSX.Element => (
  <div className='space-y-2'>
    {values.map((selector, idx) => (
      <div key={idx} className='flex items-center gap-2'>
        <Input
          value={selector}
          onChange={(e) => {
            const next = [...values];
            next[idx] = e.target.value;
            onChange(next);
          }}
          placeholder='CSS selector'
          className='font-mono text-sm'
        />
        {onProbe ? (
          <Button type='button' size='sm' variant='outline' onClick={() => onProbe(selector)}>
            Try
          </Button>
        ) : null}
        <Button
          type='button'
          size='icon'
          variant='ghost'
          onClick={() => onChange(values.filter((_, i) => i !== idx))}
          aria-label='Remove selector'
        >
          <Trash2 className='size-4 text-destructive' />
        </Button>
      </div>
    ))}
    <Button
      type='button'
      size='sm'
      variant='outline'
      onClick={() => onChange([...values, ''])}
    >
      Add selector
    </Button>
  </div>
);

type FieldSpec = NonNullable<Extract<ScripterExtractionStep, { kind: 'extractList' }>['fields'][string]>;

const ExtractListFieldsEditor = ({
  fields,
  onChange,
  onProbeSelector,
}: {
  fields: Record<string, FieldSpec>;
  onChange: (next: Record<string, FieldSpec>) => void;
  onProbeSelector?: (selector: string) => void;
}): JSX.Element => {
  const entries = Object.entries(fields);
  const updateField = useCallback(
    (key: string, mutator: (spec: FieldSpec) => FieldSpec) => {
      const next: Record<string, FieldSpec> = {};
      for (const [k, v] of entries) next[k] = k === key ? mutator(v) : v;
      onChange(next);
    },
    [entries, onChange]
  );
  const renameField = (oldKey: string, newKey: string): void => {
    if (!newKey || newKey === oldKey) return;
    const next: Record<string, FieldSpec> = {};
    for (const [k, v] of entries) next[k === oldKey ? newKey : k] = v;
    onChange(next);
  };
  return (
    <div className='space-y-3'>
      {entries.map(([key, spec]) => (
        <div key={key} className='rounded border border-border/40 p-2'>
          <div className='flex items-center gap-2'>
            <Input
              value={key}
              onChange={(e) => renameField(key, e.target.value.trim())}
              placeholder='field name'
              className='max-w-[180px]'
            />
            <Input
              value={spec.selector ?? ''}
              onChange={(e) => updateField(key, (s) => ({ ...s, selector: e.target.value || undefined }))}
              placeholder='CSS selector (relative to item)'
              className='flex-1 font-mono text-sm'
            />
            {onProbeSelector && spec.selector ? (
              <Button type='button' size='sm' variant='outline' onClick={() => onProbeSelector(spec.selector!)}>
                Try
              </Button>
            ) : null}
            <Button
              type='button'
              size='icon'
              variant='ghost'
              onClick={() => {
                const next: Record<string, FieldSpec> = {};
                for (const [k, v] of entries) if (k !== key) next[k] = v;
                onChange(next);
              }}
              aria-label='Remove field'
            >
              <Trash2 className='size-4 text-destructive' />
            </Button>
          </div>
          <div className='mt-2 flex flex-wrap items-center gap-3 text-xs'>
            <Input
              value={spec.attribute ?? ''}
              onChange={(e) => updateField(key, (s) => ({ ...s, attribute: e.target.value || undefined }))}
              placeholder='attribute (e.g. href)'
              className='max-w-[200px] font-mono text-xs'
            />
            <label className='flex items-center gap-1'>
              <input
                type='checkbox'
                checked={spec.html ?? false}
                onChange={(e) => updateField(key, (s) => ({ ...s, html: e.target.checked || undefined }))}
              />
              html
            </label>
            <label className='flex items-center gap-1'>
              <input
                type='checkbox'
                checked={spec.many ?? false}
                onChange={(e) => updateField(key, (s) => ({ ...s, many: e.target.checked || undefined }))}
              />
              many
            </label>
          </div>
        </div>
      ))}
      <Button
        type='button'
        size='sm'
        variant='outline'
        onClick={() => onChange({ ...fields, [`field_${entries.length + 1}`]: {} })}
      >
        Add field
      </Button>
    </div>
  );
};

export function ScripterStepForm({
  step,
  index,
  total,
  onChange,
  onMove,
  onRemove,
  onProbeSelector,
}: ScripterStepFormProps): JSX.Element {
  const update = (patch: Partial<ScripterExtractionStep>): void => {
    onChange({ ...step, ...patch } as ScripterExtractionStep);
  };
  return (
    <Card className='overflow-hidden'>
      <StepHeader index={index} total={total} step={step} onMove={onMove} onRemove={onRemove} />
      <div className='space-y-3 px-3 py-3'>
        <div className='grid grid-cols-1 gap-2 md:grid-cols-2'>
          <TextRow label='Step ID' value={step.id} onChange={(v) => update({ id: v })} />
          <TextRow
            label='Label (optional)'
            value={step.label ?? ''}
            onChange={(v) => update({ label: v || undefined })}
          />
        </div>
        {step.kind === 'goto' && (
          <>
            <TextRow
              label='URL'
              value={step.url}
              onChange={(v) => update({ url: v })}
              placeholder='https://shop.example/products'
              monospace
            />
            <div className='space-y-1'>
              <Label className='text-xs uppercase tracking-wide text-muted-foreground'>
                Wait until
              </Label>
              <select
                className='h-9 w-full rounded-md border border-input bg-background px-2 text-sm'
                value={step.waitUntil ?? ''}
                onChange={(e) =>
                  update({ waitUntil: (e.target.value || undefined) as typeof step.waitUntil })
                }
              >
                <option value=''>(default — domcontentloaded)</option>
                <option value='load'>load</option>
                <option value='domcontentloaded'>domcontentloaded</option>
                <option value='networkidle'>networkidle</option>
              </select>
            </div>
          </>
        )}
        {step.kind === 'dismissConsent' && (
          <SelectorList
            values={step.selectors}
            onChange={(next) => update({ selectors: next })}
            onProbe={onProbeSelector}
          />
        )}
        {step.kind === 'waitFor' && (
          <>
            <TextRow
              label='Selector'
              value={step.selector ?? ''}
              onChange={(v) => update({ selector: v || undefined })}
              placeholder='Optional CSS selector'
              monospace
            />
            <div className='grid grid-cols-1 gap-2 md:grid-cols-2'>
              <NumberRow
                label='Timeout (ms)'
                value={step.timeoutMs}
                onChange={(v) => update({ timeoutMs: v })}
              />
              <div className='space-y-1'>
                <Label className='text-xs uppercase tracking-wide text-muted-foreground'>State</Label>
                <select
                  className='h-9 w-full rounded-md border border-input bg-background px-2 text-sm'
                  value={step.state ?? ''}
                  onChange={(e) =>
                    update({ state: (e.target.value || undefined) as typeof step.state })
                  }
                >
                  <option value=''>(default)</option>
                  <option value='attached'>attached</option>
                  <option value='visible'>visible</option>
                  <option value='hidden'>hidden</option>
                  <option value='networkidle'>networkidle</option>
                </select>
              </div>
            </div>
          </>
        )}
        {step.kind === 'extractJsonLd' && (
          <TextRow
            label='Filter @type (optional)'
            value={step.filterType ?? ''}
            onChange={(v) => update({ filterType: v || undefined })}
            placeholder='Product'
            monospace
          />
        )}
        {step.kind === 'extractList' && (
          <>
            <TextRow
              label='Item selector'
              value={step.itemSelector}
              onChange={(v) => update({ itemSelector: v })}
              placeholder='.product-card'
              monospace
            />
            {onProbeSelector && step.itemSelector ? (
              <Button
                type='button'
                size='sm'
                variant='outline'
                onClick={() => onProbeSelector(step.itemSelector)}
              >
                Try item selector
              </Button>
            ) : null}
            <ExtractListFieldsEditor
              fields={step.fields}
              onChange={(next) => update({ fields: next })}
              onProbeSelector={onProbeSelector}
            />
          </>
        )}
        {step.kind === 'paginate' && (
          <>
            <div className='space-y-1'>
              <Label className='text-xs uppercase tracking-wide text-muted-foreground'>
                Strategy
              </Label>
              <select
                className='h-9 w-full rounded-md border border-input bg-background px-2 text-sm'
                value={step.strategy}
                onChange={(e) => update({ strategy: e.target.value as typeof step.strategy })}
              >
                <option value='nextLink'>nextLink — click a "next" element</option>
                <option value='queryParam'>queryParam — bump &amp;page=N</option>
                <option value='infiniteScroll'>infiniteScroll — scroll to bottom</option>
              </select>
            </div>
            {step.strategy === 'nextLink' && (
              <TextRow
                label='Next selector'
                value={step.nextSelector ?? ''}
                onChange={(v) => update({ nextSelector: v || undefined })}
                placeholder='a[rel="next"]'
                monospace
              />
            )}
            {step.strategy === 'queryParam' && (
              <TextRow
                label='Query param'
                value={step.queryParam ?? ''}
                onChange={(v) => update({ queryParam: v || undefined })}
                placeholder='page'
              />
            )}
            <NumberRow
              label='Max pages'
              value={step.maxPages}
              onChange={(v) => update({ maxPages: v })}
              placeholder='5'
            />
          </>
        )}
      </div>
    </Card>
  );
}
