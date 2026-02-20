'use client';

import React, { useCallback } from 'react';

import { DEFAULT_ANIMATION_CONFIG } from '@/features/gsap';
import {
  FormSection,
  FormField,
  Card,
} from '@/shared/ui';

import { useAnimationConfigContext } from './AnimationConfigContext';
import { RangeField, SelectField } from '../shared-fields';
import { ColorPickerField } from './ColorPickerField';
import {
  type VisualFilterType,
  type VisualClipType,
  type VisualShadowValues,
  FILTER_OPTIONS,
  FILTER_META,
  CLIP_OPTIONS,
  clampNumber,
  parseNumber,
  parseFilterString,
  buildFilterString,
  parseClipString,
  buildClipString,
  parseShadow,
  buildShadow,
} from './visual-effect-utils';

export function VisualEffectsSection(): React.ReactNode {
  const { config, onChange } = useAnimationConfigContext();
  const visualFilterFromValue = config.visualFilterFrom ?? DEFAULT_ANIMATION_CONFIG.visualFilterFrom ?? '';
  const visualFilterToValue = config.visualFilterTo ?? DEFAULT_ANIMATION_CONFIG.visualFilterTo ?? '';
  const visualClipFromValue = config.visualClipFrom ?? DEFAULT_ANIMATION_CONFIG.visualClipFrom ?? '';
  const visualClipToValue = config.visualClipTo ?? DEFAULT_ANIMATION_CONFIG.visualClipTo ?? '';
  const visualRadiusFromValue = config.visualRadiusFrom ?? DEFAULT_ANIMATION_CONFIG.visualRadiusFrom ?? '';
  const visualRadiusToValue = config.visualRadiusTo ?? DEFAULT_ANIMATION_CONFIG.visualRadiusTo ?? '';
  const visualShadowFromValue = config.visualShadowFrom ?? DEFAULT_ANIMATION_CONFIG.visualShadowFrom ?? '';
  const visualShadowToValue = config.visualShadowTo ?? DEFAULT_ANIMATION_CONFIG.visualShadowTo ?? '';
  const visualBackgroundFromValue = config.visualBackgroundFrom ?? DEFAULT_ANIMATION_CONFIG.visualBackgroundFrom ?? '';
  const visualBackgroundToValue = config.visualBackgroundTo ?? DEFAULT_ANIMATION_CONFIG.visualBackgroundTo ?? '';

  const resolvedFilterFrom = parseFilterString(visualFilterFromValue);
  const resolvedFilterTo = parseFilterString(visualFilterToValue);
  const filterTypeValue = resolvedFilterFrom?.type ?? resolvedFilterTo?.type ?? 'none';
  const filterMeta = FILTER_META[filterTypeValue];
  const filterFromAmount = clampNumber(
    resolvedFilterFrom?.amount ?? filterMeta.defaultFrom,
    filterMeta.min,
    filterMeta.max
  );
  const filterToAmount = clampNumber(
    resolvedFilterTo?.amount ?? filterMeta.defaultTo,
    filterMeta.min,
    filterMeta.max
  );

  const resolvedClipFrom = parseClipString(visualClipFromValue);
  const resolvedClipTo = parseClipString(visualClipToValue);
  const clipTypeValue = resolvedClipFrom?.type ?? resolvedClipTo?.type ?? 'none';
  const clipFromAmount = clampNumber(resolvedClipFrom?.amount ?? 100, 0, 100);
  const clipToAmount = clampNumber(resolvedClipTo?.amount ?? 0, 0, 100);

  const radiusFromAmount = clampNumber(parseNumber(visualRadiusFromValue, 0), 0, 200);
  const radiusToAmount = clampNumber(parseNumber(visualRadiusToValue, 0), 0, 200);

  const shadowFromValues = parseShadow(visualShadowFromValue);
  const shadowToValues = parseShadow(visualShadowToValue);

  const handleVisualFilterTypeChange = useCallback(
    (value: string): void => {
      const type = value as VisualFilterType;
      if (type === 'none') {
        onChange({ ...config, visualFilterFrom: '', visualFilterTo: '' });
        return;
      }
      const meta = FILTER_META[type];
      const from = clampNumber(resolvedFilterFrom?.amount ?? meta.defaultFrom, meta.min, meta.max);
      const to = clampNumber(resolvedFilterTo?.amount ?? meta.defaultTo, meta.min, meta.max);
      onChange({
        ...config,
        visualFilterFrom: buildFilterString(type, from),
        visualFilterTo: buildFilterString(type, to),
      });
    },
    [config, onChange, resolvedFilterFrom, resolvedFilterTo]
  );

  const handleVisualFilterFromChange = useCallback(
    (value: number): void => {
      if (filterTypeValue === 'none') return;
      onChange({ ...config, visualFilterFrom: buildFilterString(filterTypeValue, value) });
    },
    [config, onChange, filterTypeValue]
  );

  const handleVisualFilterToChange = useCallback(
    (value: number): void => {
      if (filterTypeValue === 'none') return;
      onChange({ ...config, visualFilterTo: buildFilterString(filterTypeValue, value) });
    },
    [config, onChange, filterTypeValue]
  );

  const handleVisualClipTypeChange = useCallback(
    (value: string): void => {
      const type = value as VisualClipType;
      if (type === 'none') {
        onChange({ ...config, visualClipFrom: '', visualClipTo: '' });
        return;
      }
      onChange({
        ...config,
        visualClipFrom: buildClipString(type, clipFromAmount),
        visualClipTo: buildClipString(type, clipToAmount),
      });
    },
    [config, onChange, clipFromAmount, clipToAmount]
  );

  const handleVisualClipFromChange = useCallback(
    (value: number): void => {
      if (clipTypeValue === 'none') return;
      onChange({ ...config, visualClipFrom: buildClipString(clipTypeValue, value) });
    },
    [config, onChange, clipTypeValue]
  );

  const handleVisualClipToChange = useCallback(
    (value: number): void => {
      if (clipTypeValue === 'none') return;
      onChange({ ...config, visualClipTo: buildClipString(clipTypeValue, value) });
    },
    [config, onChange, clipTypeValue]
  );

  const handleVisualRadiusFromChange = useCallback(
    (value: number): void => {
      onChange({ ...config, visualRadiusFrom: `${clampNumber(value, 0, 200)}px` });
    },
    [config, onChange]
  );

  const handleVisualRadiusToChange = useCallback(
    (value: number): void => {
      onChange({ ...config, visualRadiusTo: `${clampNumber(value, 0, 200)}px` });
    },
    [config, onChange]
  );

  const updateShadowValue = useCallback(
    (target: 'from' | 'to', partial: Partial<VisualShadowValues>): void => {
      const current = target === 'from' ? shadowFromValues : shadowToValues;
      const next = { ...current, ...partial };
      const shadow = buildShadow(next);
      onChange({
        ...config,
        [target === 'from' ? 'visualShadowFrom' : 'visualShadowTo']: shadow,
      });
    },
    [config, onChange, shadowFromValues, shadowToValues]
  );

  const handleVisualBackgroundFromChange = useCallback(
    (value: string): void => {
      onChange({ ...config, visualBackgroundFrom: value });
    },
    [config, onChange]
  );

  const handleVisualBackgroundToChange = useCallback(
    (value: string): void => {
      onChange({ ...config, visualBackgroundTo: value });
    },
    [config, onChange]
  );

  return (
    <FormSection title='Visual FX' variant='subtle-compact' className='p-3 space-y-4'>
      <div className='space-y-3 mt-4'>
        <Card variant='subtle-compact' padding='sm' className='border-border/40 bg-card/30 space-y-3'>
          <FormField label='Filter type'>
            <SelectField
              label='Filter type'
              value={filterTypeValue}
              onChange={handleVisualFilterTypeChange}
              options={FILTER_OPTIONS}
            />
          </FormField>
          {filterTypeValue !== 'none' && (
            <div className='grid gap-3 sm:grid-cols-2'>
              <RangeField
                label='Filter from'
                value={filterFromAmount}
                onChange={handleVisualFilterFromChange}
                min={filterMeta.min}
                max={filterMeta.max}
                step={filterMeta.step}
                suffix={filterMeta.unit}
              />
              <RangeField
                label='Filter to'
                value={filterToAmount}
                onChange={handleVisualFilterToChange}
                min={filterMeta.min}
                max={filterMeta.max}
                step={filterMeta.step}
                suffix={filterMeta.unit}
              />
            </div>
          )}
        </Card>

        <Card variant='subtle-compact' padding='sm' className='border-border/40 bg-card/30 space-y-3'>
          <FormField label='Clip path'>
            <SelectField
              label='Clip path'
              value={clipTypeValue}
              onChange={handleVisualClipTypeChange}
              options={CLIP_OPTIONS}
            />
          </FormField>
          {clipTypeValue !== 'none' && (
            <div className='grid gap-3 sm:grid-cols-2'>
              <RangeField
                label='Clip from'
                value={clipFromAmount}
                onChange={handleVisualClipFromChange}
                min={0}
                max={100}
                step={1}
                suffix='%'
              />
              <RangeField
                label='Clip to'
                value={clipToAmount}
                onChange={handleVisualClipToChange}
                min={0}
                max={100}
                step={1}
                suffix='%'
              />
            </div>
          )}
        </Card>

        <Card variant='subtle-compact' padding='sm' className='border-border/40 bg-card/30 space-y-3'>
          <div className='grid gap-3 sm:grid-cols-2'>
            <RangeField
              label='Radius from'
              value={radiusFromAmount}
              onChange={handleVisualRadiusFromChange}
              min={0}
              max={200}
              step={1}
              suffix='px'
            />
            <RangeField
              label='Radius to'
              value={radiusToAmount}
              onChange={handleVisualRadiusToChange}
              min={0}
              max={200}
              step={1}
              suffix='px'
            />
          </div>
        </Card>

        <Card variant='subtle-compact' padding='sm' className='border-border/40 bg-card/30 space-y-3'>
          <FormSection title='Shadow' variant='subtle-compact' className='p-0'>
            <div className='grid gap-4 lg:grid-cols-2 mt-2'>
              <div className='space-y-3'>
                <FormSection title='From' variant='subtle-compact' className='p-0'>
                  <div className='grid gap-3 sm:grid-cols-2 mt-2'>
                    <RangeField
                      label='Offset X'
                      value={shadowFromValues.x}
                      onChange={(value: number) => updateShadowValue('from', { x: value })}
                      min={-60}
                      max={60}
                      step={1}
                      suffix='px'
                    />
                    <RangeField
                      label='Offset Y'
                      value={shadowFromValues.y}
                      onChange={(value: number) => updateShadowValue('from', { y: value })}
                      min={-60}
                      max={60}
                      step={1}
                      suffix='px'
                    />
                    <RangeField
                      label='Blur'
                      value={shadowFromValues.blur}
                      onChange={(value: number) => updateShadowValue('from', { blur: value })}
                      min={0}
                      max={120}
                      step={1}
                      suffix='px'
                    />
                    <RangeField
                      label='Spread'
                      value={shadowFromValues.spread}
                      onChange={(value: number) => updateShadowValue('from', { spread: value })}
                      min={-40}
                      max={40}
                      step={1}
                      suffix='px'
                    />
                    <RangeField
                      label='Opacity'
                      value={shadowFromValues.opacity}
                      onChange={(value: number) => updateShadowValue('from', { opacity: value })}
                      min={0}
                      max={100}
                      step={1}
                      suffix='%'
                    />
                  </div>
                  <ColorPickerField
                    label='Color'
                    value={shadowFromValues.color}
                    onChange={(value: string) => updateShadowValue('from', { color: value })}
                  />
                </FormSection>
              </div>
              <div className='space-y-3'>
                <FormSection title='To' variant='subtle-compact' className='p-0'>
                  <div className='grid gap-3 sm:grid-cols-2 mt-2'>
                    <RangeField
                      label='Offset X'
                      value={shadowToValues.x}
                      onChange={(value: number) => updateShadowValue('to', { x: value })}
                      min={-60}
                      max={60}
                      step={1}
                      suffix='px'
                    />
                    <RangeField
                      label='Offset Y'
                      value={shadowToValues.y}
                      onChange={(value: number) => updateShadowValue('to', { y: value })}
                      min={-60}
                      max={60}
                      step={1}
                      suffix='px'
                    />
                    <RangeField
                      label='Blur'
                      value={shadowToValues.blur}
                      onChange={(value: number) => updateShadowValue('to', { blur: value })}
                      min={0}
                      max={120}
                      step={1}
                      suffix='px'
                    />
                    <RangeField
                      label='Spread'
                      value={shadowToValues.spread}
                      onChange={(value: number) => updateShadowValue('to', { spread: value })}
                      min={-40}
                      max={40}
                      step={1}
                      suffix='px'
                    />
                    <RangeField
                      label='Opacity'
                      value={shadowToValues.opacity}
                      onChange={(value: number) => updateShadowValue('to', { opacity: value })}
                      min={0}
                      max={100}
                      step={1}
                      suffix='%'
                    />
                  </div>
                  <ColorPickerField
                    label='Color'
                    value={shadowToValues.color}
                    onChange={(value: string) => updateShadowValue('to', { color: value })}
                  />
                </FormSection>
              </div>
            </div>
          </FormSection>
        </Card>

        <Card variant='subtle-compact' padding='sm' className='border-border/40 bg-card/30 space-y-3'>
          <div className='grid gap-3 sm:grid-cols-2'>
            <ColorPickerField
              label='Background from'
              value={visualBackgroundFromValue}
              onChange={handleVisualBackgroundFromChange}
            />
            <ColorPickerField
              label='Background to'
              value={visualBackgroundToValue}
              onChange={handleVisualBackgroundToChange}
            />
          </div>
        </Card>
      </div>
    </FormSection>
  );
}
