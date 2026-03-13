'use client';

import React, { useState } from 'react';

import type { BoundsNormalizerConfig } from '@/shared/contracts/ai-paths-core';
import { Input, Label, SelectSimple } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { useAiPathOrchestrator, useAiPathSelection } from '../../AiPathConfigContext';

const FORMAT_OPTIONS = [
  { value: 'pixels_tlwh', label: '{left,top,width,height} px — standard (default)' },
  { value: 'pixels_tlbr', label: '{x1,y1,x2,y2} px — top-left / bottom-right' },
  { value: 'gemini_millirelative', label: '[y1,x1,y2,x2] 0-1000 — Google Gemini format' },
  { value: 'relative_xywh', label: '[cx,cy,w,h] 0-1 — YOLO centre format' },
  { value: 'percentage_tlwh', label: '{left,top,width,height} % — percentage' },
  { value: 'auto', label: 'Auto-detect (inspect input shape)' },
];

const NEEDS_IMAGE_DIMS = new Set([
  'gemini_millirelative',
  'relative_xywh',
  'percentage_tlwh',
  'auto',
]);

function FieldInput(props: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}): React.JSX.Element {
  const { label, value, placeholder, onChange } = props;

  return (
    <div className='flex items-center gap-2'>
      <span className='w-20 shrink-0 text-right text-[10px] text-gray-500'>{label}</span>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className='h-6 flex-1 rounded border border-border/60 bg-background/50 px-2 text-xs text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-ring'
      />
    </div>
  );
}

export function BoundsNormalizerNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode } = useAiPathSelection();
  const { updateSelectedNodeConfig } = useAiPathOrchestrator();
  const [overridesOpen, setOverridesOpen] = useState(false);
  const [dimOpen, setDimOpen] = useState(false);

  if (selectedNode?.type !== 'bounds_normalizer') return null;

  const cfg: BoundsNormalizerConfig = {
    inputFormat: 'pixels_tlwh',
    ...(selectedNode.config?.boundsNormalizer ?? {}),
  };

  const update = (partial: Partial<BoundsNormalizerConfig>): void => {
    updateSelectedNodeConfig({
      boundsNormalizer: { ...cfg, ...partial },
    });
  };

  const showDimFields = NEEDS_IMAGE_DIMS.has(cfg.inputFormat ?? 'pixels_tlwh');

  return (
    <div className='space-y-4'>
      {/* Format selector */}
      <div>
        <Label className='text-xs text-gray-400'>Input Format</Label>
        <SelectSimple
          size='sm'
          value={cfg.inputFormat ?? 'pixels_tlwh'}
          onValueChange={(v) => update({ inputFormat: v as BoundsNormalizerConfig['inputFormat'] })}
          options={FORMAT_OPTIONS}
          ariaLabel='Input format'
          className='mt-2'
        />
        <p className='mt-1 text-[10px] text-gray-600'>
          Match this to your vision API's bounding box output encoding.
        </p>
      </div>

      {/* Bounds sub-path */}
      <div>
        <Label className='text-xs text-gray-400'>Bounds Path (optional)</Label>
        <Input
          value={cfg.boundsPath ?? ''}
          onChange={(e) => update({ boundsPath: e.target.value.trim() || undefined })}
          placeholder='e.g. objectBounds (leave empty to read from root)'
          aria-label='Bounds path'
          className='mt-2 h-7 text-xs'
        />
        <p className='mt-1 text-[10px] text-gray-600'>
          Dot-path into the incoming value to reach the bounds object. Leave empty if bounds are at
          the root.
        </p>
      </div>

      {/* Confidence + label */}
      <div className='space-y-2'>
        <Label className='text-xs text-gray-400'>Pass-through Fields</Label>
        <FieldInput
          label='Confidence'
          value={cfg.confidencePath ?? ''}
          placeholder='e.g. confidence or score'
          onChange={(v) => update({ confidencePath: v.trim() || undefined })}
        />
        <FieldInput
          label='Label'
          value={cfg.labelPath ?? ''}
          placeholder='e.g. label or class'
          onChange={(v) => update({ labelPath: v.trim() || undefined })}
        />
      </div>

      {/* Image dimensions (only for formats that need scaling) */}
      {showDimFields && (
        <div className='border-t border-border/30 pt-3'>
          <button
            type='button'
            className='flex items-center gap-1 text-[10px] uppercase tracking-wide text-gray-500 hover:text-gray-300'
            onClick={() => setDimOpen((o) => !o)}
          >
            <span>{dimOpen ? '▾' : '▸'}</span>
            Image Dimension Sources
          </button>
          {dimOpen && (
            <div className='mt-2 space-y-2'>
              <p className='text-[10px] text-gray-600'>
                Dot-paths inside the <code className='text-gray-400'>context</code> port value for
                source image dimensions. Defaults: <code className='text-gray-400'>imageWidth</code>{' '}
                / <code className='text-gray-400'>imageHeight</code>.
              </p>
              <FieldInput
                label='Width path'
                value={cfg.imageWidthPath ?? ''}
                placeholder='imageWidth'
                onChange={(v) => update({ imageWidthPath: v.trim() || undefined })}
              />
              <FieldInput
                label='Height path'
                value={cfg.imageHeightPath ?? ''}
                placeholder='imageHeight'
                onChange={(v) => update({ imageHeightPath: v.trim() || undefined })}
              />
            </div>
          )}
        </div>
      )}

      {/* Field overrides */}
      <div className='border-t border-border/30 pt-3'>
        <button
          type='button'
          className='flex items-center gap-1 text-[10px] uppercase tracking-wide text-gray-500 hover:text-gray-300'
          onClick={() => setOverridesOpen((o) => !o)}
        >
          <span>{overridesOpen ? '▾' : '▸'}</span>
          Field Name Overrides
        </button>
        {overridesOpen && (
          <div className='mt-2 space-y-2'>
            <p className='text-[10px] text-gray-600'>
              Override the default field names used to read coordinates from the bounds object.
            </p>
            <FieldInput
              label='Left field'
              value={cfg.leftField ?? ''}
              placeholder={cn(cfg.inputFormat === 'pixels_tlbr' ? 'x1' : 'left')}
              onChange={(v) => update({ leftField: v.trim() || undefined })}
            />
            <FieldInput
              label='Top field'
              value={cfg.topField ?? ''}
              placeholder={cn(cfg.inputFormat === 'pixels_tlbr' ? 'y1' : 'top')}
              onChange={(v) => update({ topField: v.trim() || undefined })}
            />
            <FieldInput
              label='Width field'
              value={cfg.widthField ?? ''}
              placeholder={cn(cfg.inputFormat === 'pixels_tlbr' ? 'x2' : 'width')}
              onChange={(v) => update({ widthField: v.trim() || undefined })}
            />
            <FieldInput
              label='Height field'
              value={cfg.heightField ?? ''}
              placeholder={cn(cfg.inputFormat === 'pixels_tlbr' ? 'y2' : 'height')}
              onChange={(v) => update({ heightField: v.trim() || undefined })}
            />
          </div>
        )}
      </div>
    </div>
  );
}
