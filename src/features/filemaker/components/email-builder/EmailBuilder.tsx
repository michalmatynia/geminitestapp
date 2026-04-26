'use client';

import React, { useCallback, useState } from 'react';

import { DocumentWysiwygEditor } from '@/shared/lib/document-editor/public';
import { Button, Input } from '@/shared/ui/primitives.public';
import { FormField, SelectSimple } from '@/shared/ui/forms-and-actions.public';

import {
  createEmailBlock,
  type EmailBlock,
  type EmailBlockKind,
  type EmailButtonBlock,
  type EmailDividerBlock,
  type EmailHeadingBlock,
  type EmailImageBlock,
  type EmailSpacerBlock,
  type EmailTextBlock,
} from './block-model';

interface EmailBuilderProps {
  blocks: EmailBlock[];
  onChange: (next: EmailBlock[]) => void;
}

const PALETTE: Array<{ kind: EmailBlockKind; label: string }> = [
  { kind: 'heading', label: '＋ Heading' },
  { kind: 'text', label: '＋ Text' },
  { kind: 'image', label: '＋ Image' },
  { kind: 'button', label: '＋ Button' },
  { kind: 'divider', label: '＋ Divider' },
  { kind: 'spacer', label: '＋ Spacer' },
];

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

const moveBlock = (blocks: EmailBlock[], from: number, to: number): EmailBlock[] => {
  if (from === to || from < 0 || to < 0 || from >= blocks.length || to >= blocks.length) {
    return blocks;
  }
  const next = blocks.slice();
  const [removed] = next.splice(from, 1);
  if (removed) next.splice(to, 0, removed);
  return next;
};

export function EmailBuilder({ blocks, onChange }: EmailBuilderProps): React.JSX.Element {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);

  const handleAdd = useCallback(
    (kind: EmailBlockKind): void => {
      onChange([...blocks, createEmailBlock(kind)]);
    },
    [blocks, onChange]
  );

  const handleUpdate = useCallback(
    (index: number, patch: Partial<EmailBlock>): void => {
      const target = blocks[index];
      if (!target) return;
      const next = blocks.slice();
      next[index] = { ...target, ...patch } as EmailBlock;
      onChange(next);
    },
    [blocks, onChange]
  );

  const handleRemove = useCallback(
    (index: number): void => {
      onChange(blocks.filter((_: EmailBlock, currentIndex: number): boolean => currentIndex !== index));
    },
    [blocks, onChange]
  );

  const handleMove = useCallback(
    (from: number, to: number): void => {
      onChange(moveBlock(blocks, from, to));
    },
    [blocks, onChange]
  );

  const handleDragStart = useCallback(
    (index: number) =>
      (event: React.DragEvent<HTMLButtonElement>): void => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', String(index));
        setDragIndex(index);
      },
    []
  );

  const handleDragOver = useCallback(
    (index: number) =>
      (event: React.DragEvent<HTMLDivElement>): void => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setDropTarget(index);
      },
    []
  );

  const handleDrop = useCallback(
    (index: number) =>
      (event: React.DragEvent<HTMLDivElement>): void => {
        event.preventDefault();
        const raw = event.dataTransfer.getData('text/plain');
        const from = Number.parseInt(raw, 10);
        setDragIndex(null);
        setDropTarget(null);
        if (!Number.isFinite(from)) return;
        handleMove(from, index);
      },
    [handleMove]
  );

  const handleDragEnd = useCallback((): void => {
    setDragIndex(null);
    setDropTarget(null);
  }, []);

  return (
    <div className='flex flex-col gap-4 lg:flex-row'>
      <aside className='flex flex-col gap-2 rounded-md border border-border/60 bg-card/30 p-3 lg:w-44'>
        <div className='text-[10px] font-semibold uppercase tracking-wide text-gray-400'>Add block</div>
        {PALETTE.map((entry) => (
          <Button
            key={entry.kind}
            type='button'
            variant='outline'
            size='sm'
            className='justify-start text-xs'
            onClick={(): void => { handleAdd(entry.kind); }}
          >
            {entry.label}
          </Button>
        ))}
      </aside>

      <div className='flex-1 space-y-2'>
        {blocks.length === 0 ? (
          <div className='rounded-md border border-dashed border-border/60 bg-card/20 p-8 text-center text-xs text-gray-400'>
            Add blocks from the palette to start building your email.
          </div>
        ) : (
          blocks.map((block: EmailBlock, index: number) => (
            <BlockRow
              key={block.id}
              block={block}
              index={index}
              total={blocks.length}
              isDragging={dragIndex === index}
              isDropTarget={dropTarget === index && dragIndex !== index}
              onDragStart={handleDragStart(index)}
              onDragOver={handleDragOver(index)}
              onDrop={handleDrop(index)}
              onDragEnd={handleDragEnd}
              onUpdate={(patch: Partial<EmailBlock>): void => { handleUpdate(index, patch); }}
              onRemove={(): void => { handleRemove(index); }}
              onMoveUp={(): void => { handleMove(index, Math.max(0, index - 1)); }}
              onMoveDown={(): void => { handleMove(index, Math.min(blocks.length - 1, index + 1)); }}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface BlockRowProps {
  block: EmailBlock;
  index: number;
  total: number;
  isDragging: boolean;
  isDropTarget: boolean;
  onDragStart: (event: React.DragEvent<HTMLButtonElement>) => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onUpdate: (patch: Partial<EmailBlock>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function BlockRow(props: BlockRowProps): React.JSX.Element {
  const {
    block,
    index,
    total,
    isDragging,
    isDropTarget,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
    onUpdate,
    onRemove,
    onMoveUp,
    onMoveDown,
  } = props;

  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={[
        'rounded-md border bg-card/30 p-3 transition-colors',
        isDragging ? 'opacity-40' : '',
        isDropTarget ? 'border-blue-400 bg-blue-500/10' : 'border-border/60',
      ].join(' ')}
    >
      <div className='mb-2 flex items-center gap-2'>
        <button
          type='button'
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          aria-label='Drag to reorder'
          title='Drag to reorder'
          className='cursor-grab select-none rounded border border-border/60 px-2 py-1 text-[10px] text-gray-400 hover:bg-card/60 active:cursor-grabbing'
        >
          ⋮⋮
        </button>
        <span className='text-[10px] font-semibold uppercase tracking-wide text-gray-400'>
          {block.kind}
        </span>
        <span className='text-[10px] text-gray-500'>#{index + 1}</span>
        <div className='ml-auto flex items-center gap-1'>
          <Button
            type='button'
            size='sm'
            variant='ghost'
            disabled={index === 0}
            onClick={onMoveUp}
            className='h-6 px-2 text-xs'
          >
            ↑
          </Button>
          <Button
            type='button'
            size='sm'
            variant='ghost'
            disabled={index === total - 1}
            onClick={onMoveDown}
            className='h-6 px-2 text-xs'
          >
            ↓
          </Button>
          <Button
            type='button'
            size='sm'
            variant='ghost'
            onClick={onRemove}
            className='h-6 px-2 text-xs text-red-400 hover:text-red-300'
          >
            ✕
          </Button>
        </div>
      </div>
      <BlockEditor block={block} onUpdate={onUpdate} />
    </div>
  );
}

interface BlockEditorProps {
  block: EmailBlock;
  onUpdate: (patch: Partial<EmailBlock>) => void;
}

function BlockEditor({ block, onUpdate }: BlockEditorProps): React.JSX.Element {
  switch (block.kind) {
    case 'text':
      return <TextBlockEditor block={block} onUpdate={onUpdate} />;
    case 'heading':
      return <HeadingBlockEditor block={block} onUpdate={onUpdate} />;
    case 'image':
      return <ImageBlockEditor block={block} onUpdate={onUpdate} />;
    case 'button':
      return <ButtonBlockEditor block={block} onUpdate={onUpdate} />;
    case 'divider':
      return <DividerBlockEditor block={block} onUpdate={onUpdate} />;
    case 'spacer':
      return <SpacerBlockEditor block={block} onUpdate={onUpdate} />;
  }
}

function TextBlockEditor({
  block,
  onUpdate,
}: {
  block: EmailTextBlock;
  onUpdate: (patch: Partial<EmailTextBlock>) => void;
}): React.JSX.Element {
  return (
    <DocumentWysiwygEditor
      engineInstance={`filemaker_email_block_${block.id}`}
      value={block.html}
      onChange={(value: string): void => { onUpdate({ html: value }); }}
      placeholder='Write your text…'
    />
  );
}

function HeadingBlockEditor({
  block,
  onUpdate,
}: {
  block: EmailHeadingBlock;
  onUpdate: (patch: Partial<EmailHeadingBlock>) => void;
}): React.JSX.Element {
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
            onUpdate({ align: (value === 'center' || value === 'right' ? value : 'left') });
          }}
          options={ALIGN_OPTIONS}
          ariaLabel='Heading alignment'
          size='sm'
        />
      </FormField>
    </div>
  );
}

function ImageBlockEditor({
  block,
  onUpdate,
}: {
  block: EmailImageBlock;
  onUpdate: (patch: Partial<EmailImageBlock>) => void;
}): React.JSX.Element {
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
            onUpdate({ align: (value === 'left' || value === 'right' ? value : 'center') });
          }}
          options={ALIGN_OPTIONS}
          ariaLabel='Image alignment'
          size='sm'
        />
      </FormField>
    </div>
  );
}

function ButtonBlockEditor({
  block,
  onUpdate,
}: {
  block: EmailButtonBlock;
  onUpdate: (patch: Partial<EmailButtonBlock>) => void;
}): React.JSX.Element {
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
            onUpdate({ align: (value === 'left' || value === 'right' ? value : 'center') });
          }}
          options={ALIGN_OPTIONS}
          ariaLabel='Button alignment'
          size='sm'
        />
      </FormField>
    </div>
  );
}

function DividerBlockEditor({
  block,
  onUpdate,
}: {
  block: EmailDividerBlock;
  onUpdate: (patch: Partial<EmailDividerBlock>) => void;
}): React.JSX.Element {
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

function SpacerBlockEditor({
  block,
  onUpdate,
}: {
  block: EmailSpacerBlock;
  onUpdate: (patch: Partial<EmailSpacerBlock>) => void;
}): React.JSX.Element {
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

