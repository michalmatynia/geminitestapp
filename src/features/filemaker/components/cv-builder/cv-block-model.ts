/* eslint-disable complexity, consistent-return, max-lines, max-lines-per-function, @typescript-eslint/consistent-type-assertions, @typescript-eslint/strict-boolean-expressions */

import { normalizeString, toIdToken } from '../../filemaker-settings.helpers';

export type CvLeafBlockKind =
  | 'profileHeader'
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'languages'
  | 'customText'
  | 'divider'
  | 'spacer';
export type CvContainerBlockKind = 'section' | 'stack' | 'columns' | 'row';
export type CvBlockKind = CvLeafBlockKind | CvContainerBlockKind;

interface CvBlockBase {
  id: string;
  kind: CvBlockKind;
}

export interface CvProfileHeaderBlock extends CvBlockBase {
  kind: 'profileHeader';
  name: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  linkedinUrl: string;
  githubUrl: string;
}

export interface CvSummaryBlock extends CvBlockBase {
  kind: 'summary';
  text: string;
}

export interface CvExperienceBlock extends CvBlockBase {
  kind: 'experience';
  title: string;
  organization: string;
  period: string;
  location: string;
  description: string;
  highlights: string[];
}

export interface CvEducationBlock extends CvBlockBase {
  kind: 'education';
  institution: string;
  degree: string;
  period: string;
  description: string;
}

export interface CvSkillsBlock extends CvBlockBase {
  kind: 'skills';
  label: string;
  items: string[];
}

export interface CvLanguagesBlock extends CvBlockBase {
  kind: 'languages';
  label: string;
  items: string[];
}

export interface CvCustomTextBlock extends CvBlockBase {
  kind: 'customText';
  label: string;
  html: string;
}

export interface CvDividerBlock extends CvBlockBase {
  kind: 'divider';
  color: string;
}

export interface CvSpacerBlock extends CvBlockBase {
  kind: 'spacer';
  height: number;
}

export interface CvSectionBlock extends CvBlockBase {
  kind: 'section';
  label: string;
  background: string;
  paddingY: number;
  paddingX: number;
  children: CvBlock[];
}

export interface CvStackBlock extends CvBlockBase {
  kind: 'stack';
  label: string;
  gap: number;
  children: CvLeafBlock[];
}

export interface CvColumnsBlock extends CvBlockBase {
  kind: 'columns';
  label: string;
  gap: number;
  children: CvRowBlock[];
}

export interface CvRowBlock extends CvBlockBase {
  kind: 'row';
  label: string;
  background: string;
  paddingY: number;
  paddingX: number;
  children: CvLeafBlock[];
}

export type CvLeafBlock =
  | CvProfileHeaderBlock
  | CvSummaryBlock
  | CvExperienceBlock
  | CvEducationBlock
  | CvSkillsBlock
  | CvLanguagesBlock
  | CvCustomTextBlock
  | CvDividerBlock
  | CvSpacerBlock;

export type CvContainerBlock = CvSectionBlock | CvStackBlock | CvColumnsBlock | CvRowBlock;

export type CvBlock = CvLeafBlock | CvContainerBlock;

const LEAF_KINDS: ReadonlySet<CvLeafBlockKind> = new Set([
  'profileHeader',
  'summary',
  'experience',
  'education',
  'skills',
  'languages',
  'customText',
  'divider',
  'spacer',
]);

const CONTAINER_KINDS: ReadonlySet<CvContainerBlockKind> = new Set([
  'section',
  'stack',
  'columns',
  'row',
]);

export const isCvLeafBlock = (block: CvBlock): block is CvLeafBlock =>
  LEAF_KINDS.has(block.kind as CvLeafBlockKind);

export const isCvContainerBlock = (block: CvBlock): block is CvContainerBlock =>
  CONTAINER_KINDS.has(block.kind as CvContainerBlockKind);

export const getCvBlockChildren = (block: CvBlock): CvBlock[] =>
  isCvContainerBlock(block) ? (block.children as CvBlock[]) : [];

export const isCvContainerKindAcceptingChildKind = (
  parentKind: CvContainerBlockKind,
  childKind: CvBlockKind
): boolean => {
  if (parentKind === 'section') return childKind !== 'section';
  if (parentKind === 'stack') return LEAF_KINDS.has(childKind as CvLeafBlockKind);
  if (parentKind === 'columns') return childKind === 'row';
  return LEAF_KINDS.has(childKind as CvLeafBlockKind);
};

const generateBlockId = (kind: CvBlockKind): string =>
  `filemaker-cv-block-${kind}-${toIdToken(`${Date.now()}-${Math.random().toString(36).slice(2, 8)}`) || 'entry'}`;

const normalizeColor = (value: unknown, fallback: string): string => {
  const normalized = normalizeString(value).trim();
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(normalized)) return normalized;
  return fallback;
};

const normalizePadding = (value: unknown, fallback: number): number => {
  const parsed = Math.trunc(Number(value));
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.min(parsed, 96);
};

const normalizeGap = (value: unknown, fallback: number): number => {
  const parsed = Math.trunc(Number(value));
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.min(parsed, 64);
};

const normalizeStringList = (input: unknown): string[] => {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const values: string[] = [];
  input.forEach((entry: unknown): void => {
    const value = normalizeString(entry).trim();
    const key = value.toLowerCase();
    if (value.length === 0 || seen.has(key)) return;
    seen.add(key);
    values.push(value);
  });
  return values;
};

const normalizeSpacerHeight = (value: unknown): number => {
  const parsed = Math.trunc(Number(value));
  if (!Number.isFinite(parsed) || parsed <= 0) return 20;
  return Math.min(parsed, 200);
};

export const createCvBlock = (kind: CvBlockKind, overrides?: Partial<CvBlock>): CvBlock => {
  const id =
    (overrides && 'id' in overrides && normalizeString((overrides as { id?: string }).id)) ||
    generateBlockId(kind);

  switch (kind) {
    case 'profileHeader':
      return {
        id,
        kind,
        name: normalizeString((overrides as Partial<CvProfileHeaderBlock> | undefined)?.name) || 'Name',
        headline: normalizeString((overrides as Partial<CvProfileHeaderBlock> | undefined)?.headline),
        email: normalizeString((overrides as Partial<CvProfileHeaderBlock> | undefined)?.email),
        phone: normalizeString((overrides as Partial<CvProfileHeaderBlock> | undefined)?.phone),
        location: normalizeString((overrides as Partial<CvProfileHeaderBlock> | undefined)?.location),
        website: normalizeString((overrides as Partial<CvProfileHeaderBlock> | undefined)?.website),
        linkedinUrl: normalizeString((overrides as Partial<CvProfileHeaderBlock> | undefined)?.linkedinUrl),
        githubUrl: normalizeString((overrides as Partial<CvProfileHeaderBlock> | undefined)?.githubUrl),
      };
    case 'summary':
      return {
        id,
        kind,
        text:
          normalizeString((overrides as Partial<CvSummaryBlock> | undefined)?.text) ||
          'Write a short professional summary.',
      };
    case 'experience':
    {
      const experienceOverrides = overrides as Partial<CvExperienceBlock> | undefined;
      const hasDescriptionOverride =
        experienceOverrides !== undefined &&
        Object.prototype.hasOwnProperty.call(experienceOverrides, 'description');
      const description = normalizeString(experienceOverrides?.description);
      return {
        id,
        kind,
        title: normalizeString(experienceOverrides?.title) || 'Role',
        organization: normalizeString(experienceOverrides?.organization),
        period: normalizeString(experienceOverrides?.period),
        location: normalizeString(experienceOverrides?.location),
        description: hasDescriptionOverride
          ? description
          : description || 'Describe the scope, responsibilities, and outcomes.',
        highlights: normalizeStringList(experienceOverrides?.highlights),
      };
    }
    case 'education':
      return {
        id,
        kind,
        institution:
          normalizeString((overrides as Partial<CvEducationBlock> | undefined)?.institution) ||
          'Institution',
        degree: normalizeString((overrides as Partial<CvEducationBlock> | undefined)?.degree),
        period: normalizeString((overrides as Partial<CvEducationBlock> | undefined)?.period),
        description: normalizeString((overrides as Partial<CvEducationBlock> | undefined)?.description),
      };
    case 'skills':
      return {
        id,
        kind,
        label: normalizeString((overrides as Partial<CvSkillsBlock> | undefined)?.label) || 'Skills',
        items: normalizeStringList((overrides as Partial<CvSkillsBlock> | undefined)?.items),
      };
    case 'languages':
      return {
        id,
        kind,
        label:
          normalizeString((overrides as Partial<CvLanguagesBlock> | undefined)?.label) || 'Languages',
        items: normalizeStringList((overrides as Partial<CvLanguagesBlock> | undefined)?.items),
      };
    case 'customText':
    {
      const customTextOverrides = overrides as Partial<CvCustomTextBlock> | undefined;
      const hasLabelOverride =
        customTextOverrides !== undefined &&
        Object.prototype.hasOwnProperty.call(customTextOverrides, 'label');
      const label = normalizeString(customTextOverrides?.label);
      return {
        id,
        kind,
        label: hasLabelOverride ? label : label || 'Additional information',
        html:
          normalizeString(customTextOverrides?.html) ||
          '<p>Add details.</p>',
      };
    }
    case 'divider':
      return {
        id,
        kind,
        color: normalizeColor((overrides as Partial<CvDividerBlock> | undefined)?.color, '#e5e7eb'),
      };
    case 'spacer':
      return {
        id,
        kind,
        height: normalizeSpacerHeight((overrides as Partial<CvSpacerBlock> | undefined)?.height),
      };
    case 'section': {
      const rawChildren = (overrides as Partial<CvSectionBlock> | undefined)?.children;
      return {
        id,
        kind,
        label: normalizeString((overrides as Partial<CvSectionBlock> | undefined)?.label) || 'Section',
        background: normalizeColor((overrides as Partial<CvSectionBlock> | undefined)?.background, '#ffffff'),
        paddingY: normalizePadding((overrides as Partial<CvSectionBlock> | undefined)?.paddingY, 20),
        paddingX: normalizePadding((overrides as Partial<CvSectionBlock> | undefined)?.paddingX, 24),
        children: normalizeCvBlocks(rawChildren).filter((child: CvBlock): boolean =>
          isCvContainerKindAcceptingChildKind('section', child.kind)
        ),
      };
    }
    case 'stack': {
      const rawChildren = (overrides as Partial<CvStackBlock> | undefined)?.children;
      return {
        id,
        kind,
        label: normalizeString((overrides as Partial<CvStackBlock> | undefined)?.label) || 'Stack',
        gap: normalizeGap((overrides as Partial<CvStackBlock> | undefined)?.gap, 12),
        children: normalizeCvBlocks(rawChildren).filter(
          (child: CvBlock): child is CvLeafBlock => isCvLeafBlock(child)
        ),
      };
    }
    case 'columns': {
      const rawChildren = (overrides as Partial<CvColumnsBlock> | undefined)?.children;
      const normalizedChildren = normalizeCvBlocks(rawChildren).filter(
        (child: CvBlock): child is CvRowBlock => child.kind === 'row'
      );
      return {
        id,
        kind,
        label: normalizeString((overrides as Partial<CvColumnsBlock> | undefined)?.label) || 'Columns',
        gap: normalizeGap((overrides as Partial<CvColumnsBlock> | undefined)?.gap, 20),
        children:
          normalizedChildren.length > 0
            ? normalizedChildren
            : [createCvBlock('row') as CvRowBlock, createCvBlock('row') as CvRowBlock],
      };
    }
    case 'row': {
      const rawChildren = (overrides as Partial<CvRowBlock> | undefined)?.children;
      return {
        id,
        kind,
        label: normalizeString((overrides as Partial<CvRowBlock> | undefined)?.label) || 'Row',
        background: normalizeColor((overrides as Partial<CvRowBlock> | undefined)?.background, '#ffffff'),
        paddingY: normalizePadding((overrides as Partial<CvRowBlock> | undefined)?.paddingY, 8),
        paddingX: normalizePadding((overrides as Partial<CvRowBlock> | undefined)?.paddingX, 8),
        children: normalizeCvBlocks(rawChildren).filter(
          (child: CvBlock): child is CvLeafBlock => isCvLeafBlock(child)
        ),
      };
    }
  }
};

export const normalizeCvBlock = (input: unknown): CvBlock | null => {
  if (input === null || typeof input !== 'object') return null;
  const record = input as Record<string, unknown>;
  const kindRaw = normalizeString(record['kind']);
  if (
    !LEAF_KINDS.has(kindRaw as CvLeafBlockKind) &&
    !CONTAINER_KINDS.has(kindRaw as CvContainerBlockKind)
  ) {
    return null;
  }
  return createCvBlock(kindRaw as CvBlockKind, record as Partial<CvBlock>);
};

export const normalizeCvBlocks = (input: unknown): CvBlock[] => {
  if (!Array.isArray(input)) return [];
  const blocks: CvBlock[] = [];
  const usedIds = new Set<string>();
  input.forEach((entry: unknown): void => {
    const normalized = normalizeCvBlock(entry);
    if (!normalized) return;
    let resolvedId = normalized.id;
    if (usedIds.has(resolvedId)) {
      let suffix = 2;
      while (usedIds.has(`${normalized.id}-${suffix}`)) suffix += 1;
      resolvedId = `${normalized.id}-${suffix}`;
    }
    usedIds.add(resolvedId);
    blocks.push({ ...normalized, id: resolvedId } as CvBlock);
  });
  return blocks;
};
