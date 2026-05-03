import React from 'react';

import {
  ImageBlockEditor,
  ButtonBlockEditor,
  TextBlockEditor,
  HeadingBlockEditor,
  DividerBlockEditor,
  SpacerBlockEditor,
  SectionBlockEditor,
  ColumnsBlockEditor,
  RowBlockEditor,
} from './editors';

type BlockUpdateHandler = (updates: object) => void;

type TextEditorBlock = {
  kind: 'text';
  text: string;
};

type HeadingEditorBlock = {
  kind: 'heading';
  level: number;
  text: string;
};

type ImageEditorBlock = {
  align: 'left' | 'right' | 'center';
  alt: string;
  href: string | null;
  kind: 'image';
  src: string;
  width: number | null;
};

type ButtonEditorBlock = {
  align: 'left' | 'right' | 'center';
  background: string;
  color: string;
  href: string;
  kind: 'button';
  label: string;
};

type DividerEditorBlock = { kind: 'divider' };
type SpacerEditorBlock = { kind: 'spacer' };
type ColumnsEditorBlock = { kind: 'columns' };
type RowEditorBlock = { kind: 'row' };
type SectionEditorBlock = { kind: 'section' };

type LeafEditorBlock =
  | TextEditorBlock
  | HeadingEditorBlock
  | ImageEditorBlock
  | ButtonEditorBlock
  | DividerEditorBlock
  | SpacerEditorBlock;

type ContainerEditorBlock = ColumnsEditorBlock | RowEditorBlock | SectionEditorBlock;

type EditorBlock = LeafEditorBlock | ContainerEditorBlock;

interface BlockEditorProps {
  block: EditorBlock;
  onUpdate: BlockUpdateHandler;
}

const isContainerEditorBlock = (block: EditorBlock): block is ContainerEditorBlock =>
  block.kind === 'columns' || block.kind === 'row' || block.kind === 'section';

function LeafBlockEditor({
  block,
  onUpdate,
}: {
  block: LeafEditorBlock;
  onUpdate: BlockUpdateHandler;
}): React.JSX.Element {
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

function ContainerBlockEditor({
  block,
  onUpdate,
}: {
  block: ContainerEditorBlock;
  onUpdate: BlockUpdateHandler;
}): React.JSX.Element {
  switch (block.kind) {
    case 'section':
      return <SectionBlockEditor block={block} onUpdate={onUpdate} />;
    case 'columns':
      return <ColumnsBlockEditor block={block} onUpdate={onUpdate} />;
    case 'row':
      return <RowBlockEditor block={block} onUpdate={onUpdate} />;
  }
}

export function BlockEditor({ block, onUpdate }: BlockEditorProps): React.JSX.Element {
  if (isContainerEditorBlock(block)) {
    return <ContainerBlockEditor block={block} onUpdate={onUpdate} />;
  }
  return <LeafBlockEditor block={block} onUpdate={onUpdate} />;
}
