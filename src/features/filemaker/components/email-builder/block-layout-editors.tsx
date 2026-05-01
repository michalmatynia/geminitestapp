'use client';

import React from 'react';

import { FormField } from '@/shared/ui/forms-and-actions.public';
import { Input } from '@/shared/ui/primitives.public';

import type {
  EmailBlock,
  EmailColumnsBlock,
  EmailRowBlock,
  EmailSectionBlock,
} from './block-model';

interface LayoutEditorProps<TBlock extends EmailBlock> {
  block: TBlock;
  onUpdate: (patch: Partial<TBlock>) => void;
}

export function SectionBlockEditor({
  block,
  onUpdate,
}: LayoutEditorProps<EmailSectionBlock>): React.JSX.Element {
  return (
    <div className='grid gap-3 md:grid-cols-2'>
      <FormField label='Label' className='md:col-span-2'>
        <Input
          value={block.label}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            onUpdate({ label: event.target.value });
          }}
          aria-label='Section label'
          className='h-9'
        />
      </FormField>
      <FormField label='Background colour'>
        <Input
          type='color'
          value={block.background}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            onUpdate({ background: event.target.value });
          }}
          aria-label='Section background colour'
          className='h-9 w-20'
        />
      </FormField>
      <FormField label='Vertical padding (px)'>
        <Input
          type='number'
          min={0}
          max={96}
          value={block.paddingY}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            const parsed = Math.trunc(Number(event.target.value));
            if (!Number.isFinite(parsed) || parsed < 0) return;
            onUpdate({ paddingY: Math.min(parsed, 96) });
          }}
          aria-label='Section vertical padding'
          className='h-9 w-24'
        />
      </FormField>
      <FormField label='Horizontal padding (px)'>
        <Input
          type='number'
          min={0}
          max={96}
          value={block.paddingX}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            const parsed = Math.trunc(Number(event.target.value));
            if (!Number.isFinite(parsed) || parsed < 0) return;
            onUpdate({ paddingX: Math.min(parsed, 96) });
          }}
          aria-label='Section horizontal padding'
          className='h-9 w-24'
        />
      </FormField>
    </div>
  );
}

export function ColumnsBlockEditor({
  block,
  onUpdate,
}: LayoutEditorProps<EmailColumnsBlock>): React.JSX.Element {
  return (
    <div className='grid gap-3 md:grid-cols-2'>
      <FormField label='Label' className='md:col-span-2'>
        <Input
          value={block.label}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            onUpdate({ label: event.target.value });
          }}
          aria-label='Columns label'
          className='h-9'
        />
      </FormField>
      <FormField label='Gap (px)'>
        <Input
          type='number'
          min={0}
          max={64}
          value={block.gap}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            const parsed = Math.trunc(Number(event.target.value));
            if (!Number.isFinite(parsed) || parsed < 0) return;
            onUpdate({ gap: Math.min(parsed, 64) });
          }}
          aria-label='Columns gap'
          className='h-9 w-24'
        />
      </FormField>
      <FormField label='Column count'>
        <Input
          type='number'
          min={1}
          max={6}
          value={block.children.length}
          readOnly
          disabled
          aria-label='Column count (read-only - add / remove rows in the layer panel)'
          className='h-9 w-24'
        />
      </FormField>
    </div>
  );
}

export function RowBlockEditor({
  block,
  onUpdate,
}: LayoutEditorProps<EmailRowBlock>): React.JSX.Element {
  return (
    <div className='grid gap-3 md:grid-cols-2'>
      <FormField label='Label' className='md:col-span-2'>
        <Input
          value={block.label}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            onUpdate({ label: event.target.value });
          }}
          aria-label='Row label'
          className='h-9'
        />
      </FormField>
      <FormField label='Background colour'>
        <Input
          type='color'
          value={block.background}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            onUpdate({ background: event.target.value });
          }}
          aria-label='Row background colour'
          className='h-9 w-20'
        />
      </FormField>
      <FormField label='Vertical padding (px)'>
        <Input
          type='number'
          min={0}
          max={96}
          value={block.paddingY}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            const parsed = Math.trunc(Number(event.target.value));
            if (!Number.isFinite(parsed) || parsed < 0) return;
            onUpdate({ paddingY: Math.min(parsed, 96) });
          }}
          aria-label='Row vertical padding'
          className='h-9 w-24'
        />
      </FormField>
      <FormField label='Horizontal padding (px)'>
        <Input
          type='number'
          min={0}
          max={96}
          value={block.paddingX}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            const parsed = Math.trunc(Number(event.target.value));
            if (!Number.isFinite(parsed) || parsed < 0) return;
            onUpdate({ paddingX: Math.min(parsed, 96) });
          }}
          aria-label='Row horizontal padding'
          className='h-9 w-24'
        />
      </FormField>
    </div>
  );
}
