import { getSectionDefinition, getBlockDefinition } from '../../components/page-builder/section-registry';

import type {
  SectionInstance,
  BlockInstance,
  SettingsField,
} from '../../types/page-builder';

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

export const GLOBAL_ID_KEY = '__cmsNextId';

export function getNextId(): number {
  const globalScope = globalThis as { [GLOBAL_ID_KEY]?: number };
  const nextId = globalScope[GLOBAL_ID_KEY];
  if (typeof nextId !== 'number') {
    globalScope[GLOBAL_ID_KEY] = 1000;
    return 1000;
  }
  return nextId;
}

export function bumpNextId(target: number): void {
  const globalScope = globalThis as { [GLOBAL_ID_KEY]?: number };
  const nextId = globalScope[GLOBAL_ID_KEY];
  if (typeof nextId !== 'number' || nextId < target) {
    globalScope[GLOBAL_ID_KEY] = target;
  }
}

export function uid(): string {
  const current = getNextId();
  bumpNextId(current + 1);
  return `node-${current}`;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const NODE_ID_REGEX = /node-(\d+)/;
export const TEXT_ATOM_BLOCK_TYPE = 'TextAtom';
export const TEXT_ATOM_LETTER_TYPE = 'TextAtomLetter';
export const CONTAINER_BLOCK_TYPES = new Set([
  'ImageWithText',
  'Hero',
  'RichText',
  'Block',
  TEXT_ATOM_BLOCK_TYPE,
  'Carousel',
  'CarouselFrame',
  'Slideshow',
  'SlideshowFrame',
]);

// ---------------------------------------------------------------------------
// Sync & normalize helpers
// ---------------------------------------------------------------------------

export function syncNextIdFromSections(sections: SectionInstance[]): void {
  let maxId = 999;
  const stack: Array<SectionInstance | BlockInstance> = [...sections];
  while (stack.length) {
    const item = stack.pop();
    if (!item) continue;
    const id = typeof item.id === 'string' ? item.id : '';
    const match = NODE_ID_REGEX.exec(id);
    if (match) {
      const value = Number(match[1]);
      if (Number.isFinite(value)) {
        maxId = Math.max(maxId, value);
      }
    }
    const blocks = 'blocks' in item ? item.blocks : undefined;
    if (blocks && blocks.length > 0) {
      stack.push(...blocks);
    }
  }
  bumpNextId(maxId + 1);
}

export function normalizeTextAtomText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function buildTextAtomLetterBlocks(
  text: string,
  existing: BlockInstance[] | undefined,
  seen?: Set<string>
): BlockInstance[] {
  const def = getBlockDefinition(TEXT_ATOM_LETTER_TYPE);
  const letters = Array.from(text ?? '');
  return letters.map((char: string, index: number): BlockInstance => {
    const existingBlock = existing?.[index];
    const baseSettings = def?.defaultSettings ?? {};
    const nextSettings = {
      ...baseSettings,
      ...(existingBlock?.settings ?? {}),
      textContent: char,
    };
    const candidateId = existingBlock?.id ?? uid();
    const id = seen ? ensureUniqueId(candidateId, seen) : candidateId;
    return {
      id,
      type: TEXT_ATOM_LETTER_TYPE,
      settings: nextSettings,
    };
  });
}

export function applyTextAtomSettings(
  block: BlockInstance,
  nextSettings: Record<string, unknown>,
  seen?: Set<string>
): BlockInstance {
  if (block.type !== TEXT_ATOM_BLOCK_TYPE) {
    return { ...block, settings: nextSettings };
  }
  const text = normalizeTextAtomText(nextSettings['text']);
  const nextBlocks = buildTextAtomLetterBlocks(text, block.blocks, seen);
  return { ...block, settings: nextSettings, blocks: nextBlocks };
}

export function isContainerBlockType(type: string): boolean {
  return CONTAINER_BLOCK_TYPES.has(type);
}

// ---------------------------------------------------------------------------
// Block/section creation
// ---------------------------------------------------------------------------

export function createBlockInstance(type: string): BlockInstance | null {
  const def = getBlockDefinition(type);
  if (!def) return null;
  const baseSettings = { ...def.defaultSettings };
  if (type === TEXT_ATOM_BLOCK_TYPE) {
    const text = normalizeTextAtomText(baseSettings['text']);
    return {
      id: uid(),
      type,
      settings: baseSettings,
      blocks: buildTextAtomLetterBlocks(text, undefined),
    };
  }
  return {
    id: uid(),
    type,
    settings: baseSettings,
    ...(isContainerBlockType(type) ? { blocks: [] } : {}),
  };
}

export function ensureUniqueId(id: unknown, seen: Set<string>): string {
  let nextId = typeof id === 'string' && id.length > 0 ? id : uid();
  if (!seen.has(nextId)) {
    seen.add(nextId);
    return nextId;
  }
  do {
    nextId = uid();
  } while (seen.has(nextId));
  seen.add(nextId);
  return nextId;
}

export function createColumnBlock(): BlockInstance {
  const colDef = getBlockDefinition('Column');
  return {
    id: uid(),
    type: 'Column',
    settings: colDef ? { ...colDef.defaultSettings } : {},
    blocks: [],
  };
}

export function createRowBlock(columnCount: number): BlockInstance {
  const rowDef = getBlockDefinition('Row');
  const defaultSettings = rowDef ? { ...rowDef.defaultSettings } : {};
  const minHeight =
    typeof defaultSettings['minHeight'] === 'number' && Number.isFinite(defaultSettings['minHeight'])
      ? (defaultSettings['minHeight'])
      : 0;
  if (minHeight <= 0) {
    defaultSettings['minHeight'] = 120;
  }
  return {
    id: uid(),
    type: 'Row',
    settings: defaultSettings,
    blocks: Array.from({ length: Math.max(1, columnCount) }, () => createColumnBlock()),
  };
}

// ---------------------------------------------------------------------------
// Grid operations
// ---------------------------------------------------------------------------

export function splitGridBlocks(blocks: BlockInstance[]): {
  rows: BlockInstance[];
  columns: BlockInstance[];
  extras: BlockInstance[];
} {
  const rows: BlockInstance[] = [];
  const columns: BlockInstance[] = [];
  const extras: BlockInstance[] = [];
  for (const block of blocks) {
    if (block.type === 'Row') {
      rows.push(block);
    } else if (block.type === 'Column') {
      columns.push(block);
    } else {
      extras.push(block);
    }
  }
  return { rows, columns, extras };
}

export function ensureGridRows(section: SectionInstance): SectionInstance {
  if (section.type !== 'Grid') return section;
  const { rows, columns, extras } = splitGridBlocks(section.blocks);
  if (rows.length > 0) {
    if (columns.length === 0) return section;
    const rowDef = getBlockDefinition('Row');
    const extraRow: BlockInstance = {
      id: uid(),
      type: 'Row',
      settings: rowDef ? { ...rowDef.defaultSettings } : {},
      blocks: columns,
    };
    const allRows = [...rows, extraRow];
    const maxColumns = Math.max(
      1,
      ...allRows.map((row: BlockInstance) => (row.blocks ?? []).filter((b: BlockInstance) => b.type === 'Column').length)
    );
    return {
      ...section,
      blocks: [...allRows, ...extras],
      settings: { ...section.settings, rows: allRows.length, columns: maxColumns },
    };
  }
  const rowDef = getBlockDefinition('Row');
  const rowsSetting = (section.settings['rows'] as number) ?? 1;
  const columnsSetting = (section.settings['columns'] as number) ?? Math.max(1, columns.length || 1);
  if (columns.length === 0) {
    const rows = Array.from({ length: Math.max(1, rowsSetting) }, () => createRowBlock(columnsSetting));
    return { ...section, blocks: [...rows, ...extras], settings: { ...section.settings, rows: rows.length, columns: columnsSetting } };
  }
  const row: BlockInstance = {
    id: uid(),
    type: 'Row',
    settings: rowDef ? { ...rowDef.defaultSettings } : {},
    blocks: columns,
  };
  return { ...section, blocks: [row, ...extras], settings: { ...section.settings, rows: 1, columns: columns.length } };
}

export function updateColumnBlocks(
  blocks: BlockInstance[],
  columnId: string,
  updater: (column: BlockInstance) => BlockInstance
): BlockInstance[] {
  return blocks.map((block: BlockInstance) => {
    if (block.type === 'Column') {
      return block.id === columnId ? updater(block) : block;
    }
    if (block.type === 'Row' && block.blocks) {
      return { ...block, blocks: updateColumnBlocks(block.blocks, columnId, updater) };
    }
    return block;
  });
}

export function updateRowBlocks(
  blocks: BlockInstance[],
  rowId: string,
  updater: (row: BlockInstance) => BlockInstance
): BlockInstance[] {
  return blocks.map((block: BlockInstance) => {
    if (block.type === 'Row') {
      return block.id === rowId ? updater(block) : block;
    }
    return block;
  });
}

// ---------------------------------------------------------------------------
// Block manipulation
// ---------------------------------------------------------------------------

export function removeColumnFromRows(
  blocks: BlockInstance[],
  columnId: string,
  rowId?: string
): { blocks: BlockInstance[]; removed: boolean } {
  let removed = false;
  const nextBlocks = blocks.map((block: BlockInstance) => {
    if (block.type !== 'Row') return block;
    const rowBlocks = block.blocks ?? [];
    const columns = rowBlocks.filter((b: BlockInstance) => b.type === 'Column');
    const isTargetRow = rowId ? block.id === rowId : rowBlocks.some((b: BlockInstance) => b.id === columnId);
    if (!isTargetRow) return block;
    if (columns.length <= 1) return block;
    const nextRowBlocks = rowBlocks.filter((b: BlockInstance) => b.id !== columnId);
    if (nextRowBlocks.length === rowBlocks.length) return block;
    removed = true;
    return { ...block, blocks: nextRowBlocks };
  });
  return { blocks: nextBlocks, removed };
}

export function removeBlockFromColumnBlocks(
  blocks: BlockInstance[],
  columnId: string,
  blockId: string,
  fromParentBlockId?: string
): { blocks: BlockInstance[]; moved?: BlockInstance } {
  let moved: BlockInstance | undefined;
  const nextBlocks = blocks.map((block: BlockInstance) => {
    if (block.type === 'Row' && block.blocks) {
      const result = removeBlockFromColumnBlocks(block.blocks, columnId, blockId, fromParentBlockId);
      if (result.moved) moved = result.moved;
      return { ...block, blocks: result.blocks };
    }
    if (block.type === 'Column' && block.id === columnId) {
      if (fromParentBlockId) {
        return {
          ...block,
          blocks: (block.blocks ?? []).map((pb: BlockInstance) => {
            if (pb.id !== fromParentBlockId) return pb;
            const found = (pb.blocks ?? []).find((eb: BlockInstance) => eb.id === blockId);
            if (found) moved = found;
            return { ...pb, blocks: (pb.blocks ?? []).filter((eb: BlockInstance) => eb.id !== blockId) };
          }),
        };
      }
      const found = (block.blocks ?? []).find((cb: BlockInstance) => cb.id === blockId);
      if (found) moved = found;
      return { ...block, blocks: (block.blocks ?? []).filter((cb: BlockInstance) => cb.id !== blockId) };
    }
    return block;
  });
  return { blocks: nextBlocks, ...(moved && { moved }) };
}

export function insertBlockIntoColumnBlocks(
  blocks: BlockInstance[],
  columnId: string,
  block: BlockInstance,
  toIndex: number,
  toParentBlockId?: string
): BlockInstance[] {
  return blocks.map((blockItem: BlockInstance) => {
    if (blockItem.type === 'Row' && blockItem.blocks) {
      return {
        ...blockItem,
        blocks: insertBlockIntoColumnBlocks(blockItem.blocks, columnId, block, toIndex, toParentBlockId),
      };
    }
    if (blockItem.type === 'Column' && blockItem.id === columnId) {
      if (toParentBlockId) {
        return {
          ...blockItem,
          blocks: (blockItem.blocks ?? []).map((pb: BlockInstance) => {
            if (pb.id !== toParentBlockId) return pb;
            const newBlocks = [...(pb.blocks ?? [])];
            newBlocks.splice(toIndex, 0, block);
            return { ...pb, blocks: newBlocks };
          }),
        };
      }
      const newBlocks = [...(blockItem.blocks ?? [])];
      newBlocks.splice(toIndex, 0, block);
      return { ...blockItem, blocks: newBlocks };
    }
    return blockItem;
  });
}

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

export function normalizeBlocks(blocks: BlockInstance[], seen: Set<string>): BlockInstance[] {
  return blocks.map((block: BlockInstance): BlockInstance => {
    const normalizedId = ensureUniqueId(block.id, seen);
    const nested = block.blocks ? normalizeBlocks(block.blocks, seen) : undefined;
    const def = getBlockDefinition(block.type);
    const mergedSettings = applySettingsDefaults(
      block.settings ?? {},
      def?.settingsSchema,
      def?.defaultSettings ?? {}
    );
    const normalized: BlockInstance = {
      ...block,
      id: normalizedId,
      settings: mergedSettings,
      ...(nested ? { blocks: nested } : {}),
    };
    if (normalized.type === TEXT_ATOM_BLOCK_TYPE) {
      return applyTextAtomSettings(normalized, mergedSettings, seen);
    }
    return normalized;
  });
}

export function updateSectionNestedBlocks(
  blocks: BlockInstance[],
  parentBlockId: string,
  updater: (block: BlockInstance) => BlockInstance
): BlockInstance[] {
  return blocks.map((block: BlockInstance) => {
    if (block.id === parentBlockId) {
      return updater(block);
    }
    if (block.blocks && block.blocks.length > 0) {
      return { ...block, blocks: updateSectionNestedBlocks(block.blocks, parentBlockId, updater) };
    }
    return block;
  });
}

export function normalizeSections(sections: SectionInstance[]): SectionInstance[] {
  const seen = new Set<string>();
  return sections.map((section: SectionInstance): SectionInstance => {
    const normalizedId = ensureUniqueId(section.id, seen);
    const baseSection = ensureGridRows({ ...section, id: normalizedId });
    const normalizedBlocks = normalizeBlocks(baseSection.blocks ?? [], seen);
    if (baseSection.type === TEXT_ATOM_BLOCK_TYPE) {
      const updatedBlock = applyTextAtomSettings(
        {
          id: baseSection.id,
          type: TEXT_ATOM_BLOCK_TYPE,
          settings: baseSection.settings,
          blocks: normalizedBlocks,
        },
        baseSection.settings,
        seen
      );
      return {
        ...baseSection,
        blocks: updatedBlock.blocks ?? [],
      };
    }
    return {
      ...baseSection,
      blocks: normalizedBlocks,
    };
  });
}

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

export function findSection(sections: SectionInstance[], nodeId: string): SectionInstance | null {
  for (const s of sections) {
    if (s.id === nodeId) return s;
  }
  return null;
}

export function findBlock(
  sections: SectionInstance[],
  nodeId: string
): { block: BlockInstance; section: SectionInstance; parentColumn?: BlockInstance; parentBlock?: BlockInstance; parentRow?: BlockInstance } | null {
  const searchBlocks = (
    blocks: BlockInstance[],
    section: SectionInstance,
    parentColumn?: BlockInstance,
    parentBlock?: BlockInstance,
    parentRow?: BlockInstance
  ): { block: BlockInstance; section: SectionInstance; parentColumn?: BlockInstance; parentBlock?: BlockInstance; parentRow?: BlockInstance } | null => {
    for (const b of blocks) {
      if (b.id === nodeId) return {
        block: b,
        section,
        ...(parentColumn && { parentColumn }),
        ...(parentBlock && { parentBlock }),
        ...(parentRow && { parentRow })
      };
      if (!b.blocks || b.blocks.length === 0) continue;
      if (b.type === 'Column') {
        for (const cb of b.blocks ?? []) {
          if (cb.id === nodeId) return { block: cb, section, parentColumn: b, ...(parentRow && { parentRow }) };
          if (cb.blocks) {
            for (const eb of cb.blocks) {
              if (eb.id === nodeId) return { block: eb, section, parentColumn: b, parentBlock: cb, ...(parentRow && { parentRow }) };
            }
          }
        }
        continue;
      }
      if (b.type === 'Row') {
        // Search inside Row - pass the Row as parentRow
        const nested = searchBlocks(b.blocks ?? [], section, parentColumn, parentBlock, b);
        if (nested) return nested;
        continue;
      }
      const nested = searchBlocks(b.blocks ?? [], section, parentColumn, b, parentRow);
      if (nested) return nested;
    }
    return null;
  };

  for (const s of sections) {
    const result = searchBlocks(s.blocks ?? [], s);
    if (result) return result;
  }
  return null;
}

export function findColumn(sections: SectionInstance[], nodeId: string): { column: BlockInstance; section: SectionInstance } | null {
  const searchColumns = (blocks: BlockInstance[], section: SectionInstance): { column: BlockInstance; section: SectionInstance } | null => {
    for (const b of blocks) {
      if (b.type === 'Column' && b.id === nodeId) return { column: b, section };
      if (b.blocks) {
        const nested = searchColumns(b.blocks, section);
        if (nested) return nested;
      }
    }
    return null;
  };
  for (const s of sections) {
    const result = searchColumns(s.blocks ?? [], s);
    if (result) return result;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Clone
// ---------------------------------------------------------------------------

export function cloneBlock(block: BlockInstance): BlockInstance {
  return {
    id: uid(),
    type: block.type,
    settings: { ...block.settings },
    ...(block.blocks ? { blocks: block.blocks.map(cloneBlock) } : {}),
  };
}

export function cloneSection(section: SectionInstance): SectionInstance {
  const cloned: SectionInstance = {
    id: uid(),
    type: section.type,
    zone: section.zone,
    settings: { ...section.settings },
    blocks: section.blocks.map(cloneBlock),
  };
  return ensureGridRows(cloned);
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export function applySettingsDefaults(
  settings: Record<string, unknown>,
  schema: SettingsField[] | undefined,
  base: Record<string, unknown>
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...base, ...settings };
  if (Array.isArray(schema)) {
    for (const field of schema) {
      if (merged[field.key] === undefined && field.defaultValue !== undefined) {
        merged[field.key] = field.defaultValue;
      }
    }
  }
  return merged;
}

export function buildSectionSettings(type: string, settings: Record<string, unknown>): Record<string, unknown> {
  const def = getSectionDefinition(type);
  if (!def) return settings;
  const merged = applySettingsDefaults(settings, def.settingsSchema, def.defaultSettings);
  if (type === 'AnnouncementBar') {
    const left = typeof merged['paddingLeft'] === 'number' ? (merged['paddingLeft']) : undefined;
    const right = typeof merged['paddingRight'] === 'number' ? (merged['paddingRight']) : undefined;
    return {
      ...merged,
      paddingLeft: left === 24 || left === undefined ? 0 : left,
      paddingRight: right === 24 || right === undefined ? 0 : right,
    };
  }
  return merged;
}
