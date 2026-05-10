'use client';

import React from 'react';

import { BlockPicker } from '../shared/BlockPicker';
import {
  createCvBlock,
  isCvContainerBlock,
  isCvContainerKindAcceptingChildKind,
  type CvBlock,
  type CvBlockKind,
  type CvContainerBlock,
} from './cv-block-model';
import { insertCvBlock, resolveCvInsertionParent } from './cv-block-mutations';
import { findCvBlockContext } from './cv-master-tree';

interface CvBlockPickerProps {
  blocks: CvBlock[];
  selectedBlockId: string | null;
  onChange: (next: CvBlock[]) => void;
  onSelectBlock: (blockId: string | null) => void;
  className?: string;
}

const PALETTE: Array<{ kind: CvBlockKind; label: string }> = [
  { kind: 'section', label: 'Section' },
  { kind: 'stack', label: 'Stack' },
  { kind: 'columns', label: 'Columns' },
  { kind: 'row', label: 'Row' },
  { kind: 'profileHeader', label: 'Header' },
  { kind: 'summary', label: 'Summary' },
  { kind: 'experience', label: 'Experience' },
  { kind: 'education', label: 'Education' },
  { kind: 'skills', label: 'Skills' },
  { kind: 'techStack', label: 'Tech stack' },
  { kind: 'languages', label: 'Languages' },
  { kind: 'customText', label: 'Text' },
  { kind: 'divider', label: 'Divider' },
  { kind: 'spacer', label: 'Spacer' },
];

const isInsertable = (
  blocks: CvBlock[],
  selectedBlockId: string | null,
  kind: CvBlockKind
): boolean => {
  if (kind === 'section') return true;
  const selected = selectedBlockId !== null ? findCvBlockContext(blocks, selectedBlockId) : null;
  const targets: CvContainerBlock[] = [];
  if (selected) {
    if (isCvContainerBlock(selected.block)) targets.push(selected.block);
    if (selected.parent) targets.push(selected.parent);
  }
  blocks.forEach((block: CvBlock): void => {
    if (isCvContainerBlock(block)) targets.push(block);
  });
  return targets.some((container: CvContainerBlock): boolean =>
    isCvContainerKindAcceptingChildKind(container.kind, kind)
  );
};

export function CvBlockPicker(props: CvBlockPickerProps): React.JSX.Element {
  return (
    <BlockPicker
      {...props}
      palette={PALETTE}
      isInsertable={isInsertable}
      createBlock={createCvBlock}
      resolveInsertionParent={resolveCvInsertionParent}
      insertBlock={insertCvBlock}
    />
  );
}
