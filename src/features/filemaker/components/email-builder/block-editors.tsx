'use client';

import React from 'react';

import { DocumentWysiwygEditor } from '@/shared/lib/document-editor/public';
import { Input } from '@/shared/ui/primitives.public';
import { FormField, SelectSimple } from '@/shared/ui/forms-and-actions.public';

import type {
  EmailBlock,
  EmailButtonBlock,
  EmailDividerBlock,
  EmailHeadingBlock,
  EmailImageBlock,
  EmailSpacerBlock,
  EmailTextBlock,
} from './block-model';
import {
  ColumnsBlockEditor,
  RowBlockEditor,
  SectionBlockEditor,
} from './block-layout-editors';

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

function ImageLinkField({
  block,
  onUpdate,
}: EditorProps<EmailImageBlock>): React.JSX.Element {
  return (
    <FormField label='Link URL (optional)'>
      <Input
        value={block.href ?? ''}
        onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
          onUpdate({ href: event.target.value === '' ? null : event.target.value });
        }}
        aria-label='Link URL'
        placeholder='https://…'
        className='h-9'
      />
    </FormField>
  );
}

export function TextBlockEditor({ block, onUpdate }: EditorProps<EmailTextBlock>): React.JSX.Element {
  return (
    <DocumentWysiwygEditor
      engineInstance='filemaker_email'
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
      <ImageLinkField block={block} onUpdate={onUpdate} />
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

interface BlockEditorProps {
  block: EmailBlock;
  onUpdate: (patch: Partial<EmailBlock>) => void;
}

function renderContentBlockEditor({ block, onUpdate }: BlockEditorProps): React.JSX.Element | null {
  switch (block.kind) {
    case 'text': return <TextBlockEditor block={block} onUpdate={onUpdate} />;
    case 'heading': return <HeadingBlockEditor block={block} onUpdate={onUpdate} />;
    case 'image': return <ImageBlockEditor block={block} onUpdate={onUpdate} />;
    case 'button': return <ButtonBlockEditor block={block} onUpdate={onUpdate} />;
    case 'divider': return <DividerBlockEditor block={block} onUpdate={onUpdate} />;
    case 'spacer': return <SpacerBlockEditor block={block} onUpdate={onUpdate} />;
    default: return null;
  }
}

function renderStructuralBlockEditor({ block, onUpdate }: BlockEditorProps): React.JSX.Element | null {
  switch (block.kind) {
    case 'section': return <SectionBlockEditor block={block} onUpdate={onUpdate} />;
    case 'columns': return <ColumnsBlockEditor block={block} onUpdate={onUpdate} />;
    case 'row': return <RowBlockEditor block={block} onUpdate={onUpdate} />;
    default: return null;
  }
}

export function BlockEditor(props: BlockEditorProps): React.JSX.Element {
  const contentEditor = renderContentBlockEditor(props);
  if (contentEditor !== null) return contentEditor;
  return renderStructuralBlockEditor(props) ?? <React.Fragment />;
}

export {
  ColumnsBlockEditor,
  RowBlockEditor,
  SectionBlockEditor,
} from './block-layout-editors';
