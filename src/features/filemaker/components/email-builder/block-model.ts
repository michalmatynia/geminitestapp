import { normalizeString, toIdToken } from '../../filemaker-settings.helpers';

export type EmailLeafBlockKind = 'text' | 'heading' | 'image' | 'button' | 'divider' | 'spacer';
export type EmailContainerBlockKind = 'section' | 'columns' | 'row';
export type EmailBlockKind = EmailLeafBlockKind | EmailContainerBlockKind;

interface EmailBlockBase {
  id: string;
  kind: EmailBlockKind;
}

export interface EmailTextBlock extends EmailBlockBase {
  kind: 'text';
  html: string;
}

export interface EmailHeadingBlock extends EmailBlockBase {
  kind: 'heading';
  text: string;
  level: 1 | 2 | 3;
  align: 'left' | 'center' | 'right';
}

export interface EmailImageBlock extends EmailBlockBase {
  kind: 'image';
  src: string;
  alt: string;
  href: string | null;
  width: number | null;
  align: 'left' | 'center' | 'right';
}

export interface EmailButtonBlock extends EmailBlockBase {
  kind: 'button';
  label: string;
  href: string;
  align: 'left' | 'center' | 'right';
  background: string;
  color: string;
}

export interface EmailDividerBlock extends EmailBlockBase {
  kind: 'divider';
  color: string;
}

export interface EmailSpacerBlock extends EmailBlockBase {
  kind: 'spacer';
  height: number;
}

export interface EmailSectionBlock extends EmailBlockBase {
  kind: 'section';
  label: string;
  background: string;
  paddingY: number;
  paddingX: number;
  children: EmailBlock[];
}

export interface EmailColumnsBlock extends EmailBlockBase {
  kind: 'columns';
  label: string;
  gap: number;
  children: EmailRowBlock[];
}

export interface EmailRowBlock extends EmailBlockBase {
  kind: 'row';
  label: string;
  background: string;
  paddingY: number;
  paddingX: number;
  children: EmailLeafBlock[];
}

export type EmailLeafBlock =
  | EmailTextBlock
  | EmailHeadingBlock
  | EmailImageBlock
  | EmailButtonBlock
  | EmailDividerBlock
  | EmailSpacerBlock;

export type EmailContainerBlock = EmailSectionBlock | EmailColumnsBlock | EmailRowBlock;

export type EmailBlock = EmailLeafBlock | EmailContainerBlock;

const LEAF_KINDS: ReadonlySet<EmailLeafBlockKind> = new Set([
  'text',
  'heading',
  'image',
  'button',
  'divider',
  'spacer',
]);

const CONTAINER_KINDS: ReadonlySet<EmailContainerBlockKind> = new Set(['section', 'columns', 'row']);

export const isEmailLeafBlock = (block: EmailBlock): block is EmailLeafBlock =>
  LEAF_KINDS.has(block.kind as EmailLeafBlockKind);

export const isEmailContainerBlock = (block: EmailBlock): block is EmailContainerBlock =>
  CONTAINER_KINDS.has(block.kind as EmailContainerBlockKind);

export const getBlockChildren = (block: EmailBlock): EmailBlock[] =>
  isEmailContainerBlock(block) ? (block.children as EmailBlock[]) : [];

export const isContainerKindAcceptingChildKind = (
  parentKind: EmailContainerBlockKind,
  childKind: EmailBlockKind
): boolean => {
  if (parentKind === 'section') return childKind !== 'section'; // no nested sections
  if (parentKind === 'columns') return childKind === 'row';
  if (parentKind === 'row') return LEAF_KINDS.has(childKind as EmailLeafBlockKind);
  return false;
};

const generateBlockId = (kind: EmailBlockKind): string =>
  `filemaker-email-block-${kind}-${toIdToken(`${Date.now()}-${Math.random().toString(36).slice(2, 8)}`) || 'entry'}`;

const clampLevel = (value: unknown): 1 | 2 | 3 => {
  const parsed = Math.trunc(Number(value));
  if (parsed === 1 || parsed === 2 || parsed === 3) return parsed;
  return 2;
};

const normalizeAlign = (value: unknown): 'left' | 'center' | 'right' => {
  const normalized = normalizeString(value).toLowerCase();
  if (normalized === 'center' || normalized === 'right') return normalized;
  return 'left';
};

const normalizeColor = (value: unknown, fallback: string): string => {
  const normalized = normalizeString(value).trim();
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(normalized)) return normalized;
  return fallback;
};

const normalizeNullablePositiveInt = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Math.trunc(Number(value));
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

const normalizePadding = (value: unknown, fallback: number): number => {
  const parsed = Math.trunc(Number(value));
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.min(parsed, 96);
};

const normalizeColumnsGap = (value: unknown): number => {
  const parsed = Math.trunc(Number(value));
  if (!Number.isFinite(parsed) || parsed < 0) return 16;
  return Math.min(parsed, 64);
};

export const createEmailBlock = (kind: EmailBlockKind, overrides?: Partial<EmailBlock>): EmailBlock => {
  const id = (overrides && 'id' in overrides && normalizeString((overrides as { id?: string }).id)) || generateBlockId(kind);
  switch (kind) {
    case 'text':
      return {
        id,
        kind: 'text',
        html: normalizeString((overrides as Partial<EmailTextBlock> | undefined)?.html) || '<p>Write your message…</p>',
      };
    case 'heading':
      return {
        id,
        kind: 'heading',
        text: normalizeString((overrides as Partial<EmailHeadingBlock> | undefined)?.text) || 'Heading',
        level: clampLevel((overrides as Partial<EmailHeadingBlock> | undefined)?.level),
        align: normalizeAlign((overrides as Partial<EmailHeadingBlock> | undefined)?.align),
      };
    case 'image':
      return {
        id,
        kind: 'image',
        src: normalizeString((overrides as Partial<EmailImageBlock> | undefined)?.src),
        alt: normalizeString((overrides as Partial<EmailImageBlock> | undefined)?.alt),
        href: normalizeString((overrides as Partial<EmailImageBlock> | undefined)?.href) || null,
        width: normalizeNullablePositiveInt((overrides as Partial<EmailImageBlock> | undefined)?.width),
        align: normalizeAlign((overrides as Partial<EmailImageBlock> | undefined)?.align ?? 'center'),
      };
    case 'button':
      return {
        id,
        kind: 'button',
        label: normalizeString((overrides as Partial<EmailButtonBlock> | undefined)?.label) || 'Click here',
        href: normalizeString((overrides as Partial<EmailButtonBlock> | undefined)?.href) || 'https://example.com',
        align: normalizeAlign((overrides as Partial<EmailButtonBlock> | undefined)?.align ?? 'center'),
        background: normalizeColor((overrides as Partial<EmailButtonBlock> | undefined)?.background, '#2563eb'),
        color: normalizeColor((overrides as Partial<EmailButtonBlock> | undefined)?.color, '#ffffff'),
      };
    case 'divider':
      return {
        id,
        kind: 'divider',
        color: normalizeColor((overrides as Partial<EmailDividerBlock> | undefined)?.color, '#e5e7eb'),
      };
    case 'spacer': {
      const rawHeight = (overrides as Partial<EmailSpacerBlock> | undefined)?.height;
      const height = Math.trunc(Number(rawHeight));
      return {
        id,
        kind: 'spacer',
        height: Number.isFinite(height) && height > 0 ? Math.min(height, 200) : 24,
      };
    }
    case 'section': {
      const rawChildren = (overrides as Partial<EmailSectionBlock> | undefined)?.children;
      return {
        id,
        kind: 'section',
        label: normalizeString((overrides as Partial<EmailSectionBlock> | undefined)?.label) || 'Section',
        background: normalizeColor((overrides as Partial<EmailSectionBlock> | undefined)?.background, '#ffffff'),
        paddingY: normalizePadding((overrides as Partial<EmailSectionBlock> | undefined)?.paddingY, 24),
        paddingX: normalizePadding((overrides as Partial<EmailSectionBlock> | undefined)?.paddingX, 24),
        children: normalizeEmailBlocks(rawChildren).filter((child: EmailBlock): boolean =>
          isContainerKindAcceptingChildKind('section', child.kind)
        ),
      };
    }
    case 'columns': {
      const rawChildren = (overrides as Partial<EmailColumnsBlock> | undefined)?.children;
      const normalizedChildren = normalizeEmailBlocks(rawChildren).filter(
        (child: EmailBlock): child is EmailRowBlock => child.kind === 'row'
      );
      const childrenWithFallback = normalizedChildren.length > 0
        ? normalizedChildren
        : [createEmailBlock('row') as EmailRowBlock, createEmailBlock('row') as EmailRowBlock];
      return {
        id,
        kind: 'columns',
        label: normalizeString((overrides as Partial<EmailColumnsBlock> | undefined)?.label) || 'Columns',
        gap: normalizeColumnsGap((overrides as Partial<EmailColumnsBlock> | undefined)?.gap),
        children: childrenWithFallback,
      };
    }
    case 'row': {
      const rawChildren = (overrides as Partial<EmailRowBlock> | undefined)?.children;
      return {
        id,
        kind: 'row',
        label: normalizeString((overrides as Partial<EmailRowBlock> | undefined)?.label) || 'Row',
        background: normalizeColor((overrides as Partial<EmailRowBlock> | undefined)?.background, '#ffffff'),
        paddingY: normalizePadding((overrides as Partial<EmailRowBlock> | undefined)?.paddingY, 8),
        paddingX: normalizePadding((overrides as Partial<EmailRowBlock> | undefined)?.paddingX, 8),
        children: normalizeEmailBlocks(rawChildren).filter(
          (child: EmailBlock): child is EmailLeafBlock => isEmailLeafBlock(child)
        ),
      };
    }
  }
};

export const normalizeEmailBlock = (input: unknown): EmailBlock | null => {
  if (!input || typeof input !== 'object') return null;
  const record = input as Record<string, unknown>;
  const kindRaw = normalizeString(record['kind']).toLowerCase();
  if (
    !LEAF_KINDS.has(kindRaw as EmailLeafBlockKind) &&
    !CONTAINER_KINDS.has(kindRaw as EmailContainerBlockKind)
  ) {
    return null;
  }
  return createEmailBlock(kindRaw as EmailBlockKind, record as Partial<EmailBlock>);
};

export const normalizeEmailBlocks = (input: unknown): EmailBlock[] => {
  if (!Array.isArray(input)) return [];
  const blocks: EmailBlock[] = [];
  const usedIds = new Set<string>();
  input.forEach((entry: unknown) => {
    const normalized = normalizeEmailBlock(entry);
    if (!normalized) return;
    let resolvedId = normalized.id;
    if (usedIds.has(resolvedId)) {
      let suffix = 2;
      while (usedIds.has(`${normalized.id}-${suffix}`)) suffix += 1;
      resolvedId = `${normalized.id}-${suffix}`;
    }
    usedIds.add(resolvedId);
    blocks.push({ ...normalized, id: resolvedId } as EmailBlock);
  });
  return blocks;
};
