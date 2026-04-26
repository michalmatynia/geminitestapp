import { normalizeString, toIdToken } from '../../filemaker-settings.helpers';

export type EmailBlockKind = 'text' | 'heading' | 'image' | 'button' | 'divider' | 'spacer';

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

export type EmailBlock =
  | EmailTextBlock
  | EmailHeadingBlock
  | EmailImageBlock
  | EmailButtonBlock
  | EmailDividerBlock
  | EmailSpacerBlock;

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
  }
};

export const normalizeEmailBlock = (input: unknown): EmailBlock | null => {
  if (!input || typeof input !== 'object') return null;
  const record = input as Record<string, unknown>;
  const kindRaw = normalizeString(record['kind']).toLowerCase();
  if (
    kindRaw !== 'text' &&
    kindRaw !== 'heading' &&
    kindRaw !== 'image' &&
    kindRaw !== 'button' &&
    kindRaw !== 'divider' &&
    kindRaw !== 'spacer'
  ) {
    return null;
  }
  return createEmailBlock(kindRaw, record as Partial<EmailBlock>);
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
