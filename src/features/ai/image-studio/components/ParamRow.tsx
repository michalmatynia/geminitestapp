'use client';

import { Repeat2 } from 'lucide-react';
import React, { useCallback } from 'react';

import { Button, Checkbox, Input, Textarea, SelectSimple } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { usePromptState, usePromptActions } from '../context/PromptContext';
import {
  isParamUiControl,
  paramUiControlLabel,
  recommendParamUiControl,
  type ParamUiControl,
} from '@/shared/lib/ai/image-studio/utils/param-ui';
import { type ParamLeaf } from '@/shared/lib/ai/image-studio/utils/prompt-params';
import { type ParamSpec } from '@/shared/contracts/prompt-engine';

function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export const ParamRow = React.memo(function ParamRow({
  leaf,
}: {
  leaf: ParamLeaf;
}): React.JSX.Element {
  const { paramSpecs, paramUiOverrides, paramFlipMap, issuesByPath } = usePromptState();
  const { onParamChange, onParamFlip, onParamUiControlChange } = usePromptActions();

  const spec = paramSpecs?.[leaf.path];
  const uiControl = paramUiOverrides[leaf.path] ?? 'auto';
  const flipped = Boolean(paramFlipMap[leaf.path]);
  const issues = issuesByPath[leaf.path] ?? [];
  const onChange = useCallback(
    (value: unknown): void => onParamChange(leaf.path, value),
    [onParamChange, leaf.path]
  );
  const onFlip = useCallback((): void => onParamFlip(leaf.path), [onParamFlip, leaf.path]);
  const onUiControlChange = useCallback(
    (control: ParamUiControl): void => onParamUiControlChange(leaf.path, control),
    [onParamUiControlChange, leaf.path]
  );
  const value = leaf.value;

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const borderClass =
    errors.length > 0
      ? 'border-red-500/60'
      : warnings.length > 0
        ? 'border-yellow-500/50'
        : 'border-border';

  const isNumber = typeof value === 'number' && Number.isFinite(value);
  const isBool = typeof value === 'boolean';
  const isString = typeof value === 'string';

  const kind: ParamSpec['kind'] =
    spec?.kind ??
    (Array.isArray(value)
      ? 'json'
      : isBool
        ? 'boolean'
        : isNumber
          ? 'number'
          : isString
            ? 'string'
            : 'json');

  const uiKind: ParamSpec['kind'] =
    (kind === 'boolean' && !isBool) ||
    (kind === 'number' && !isNumber) ||
    (kind === 'enum' && !isString) ||
    (kind === 'string' && !isString) ||
    (kind === 'rgb' && !Array.isArray(value)) ||
    (kind === 'tuple2' && !Array.isArray(value))
      ? 'json'
      : kind;

  let recommendationSpec: ParamSpec | undefined;
  if (spec) {
    recommendationSpec = {
      ...spec,
      kind: uiKind,
    };
  }
  const recommendation = recommendParamUiControl(value, recommendationSpec);
  const selectedUiControl = uiControl;
  const requestedControl =
    selectedUiControl === 'auto' ? recommendation.recommended : selectedUiControl;
  const autoLabel = `Auto (${paramUiControlLabel(recommendation.recommended)})`;
  const canSlider = recommendation.canSlider;
  const uiControlOptions = recommendation.options.map((opt: ParamUiControl) => ({
    value: opt,
    label: opt === 'auto' ? autoLabel : paramUiControlLabel(opt),
  }));
  const enumOptions = spec?.enumOptions?.map((opt: string) => ({ value: opt, label: opt })) ?? [];

  return (
    <div className={cn('rounded border bg-card/60 p-2', borderClass)}>
      <div className='mb-2 flex items-center justify-between gap-2'>
        <div className='min-w-0'>
          <div className='truncate font-mono text-[11px] text-gray-200'>{leaf.path}</div>
        </div>
        <div className='flex items-center gap-2'>
          <div className='text-[11px] text-gray-400'>
            {Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value}
          </div>
          <Button
            size='xs'
            type='button'
            variant='ghost'
            title={flipped ? 'Show value' : 'Edit selector'}
            onClick={onFlip}
          >
            <Repeat2 className='size-4' />
          </Button>
        </div>
      </div>

      {flipped ? (
        <div className='space-y-2'>
          <div className='flex items-center gap-2'>
            <div className='text-[11px] text-gray-400'>Selector</div>
            <SelectSimple
              size='sm'
              className='w-[140px]'
              value={selectedUiControl}
              onValueChange={(next: string) => {
                if (!isParamUiControl(next)) return;
                onUiControlChange(next);
              }}
              options={uiControlOptions}
              triggerClassName='h-7 px-2'
              ariaLabel='Parameter control selector'
            />
          </div>

          {spec?.hint ? (
            <div className='text-[11px] text-gray-500'>
              Hint: <span className='text-gray-400'>{spec.hint}</span>
            </div>
          ) : null}

          {selectedUiControl === 'auto' && recommendation.reason ? (
            <div className='text-[11px] text-gray-500'>
              Suggestion: <span className='text-gray-400'>{recommendation.reason}</span>
            </div>
          ) : null}

          {errors.length > 0 || warnings.length > 0 ? (
            <div className='space-y-1 text-[11px]'>
              {errors.map((issue) => (
                <div key={`${issue.path}:${issue.code ?? issue.message}`} className='text-red-300'>
                  {issue.message}
                </div>
              ))}
              {warnings.map((issue) => (
                <div
                  key={`${issue.path}:${issue.code ?? issue.message}`}
                  className='text-yellow-300'
                >
                  {issue.message}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <>
          {requestedControl !== 'json' && uiKind === 'boolean' && isBool ? (
            requestedControl === 'buttons' ? (
              <div className='flex items-center gap-2'>
                <Button
                  size='xs'
                  type='button'
                  variant={value ? 'secondary' : 'outline'}
                  onClick={() => onChange(true)}
                >
                  true
                </Button>
                <Button
                  size='xs'
                  type='button'
                  variant={!value ? 'secondary' : 'outline'}
                  onClick={() => onChange(false)}
                >
                  false
                </Button>
              </div>
            ) : (
              <label className='flex cursor-pointer items-center gap-2 text-xs text-gray-200'>
                <Checkbox
                  checked={value}
                  onCheckedChange={(checked: boolean | 'indeterminate') =>
                    onChange(Boolean(checked))
                  }
                />
                <span>{value ? 'true' : 'false'}</span>
              </label>
            )
          ) : null}

          {requestedControl !== 'json' &&
          uiKind === 'enum' &&
          typeof value === 'string' &&
          spec?.enumOptions ? (
              requestedControl === 'buttons' ? (
                <div className='flex flex-wrap gap-2'>
                  {spec.enumOptions.map((opt: string) => (
                    <Button
                      size='xs'
                      key={opt}
                      type='button'
                      variant={opt === value ? 'secondary' : 'outline'}
                      onClick={() => onChange(opt)}
                    >
                      {opt}
                    </Button>
                  ))}
                </div>
              ) : requestedControl === 'text' ? (
                <Input
                  size='sm'
                  value={value}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
                  className='h-8'
                />
              ) : (
                <SelectSimple
                  size='sm'
                  value={value}
                  onValueChange={(next: string) => onChange(next)}
                  options={enumOptions}
                  triggerClassName='h-8'
                  ariaLabel='Enum parameter value'
                />
              )
            ) : null}

          {requestedControl !== 'json' && uiKind === 'number' && isNumber ? (
            <div className='space-y-2'>
              {requestedControl === 'slider' && canSlider ? (
                <input
                  type='range'
                  min={spec?.min ?? 0}
                  max={spec?.max ?? 1}
                  step={spec?.step ?? 0.01}
                  value={Math.min(spec?.max ?? value, Math.max(spec?.min ?? value, value))}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const next = Number(e.target.value);
                    if (!Number.isFinite(next)) return;
                    onChange(next);
                  }}
                  className='w-full'
                />
              ) : null}
              <Input
                size='sm'
                type='number'
                value={String(value)}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const next = Number(e.target.value);
                  if (!Number.isFinite(next)) return;
                  onChange(next);
                }}
                min={spec?.min}
                max={spec?.max}
                step={spec?.step}
                className='h-8'
              />
            </div>
          ) : null}

          {requestedControl !== 'json' && uiKind === 'rgb' && Array.isArray(value) ? (
            <div className='grid grid-cols-3 gap-2'>
              {['R', 'G', 'B'].map((label: string, index: number) => (
                <div key={label} className='space-y-1'>
                  <div className='text-[10px] text-gray-500'>{label}</div>
                  <Input
                    size='sm'
                    type='number'
                    value={String((value as unknown[])[index] ?? '')}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const next = Number(e.target.value);
                      if (!Number.isFinite(next)) return;
                      const nextRgb = [...(value as unknown[])];
                      nextRgb[index] = next;
                      onChange(nextRgb);
                    }}
                    min={spec?.min ?? 0}
                    max={spec?.max ?? 255}
                    step={spec?.step ?? 1}
                    className='h-8'
                  />
                </div>
              ))}
            </div>
          ) : null}

          {requestedControl !== 'json' && uiKind === 'tuple2' && Array.isArray(value) ? (
            <div className='grid grid-cols-2 gap-2'>
              {['X', 'Y'].map((label: string, index: number) => (
                <div key={label} className='space-y-1'>
                  <div className='text-[10px] text-gray-500'>{label}</div>
                  <Input
                    size='sm'
                    type='number'
                    value={String((value as unknown[])[index] ?? '')}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const next = Number(e.target.value);
                      if (!Number.isFinite(next)) return;
                      const nextTuple = [...(value as unknown[])];
                      nextTuple[index] = next;
                      onChange(nextTuple);
                    }}
                    min={spec?.min}
                    max={spec?.max}
                    step={spec?.step ?? 1}
                    className='h-8'
                  />
                </div>
              ))}
            </div>
          ) : null}

          {requestedControl !== 'json' && uiKind === 'string' && isString ? (
            requestedControl === 'textarea' ? (
              <Textarea
                size='sm'
                value={value}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
                className='h-24 font-mono text-[11px]'
              />
            ) : (
              <Input
                size='sm'
                value={value}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
                className='h-8'
              />
            )
          ) : null}

          {uiKind === 'json' || requestedControl === 'json' ? (
            <Textarea
              size='sm'
              value={safeJsonStringify(value)}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                const raw = e.target.value;
                try {
                  onChange(JSON.parse(raw) as unknown);
                } catch {
                  onChange(raw);
                }
              }}
              className='h-24 font-mono text-[11px]'
            />
          ) : null}
        </>
      )}
    </div>
  );
});
