'use client';

import React, { useState } from 'react';

import type { CanvasOutputConfig } from '@/shared/contracts/ai-paths-core';
import { Input, Label } from '@/shared/ui';

import { useAiPathOrchestrator, useAiPathSelection } from '../../AiPathConfigContext';

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
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className='h-6 flex-1 rounded border border-border/60 bg-background/50 px-2 text-xs text-gray-200 placeholder:text-gray-600 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring'
       title={placeholder}/>
    </div>
  );
}

export function CanvasOutputNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode } = useAiPathSelection();
  const { updateSelectedNodeConfig } = useAiPathOrchestrator();
  const [overridesOpen, setOverridesOpen] = useState(false);

  if (selectedNode?.type !== 'canvas_output') return null;

  const cfg: CanvasOutputConfig = {
    outputKey: 'image_studio_bounds',
    ...(selectedNode.config?.canvasOutput ?? {}),
  };

  const update = (partial: Partial<CanvasOutputConfig>): void => {
    updateSelectedNodeConfig({
      canvasOutput: { ...cfg, ...partial },
    });
  };

  const key = cfg.outputKey?.trim() || 'image_studio_bounds';

  return (
    <div className='space-y-4'>
      {/* Output key */}
      <div>
        <Label className='text-xs text-gray-400'>Output Key</Label>
        <Input
          value={cfg.outputKey ?? 'image_studio_bounds'}
          aria-label='Output key'
          onChange={(e) => update({ outputKey: e.target.value.trim() || 'image_studio_bounds' })}
          placeholder='image_studio_bounds'
          className='mt-2 h-7 text-xs'
         title='image_studio_bounds'/>
        <p className='mt-1 text-[10px] text-gray-600'>
          Image Studio reads this top-level key from the run result. Leave as default unless you
          need multiple canvas output nodes in one path.
        </p>
      </div>

      {/* Live field-mapping hint */}
      <div className='rounded-md border border-sky-500/20 bg-sky-950/30 p-3'>
        <p className='mb-2 text-[10px] uppercase tracking-wide text-sky-400'>
          Image Studio Field Mapping Paths
        </p>
        <div className='space-y-0.5 font-mono text-[11px] text-sky-300/80'>
          <div>
            <span className='text-gray-500'>Left </span>
            {key}.left
          </div>
          <div>
            <span className='text-gray-500'>Top </span>
            {key}.top
          </div>
          <div>
            <span className='text-gray-500'>Width </span>
            {key}.width
          </div>
          <div>
            <span className='text-gray-500'>Height </span>
            {key}.height
          </div>
          <div>
            <span className='text-gray-500'>Confidence </span>
            {key}.confidence
          </div>
        </div>
        <p className='mt-2 text-[10px] text-sky-400/60'>
          When field mapping is left blank in Image Studio, these paths are used automatically.
        </p>
      </div>

      {/* Bounds sub-path */}
      <div>
        <Label className='text-xs text-gray-400'>Bounds Path (optional)</Label>
        <Input
          value={cfg.boundsPath ?? ''}
          aria-label='Bounds path'
          onChange={(e) => update({ boundsPath: e.target.value.trim() || undefined })}
          placeholder='e.g. objectBounds (leave empty to read from root)'
          className='mt-2 h-7 text-xs'
         title='e.g. objectBounds (leave empty to read from root)'/>
        <p className='mt-1 text-[10px] text-gray-600'>
          Dot-path into the incoming <code className='text-gray-400'>value</code> port to reach the
          bounds object. Leave empty if bounds are at the root.
        </p>
      </div>

      {/* Confidence + label pass-through paths */}
      <div className='space-y-2'>
        <Label className='text-xs text-gray-400'>Pass-through Field Paths</Label>
        <p className='text-[10px] text-gray-600'>
          Dot-paths into the <code className='text-gray-400'>value</code> input for optional fields.
          The dedicated <code className='text-gray-400'>confidence</code> and{' '}
          <code className='text-gray-400'>label</code> input ports take priority when connected.
        </p>
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
              Useful when your upstream node uses non-standard keys.
            </p>
            <FieldInput
              label='Left field'
              value={cfg.leftField ?? ''}
              placeholder='left'
              onChange={(v) => update({ leftField: v.trim() || undefined })}
            />
            <FieldInput
              label='Top field'
              value={cfg.topField ?? ''}
              placeholder='top'
              onChange={(v) => update({ topField: v.trim() || undefined })}
            />
            <FieldInput
              label='Width field'
              value={cfg.widthField ?? ''}
              placeholder='width'
              onChange={(v) => update({ widthField: v.trim() || undefined })}
            />
            <FieldInput
              label='Height field'
              value={cfg.heightField ?? ''}
              placeholder='height'
              onChange={(v) => update({ heightField: v.trim() || undefined })}
            />
          </div>
        )}
      </div>
    </div>
  );
}
