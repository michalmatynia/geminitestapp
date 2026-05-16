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

export type EmailLeafBlock = EmailTextBlock | EmailHeadingBlock | EmailImageBlock | EmailButtonBlock | EmailDividerBlock | EmailSpacerBlock;

export type EmailContainerBlock = EmailSectionBlock | EmailColumnsBlock | EmailRowBlock;

export type EmailBlock = EmailLeafBlock | EmailContainerBlock;

const LEAF_KIND_VALUES = ['text', 'heading', 'image', 'button', 'divider', 'spacer'] as const satisfies readonly EmailLeafBlockKind[];

const CONTAINER_KIND_VALUES = ['section', 'columns', 'row'] as const satisfies readonly EmailContainerBlockKind[];

const LEAF_KINDS: ReadonlySet<string> = new Set(LEAF_KIND_VALUES);
const CONTAINER_KINDS: ReadonlySet<string> = new Set(CONTAINER_KIND_VALUES);

const isEmailLeafBlockKind = (value: string): value is EmailLeafBlockKind => LEAF_KINDS.has(value);

const isEmailContainerBlockKind = (value: string): value is EmailContainerBlockKind => CONTAINER_KINDS.has(value);

const isEmailBlockKind = (value: string): value is EmailBlockKind =>
  isEmailLeafBlockKind(value) || isEmailContainerBlockKind(value);

export const isEmailLeafBlock = (block: EmailBlock): block is EmailLeafBlock => isEmailLeafBlockKind(block.kind);

export const isEmailContainerBlock = (block: EmailBlock): block is EmailContainerBlock =>
  isEmailContainerBlockKind(block.kind);

export const getBlockChildren = (block: EmailBlock): EmailBlock[] =>
  isEmailContainerBlock(block) ? (block.children as EmailBlock[]) : [];

export const isContainerKindAcceptingChildKind = (
  parentKind: EmailContainerBlockKind,
  childKind: EmailBlockKind
): boolean => {
  switch (parentKind) {
    case 'section':
      return childKind !== 'section'; // no nested sections
    case 'columns':
      return childKind === 'row';
    case 'row':
      return isEmailLeafBlockKind(childKind);
  }
};

const generateBlockId = (kind: EmailBlockKind): string => {
  const token = toIdToken(`${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  return `filemaker-email-block-${kind}-${token.length > 0 ? token : 'entry'}`;
};

const normalizeStringWithFallback = (value: unknown, fallback: string): string => {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : fallback;
};

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

const resolveBlockId = (kind: EmailBlockKind, overrides?: Partial<EmailBlock>): string => {
  if (overrides === undefined || !('id' in overrides)) return generateBlockId(kind);
  const id = normalizeString(overrides.id);
  return id.length > 0 ? id : generateBlockId(kind);
};

const createTextBlock = (id: string, overrides?: Partial<EmailTextBlock>): EmailTextBlock => {
  return {
    id,
    kind: 'text',
    html: normalizeStringWithFallback(overrides?.html, '<p>Write your message…</p>'),
  };
};

const createHeadingBlock = (id: string, overrides?: Partial<EmailHeadingBlock>): EmailHeadingBlock => {
  return {
    id,
    kind: 'heading',
    text: normalizeStringWithFallback(overrides?.text, 'Heading'),
    level: clampLevel(overrides?.level),
    align: normalizeAlign(overrides?.align),
  };
};

const createImageBlock = (id: string, overrides?: Partial<EmailImageBlock>): EmailImageBlock => {
  const href = normalizeString(overrides?.href);
  return {
    id,
    kind: 'image',
    src: normalizeString(overrides?.src),
    alt: normalizeString(overrides?.alt),
    href: href.length > 0 ? href : null,
    width: normalizeNullablePositiveInt(overrides?.width),
    align: normalizeAlign(overrides?.align ?? 'center'),
  };
};

const createButtonBlock = (id: string, overrides?: Partial<EmailButtonBlock>): EmailButtonBlock => {
  return {
    id,
    kind: 'button',
    label: normalizeStringWithFallback(overrides?.label, 'Click here'),
    href: normalizeStringWithFallback(overrides?.href, 'https://example.com'),
    align: normalizeAlign(overrides?.align ?? 'center'),
    background: normalizeColor(overrides?.background, '#2563eb'),
    color: normalizeColor(overrides?.color, '#ffffff'),
  };
};

const createDividerBlock = (id: string, overrides?: Partial<EmailDividerBlock>): EmailDividerBlock => ({
  id,
  kind: 'divider',
  color: normalizeColor(overrides?.color, '#e5e7eb'),
});

const createSpacerBlock = (id: string, overrides?: Partial<EmailSpacerBlock>): EmailSpacerBlock => {
  const height = Math.trunc(Number(overrides?.height));
  return {
    id,
    kind: 'spacer',
    height: Number.isFinite(height) && height > 0 ? Math.min(height, 200) : 24,
  };
};

const createSectionBlock = (id: string, overrides?: Partial<EmailSectionBlock>): EmailSectionBlock => {
  return {
    id,
    kind: 'section',
    label: normalizeStringWithFallback(overrides?.label, 'Section'),
    background: normalizeColor(overrides?.background, '#ffffff'),
    paddingY: normalizePadding(overrides?.paddingY, 24),
    paddingX: normalizePadding(overrides?.paddingX, 24),
    children: normalizeEmailBlocks(overrides?.children).filter((child: EmailBlock): boolean =>
      isContainerKindAcceptingChildKind('section', child.kind)
    ),
  };
};

const createColumnsFallbackRows = (): EmailRowBlock[] => [
  createRowBlock(generateBlockId('row')),
  createRowBlock(generateBlockId('row')),
];

const createColumnsBlock = (id: string, overrides?: Partial<EmailColumnsBlock>): EmailColumnsBlock => {
  const normalizedChildren = normalizeEmailBlocks(overrides?.children).filter(
    (child: EmailBlock): child is EmailRowBlock => child.kind === 'row'
  );
  return {
    id,
    kind: 'columns',
    label: normalizeStringWithFallback(overrides?.label, 'Columns'),
    gap: normalizeColumnsGap(overrides?.gap),
    children: normalizedChildren.length > 0 ? normalizedChildren : createColumnsFallbackRows(),
  };
};

const createRowBlock = (id: string, overrides?: Partial<EmailRowBlock>): EmailRowBlock => {
  return {
    id,
    kind: 'row',
    label: normalizeStringWithFallback(overrides?.label, 'Row'),
    background: normalizeColor(overrides?.background, '#ffffff'),
    paddingY: normalizePadding(overrides?.paddingY, 8),
    paddingX: normalizePadding(overrides?.paddingX, 8),
    children: normalizeEmailBlocks(overrides?.children).filter(
      (child: EmailBlock): child is EmailLeafBlock => isEmailLeafBlock(child)
    ),
  };
};

const createLeafEmailBlock = (
  kind: EmailLeafBlockKind,
  id: string,
  overrides?: Partial<EmailBlock>
): EmailLeafBlock => {
  switch (kind) {
    case 'text':
      return createTextBlock(id, overrides as Partial<EmailTextBlock> | undefined);
    case 'heading':
      return createHeadingBlock(id, overrides as Partial<EmailHeadingBlock> | undefined);
    case 'image':
      return createImageBlock(id, overrides as Partial<EmailImageBlock> | undefined);
    case 'button':
      return createButtonBlock(id, overrides as Partial<EmailButtonBlock> | undefined);
    case 'divider':
      return createDividerBlock(id, overrides as Partial<EmailDividerBlock> | undefined);
    case 'spacer':
      return createSpacerBlock(id, overrides as Partial<EmailSpacerBlock> | undefined);
  }
};

const createContainerEmailBlock = (
  kind: EmailContainerBlockKind,
  id: string,
  overrides?: Partial<EmailBlock>
): EmailContainerBlock => {
  switch (kind) {
    case 'section':
      return createSectionBlock(id, overrides as Partial<EmailSectionBlock> | undefined);
    case 'columns':
      return createColumnsBlock(id, overrides as Partial<EmailColumnsBlock> | undefined);
    case 'row':
      return createRowBlock(id, overrides as Partial<EmailRowBlock> | undefined);
  }
};

export const createEmailBlock = (kind: EmailBlockKind, overrides?: Partial<EmailBlock>): EmailBlock => {
  const id = resolveBlockId(kind, overrides);
  if (isEmailLeafBlockKind(kind)) return createLeafEmailBlock(kind, id, overrides);
  return createContainerEmailBlock(kind, id, overrides);
};

export const normalizeEmailBlock = (input: unknown): EmailBlock | null => {
  if (input === null || input === undefined || typeof input !== 'object') return null;
  const record = input as Record<string, unknown>;
  const kindRaw = normalizeString(record['kind']).toLowerCase();
  if (!isEmailBlockKind(kindRaw)) return null;
  return createEmailBlock(kindRaw, record as Partial<EmailBlock>);
};

const withResolvedBlockId = (block: EmailBlock, id: string): EmailBlock => ({ ...block, id });

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
    blocks.push(withResolvedBlockId(normalized, resolvedId));
  });
  return blocks;
};
