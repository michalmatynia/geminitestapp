'use client';

import React from 'react';

import { DocumentWysiwygEditor } from '@/shared/lib/document-editor/public';
import { Input } from '@/shared/ui/primitives.public';
import { FormField, SelectSimple } from '@/shared/ui/forms-and-actions.public';

import type {
  EmailBlock,
  EmailButtonBlock,
  EmailColumnsBlock,
  EmailDividerBlock,
  EmailHeadingBlock,
  EmailImageBlock,
  EmailRowBlock,
  EmailSectionBlock,
  EmailSpacerBlock,
  EmailTextBlock,
} from './block-model';

const ALIGN_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
];

const HEADING_LEVEL_OPTIONS = [
  { value: '1', label: 'H1' },
  { value: '2', label: 'H2' },
  { value: '3', label: 'H3' },
];

interface EditorProps<TBlock extends EmailBlock> {
  block: TBlock;
  onUpdate: (patch: Partial<TBlock>) => void;
}

export function TextBlockEditor({ block, onUpdate }: EditorProps<EmailTextBlock>): React.JSX.Element {
  return (
    <DocumentWysiwygEditor
      engineInstance={`filemaker_email_block_${block.id}`}
      value={block.html}
      onChange={(value: string): void => { onUpdate({ html: value }); }}
      placeholder='Write your text…'
    />
  );
}

export function HeadingBlockEditor({ block, onUpdate }: EditorProps<EmailHeadingBlock>): React.JSX.Element {
  return (
    <div className='grid gap-3 md:grid-cols-[1fr_120px_140px]'>
      <FormField label='Heading text'>
        <Input
          value={block.text}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            onUpdate({ text: event.target.value });
          }}
          aria-label='Heading text'
          className='h-9'
        />
      </FormField>
      <FormField label='Level'>
        <SelectSimple
          value={String(block.level)}
          onValueChange={(value: string): void => {
            const parsed = Math.trunc(Number(value));
            const level: 1 | 2 | 3 = parsed === 1 || parsed === 3 ? parsed : 2;
            onUpdate({ level });
          }}
          options={HEADING_LEVEL_OPTIONS}
          ariaLabel='Heading level'
          size='sm'
        />
      </FormField>
      <FormField label='Align'>
        <SelectSimple
          value={block.align}
          onValueChange={(value: string): void => {
            onUpdate({ align: value === 'center' || value === 'right' ? value : 'left' });
          }}
          options={ALIGN_OPTIONS}
          ariaLabel='Heading alignment'
          size='sm'
        />
      </FormField>
    </div>
  );
}

export function ImageBlockEditor({ block, onUpdate }: EditorProps<EmailImageBlock>): React.JSX.Element {
  return (
    <div className='grid gap-3 md:grid-cols-2'>
      <FormField label='Image URL' className='md:col-span-2'>
        <Input
          value={block.src}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            onUpdate({ src: event.target.value });
          }}
          aria-label='Image URL'
          placeholder='https://…'
          className='h-9'
        />
      </FormField>
      <FormField label='Alt text'>
        <Input
          value={block.alt}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            onUpdate({ alt: event.target.value });
          }}
          aria-label='Alt text'
          className='h-9'
        />
      </FormField>
      <FormField label='Link URL (optional)'>
        <Input
          value={block.href ?? ''}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            onUpdate({ href: event.target.value || null });
          }}
          aria-label='Link URL'
          placeholder='https://…'
          className='h-9'
        />
      </FormField>
      <FormField label='Width (px)'>
        <Input
          type='number'
          value={block.width ?? ''}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            const parsed = Math.trunc(Number(event.target.value));
            onUpdate({ width: Number.isFinite(parsed) && parsed > 0 ? parsed : null });
          }}
          aria-label='Image width'
          className='h-9'
        />
      </FormField>
      <FormField label='Align'>
        <SelectSimple
          value={block.align}
          onValueChange={(value: string): void => {
            onUpdate({ align: value === 'left' || value === 'right' ? value : 'center' });
          }}
          options={ALIGN_OPTIONS}
          ariaLabel='Image alignment'
          size='sm'
        />
      </FormField>
    </div>
  );
}

export function ButtonBlockEditor({ block, onUpdate }: EditorProps<EmailButtonBlock>): React.JSX.Element {
  return (
    <div className='grid gap-3 md:grid-cols-2'>
      <FormField label='Label'>
        <Input
          value={block.label}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            onUpdate({ label: event.target.value });
          }}
          aria-label='Button label'
          className='h-9'
        />
      </FormField>
      <FormField label='Link URL'>
        <Input
          value={block.href}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            onUpdate({ href: event.target.value });
          }}
          aria-label='Button link URL'
          placeholder='https://…'
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
          aria-label='Button background colour'
          className='h-9 w-20'
        />
      </FormField>
      <FormField label='Text colour'>
        <Input
          type='color'
          value={block.color}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            onUpdate({ color: event.target.value });
          }}
          aria-label='Button text colour'
          className='h-9 w-20'
        />
      </FormField>
      <FormField label='Align'>
        <SelectSimple
          value={block.align}
          onValueChange={(value: string): void => {
            onUpdate({ align: value === 'left' || value === 'right' ? value : 'center' });
          }}
          options={ALIGN_OPTIONS}
          ariaLabel='Button alignment'
          size='sm'
        />
      </FormField>
    </div>
  );
}

export function DividerBlockEditor({ block, onUpdate }: EditorProps<EmailDividerBlock>): React.JSX.Element {
  return (
    <FormField label='Divider colour'>
      <Input
        type='color'
        value={block.color}
        onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
          onUpdate({ color: event.target.value });
        }}
        aria-label='Divider colour'
        className='h-9 w-20'
      />
    </FormField>
  );
}

export function SpacerBlockEditor({ block, onUpdate }: EditorProps<EmailSpacerBlock>): React.JSX.Element {
  return (
    <FormField label='Height (px)'>
      <Input
        type='number'
        min={1}
        max={200}
        value={block.height}
        onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
          const parsed = Math.trunc(Number(event.target.value));
          if (!Number.isFinite(parsed) || parsed <= 0) return;
          onUpdate({ height: Math.min(parsed, 200) });
        }}
        aria-label='Spacer height in pixels'
        className='h-9 w-24'
      />
    </FormField>
  );
}

export function SectionBlockEditor({ block, onUpdate }: EditorProps<EmailSectionBlock>): React.JSX.Element {
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

export function ColumnsBlockEditor({ block, onUpdate }: EditorProps<EmailColumnsBlock>): React.JSX.Element {
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
          aria-label='Column count (read-only — add / remove rows in the layer panel)'
          className='h-9 w-24'
        />
      </FormField>
    </div>
  );
}

export function RowBlockEditor({ block, onUpdate }: EditorProps<EmailRowBlock>): React.JSX.Element {
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

interface BlockEditorProps {
  block: EmailBlock;
  onUpdate: (patch: Partial<EmailBlock>) => void;
}

export function BlockEditor({ block, onUpdate }: BlockEditorProps): React.JSX.Element {
  switch (block.kind) {
    case 'text': return <TextBlockEditor block={block} onUpdate={onUpdate} />;
    case 'heading': return <HeadingBlockEditor block={block} onUpdate={onUpdate} />;
    case 'image': return <ImageBlockEditor block={block} onUpdate={onUpdate} />;
    case 'button': return <ButtonBlockEditor block={block} onUpdate={onUpdate} />;
    case 'divider': return <DividerBlockEditor block={block} onUpdate={onUpdate} />;
    case 'spacer': return <SpacerBlockEditor block={block} onUpdate={onUpdate} />;
    case 'section': return <SectionBlockEditor block={block} onUpdate={onUpdate} />;
    case 'columns': return <ColumnsBlockEditor block={block} onUpdate={onUpdate} />;
    case 'row': return <RowBlockEditor block={block} onUpdate={onUpdate} />;
  }
}
