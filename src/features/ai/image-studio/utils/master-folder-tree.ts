import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';
import { normalizeTreePath } from '@/shared/utils/tree-operations';

import { normalizeFolderPaths } from './studio-tree';

import type { ImageStudioSlotRecord } from '../types';

const FOLDER_NODE_PREFIX = 'folder:';
const SLOT_NODE_PREFIX = 'card:';

export type ImageStudioMasterNodeRef =
  | { entity: 'folder'; id: string; nodeId: string }
  | { entity: 'card'; id: string; nodeId: string };

type SlotTreeNode = {
  id: string;
  name: string;
  type: 'folder' | 'card';
  path: string;
  slotId?: string | null;
  roleLabel?: string | null;
  derivedFromCard?: boolean;
  children: SlotTreeNode[];
};

export const toFolderMasterNodeId = (folderPath: string): string =>
  `${FOLDER_NODE_PREFIX}${normalizeTreePath(folderPath)}`;

export const toSlotMasterNodeId = (slotId: string): string =>
  `${SLOT_NODE_PREFIX}${slotId}`;

export const isFolderMasterNodeId = (value: string): boolean =>
  value.startsWith(FOLDER_NODE_PREFIX);

export const isSlotMasterNodeId = (value: string): boolean =>
  value.startsWith(SLOT_NODE_PREFIX);

export const fromFolderMasterNodeId = (value: string): string | null =>
  isFolderMasterNodeId(value)
    ? normalizeTreePath(value.slice(FOLDER_NODE_PREFIX.length))
    : null;

export const fromSlotMasterNodeId = (value: string): string | null =>
  isSlotMasterNodeId(value) ? value.slice(SLOT_NODE_PREFIX.length) : null;

export const decodeImageStudioMasterNodeId = (value: string): ImageStudioMasterNodeRef | null => {
  const folderPath = fromFolderMasterNodeId(value);
  if (folderPath !== null && folderPath.length > 0) {
    return { entity: 'folder', id: folderPath, nodeId: value };
  }

  const slotId = fromSlotMasterNodeId(value);
  if (slotId) {
    return { entity: 'card', id: slotId, nodeId: value };
  }

  return null;
};

const getSlotMetadata = (slot: ImageStudioSlotRecord): Record<string, unknown> | null => {
  if (!slot.metadata || typeof slot.metadata !== 'object' || Array.isArray(slot.metadata)) return null;
  return slot.metadata;
};

const getSlotRole = (slot: ImageStudioSlotRecord): string | null => {
  const metadata = getSlotMetadata(slot);
  const role = metadata?.['role'];
  if (typeof role !== 'string') return null;
  const normalized = role.trim().toLowerCase();
  return normalized || null;
};

const getSlotSourceId = (slot: ImageStudioSlotRecord): string | null => {
  const metadata = getSlotMetadata(slot);
  const sourceSlotId = metadata?.['sourceSlotId'];
  if (typeof sourceSlotId !== 'string') return null;
  const normalized = sourceSlotId.trim();
  return normalized || null;
};

const getSlotRelationType = (slot: ImageStudioSlotRecord): string | null => {
  const metadata = getSlotMetadata(slot);
  const relationType = metadata?.['relationType'];
  if (typeof relationType !== 'string') return null;
  const normalized = relationType.trim().toLowerCase();
  return normalized || null;
};

const getRoleLabel = (slot: ImageStudioSlotRecord, derivedFromCard: boolean): string | null => {
  const metadata = getSlotMetadata(slot);
  const role = getSlotRole(slot);
  if (role === 'mask') {
    const variant = typeof metadata?.['variant'] === 'string' ? metadata['variant'].trim().toLowerCase() : '';
    const inverted = Boolean(metadata?.['inverted']);
    if (variant) return inverted ? `mask ${variant} inv` : `mask ${variant}`;
    return inverted ? 'mask inv' : 'mask';
  }
  if (role === 'generation') return 'generation';
  if (role === 'version') return 'version';
  if (role === 'part') return 'part';
  if (role === 'variant') return 'variant';
  const relationType = getSlotRelationType(slot);
  if (relationType?.startsWith('mask:')) {
    return relationType.replace(':', ' ');
  }
  if (derivedFromCard) return 'derived';
  return null;
};

const compareNodes = (a: SlotTreeNode, b: SlotTreeNode): number => {
  if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
  return a.name.localeCompare(b.name);
};

const compareSlots = (a: ImageStudioSlotRecord, b: ImageStudioSlotRecord): number => {
  const left = (a.name ?? a.id).trim().toLowerCase();
  const right = (b.name ?? b.id).trim().toLowerCase();
  return left.localeCompare(right);
};

const normalizeSlotFolderPath = (value: string | null | undefined): string =>
  normalizeTreePath(value ?? '');

const ensureFolderNode = (parent: SlotTreeNode, folderPath: string): SlotTreeNode => {
  const normalizedPath = normalizeTreePath(folderPath);
  const folderName = normalizedPath.split('/').filter(Boolean).pop() ?? normalizedPath;
  const folderNodeId = toFolderMasterNodeId(normalizedPath);
  const existing = parent.children.find((child: SlotTreeNode) => child.id === folderNodeId);
  if (existing) return existing;

  const created: SlotTreeNode = {
    id: folderNodeId,
    name: folderName,
    type: 'folder',
    path: normalizedPath,
    children: [],
  };
  parent.children.push(created);
  parent.children.sort(compareNodes);
  return created;
};

const buildStudioTreeRoot = (
  slots: ImageStudioSlotRecord[],
  folders: string[]
): SlotTreeNode => {
  const root: SlotTreeNode = {
    id: '__root__',
    name: 'root',
    type: 'folder',
    path: '',
    children: [],
  };

  const slotById = new Map<string, ImageStudioSlotRecord>(
    slots.map((slot: ImageStudioSlotRecord) => [slot.id, slot])
  );
  const linkedSlotsBySource = new Map<string, ImageStudioSlotRecord[]>();
  const rootSlots: ImageStudioSlotRecord[] = [];

  slots.forEach((slot: ImageStudioSlotRecord) => {
    const sourceSlotId = getSlotSourceId(slot);
    if (sourceSlotId && sourceSlotId !== slot.id && slotById.has(sourceSlotId)) {
      const current = linkedSlotsBySource.get(sourceSlotId) ?? [];
      current.push(slot);
      linkedSlotsBySource.set(sourceSlotId, current);
      return;
    }
    rootSlots.push(slot);
  });

  linkedSlotsBySource.forEach((childSlots: ImageStudioSlotRecord[]) => {
    childSlots.sort(compareSlots);
  });
  rootSlots.sort(compareSlots);

  const buildCardChildren = (sourceSlotId: string, lineage: Set<string>): SlotTreeNode[] => {
    const childSlots = linkedSlotsBySource.get(sourceSlotId) ?? [];
    if (childSlots.length === 0) return [];

    const children: SlotTreeNode[] = [];
    childSlots.forEach((child: ImageStudioSlotRecord) => {
      if (lineage.has(child.id)) return;
      const nextLineage = new Set(lineage);
      nextLineage.add(child.id);
      children.push({
        id: toSlotMasterNodeId(child.id),
        name: child.name ?? child.id,
        type: 'card',
        path: normalizeSlotFolderPath(child.folderPath),
        slotId: child.id,
        roleLabel: getRoleLabel(child, true),
        derivedFromCard: true,
        children: buildCardChildren(child.id, nextLineage),
      });
    });
    children.sort(compareNodes);
    return children;
  };

  normalizeFolderPaths(folders).forEach((folderPath: string) => {
    const normalized = normalizeTreePath(folderPath);
    if (!normalized) return;
    const parts = normalized.split('/').filter(Boolean);
    let cursor = root;
    for (let index = 0; index < parts.length; index += 1) {
      const segmentPath = parts.slice(0, index + 1).join('/');
      cursor = ensureFolderNode(cursor, segmentPath);
    }
  });

  rootSlots.forEach((slot: ImageStudioSlotRecord) => {
    const folderPath = normalizeSlotFolderPath(slot.folderPath);
    const parts = folderPath ? folderPath.split('/').filter(Boolean) : [];

    let cursor = root;
    for (let index = 0; index < parts.length; index += 1) {
      const segmentPath = parts.slice(0, index + 1).join('/');
      cursor = ensureFolderNode(cursor, segmentPath);
    }

    cursor.children.push({
      id: toSlotMasterNodeId(slot.id),
      name: slot.name ?? slot.id,
      type: 'card',
      path: folderPath,
      slotId: slot.id,
      roleLabel: getRoleLabel(slot, false),
      derivedFromCard: false,
      children: buildCardChildren(slot.id, new Set([slot.id])),
    });
    cursor.children.sort(compareNodes);
  });

  return root;
};

export const buildMasterNodesFromStudioTree = (
  slots: ImageStudioSlotRecord[],
  folders: string[]
): MasterTreeNode[] => {
  const root = buildStudioTreeRoot(slots, folders);
  const nodes: MasterTreeNode[] = [];

  const walk = (children: SlotTreeNode[], parentId: string | null): void => {
    children.forEach((child: SlotTreeNode, index: number) => {
      const normalizedPath = normalizeTreePath(child.path || child.name || child.id);
      if (child.type === 'folder') {
        nodes.push({
          id: child.id,
          type: 'folder',
          kind: 'folder',
          parentId,
          name: child.name,
          path: normalizedPath,
          sortOrder: index,
          metadata: {
            entity: 'folder',
            folderPath: normalizedPath,
          },
        });
      } else {
        nodes.push({
          id: child.id,
          type: 'file',
          kind: 'card',
          parentId,
          name: child.name,
          path: normalizedPath,
          sortOrder: index,
          metadata: {
            entity: 'card',
            slotId: child.slotId,
            roleLabel: child.roleLabel,
            derivedFromCard: child.derivedFromCard ?? false,
          },
        });
      }

      if (child.children.length > 0) {
        walk(child.children, child.id);
      }
    });
  };

  walk(root.children, null);
  return nodes;
};

const createMasterNodeMap = (nodes: MasterTreeNode[]): Map<string, MasterTreeNode> =>
  new Map(nodes.map((node: MasterTreeNode) => [node.id, node]));

export const findMasterNodeAncestorIds = (
  nodes: MasterTreeNode[],
  nodeId: string
): string[] => {
  const byId = createMasterNodeMap(nodes);
  const ancestors: string[] = [];

  let cursor: string | null = byId.get(nodeId)?.parentId ?? null;
  while (cursor) {
    ancestors.unshift(cursor);
    cursor = byId.get(cursor)?.parentId ?? null;
  }

  return ancestors;
};

export const resolveFolderTargetPathForMasterNode = (
  nodes: MasterTreeNode[],
  nodeId: string | null
): string | null => {
  if (!nodeId) return '';

  const folderPath = fromFolderMasterNodeId(nodeId);
  if (folderPath !== null) return folderPath;

  const byId = createMasterNodeMap(nodes);
  let cursor: string | null = byId.get(nodeId)?.parentId ?? null;

  while (cursor) {
    const candidate = fromFolderMasterNodeId(cursor);
    if (candidate !== null) return candidate;
    cursor = byId.get(cursor)?.parentId ?? null;
  }

  return '';
};
