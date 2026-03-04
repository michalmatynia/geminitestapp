import type {
  PageZone,
  SectionInstance as PageBuilderSectionInstance,
} from '../../types/page-builder';

type SectionInstance = PageBuilderSectionInstance & {
  parentSectionId?: string | null;
};

const ZONE_ORDER: PageZone[] = ['header', 'template', 'footer'];

export type HierarchyIndexes = {
  nodeById: Map<string, SectionInstance>;
  childrenByParent: Map<string | null, string[]>;
  depthById: Map<string, number>;
};

export type MoveSectionSubtreeInput = {
  sectionId: string;
  toZone: PageZone;
  toParentSectionId?: string | null;
  toIndex: number;
  maxDepth?: number | undefined;
};

export type MoveSectionSubtreeResult = {
  ok: boolean;
  sections: SectionInstance[];
  reason?:
    | 'SECTION_NOT_FOUND'
    | 'PARENT_NOT_FOUND'
    | 'TARGET_IS_SELF'
    | 'TARGET_IN_SUBTREE'
    | 'DEPTH_LIMIT_EXCEEDED'
    | undefined;
};

const clampIndex = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const normalizeZone = (zone: unknown): PageZone => {
  if (zone === 'header' || zone === 'template' || zone === 'footer') return zone;
  return 'template';
};

const listFor = (map: Map<string | null, string[]>, key: string | null): string[] => {
  const list = map.get(key);
  if (list) return list;
  const next: string[] = [];
  map.set(key, next);
  return next;
};

const pushChild = (
  map: Map<string | null, string[]>,
  parentId: string | null,
  childId: string
): void => {
  const list = listFor(map, parentId);
  list.push(childId);
};

const createNodeMap = (sections: SectionInstance[]): Map<string, SectionInstance> => {
  const nodeById = new Map<string, SectionInstance>();
  sections.forEach((section: SectionInstance) => {
    if (nodeById.has(section.id)) return;
    nodeById.set(section.id, section);
  });
  return nodeById;
};

const buildChildrenByParentFromNodes = (
  nodes: Iterable<SectionInstance>
): Map<string | null, string[]> => {
  const childrenByParent = new Map<string | null, string[]>();
  childrenByParent.set(null, []);

  for (const section of nodes) {
    const parentId = section.parentSectionId ?? null;
    if (parentId && !childrenByParent.has(parentId)) {
      childrenByParent.set(parentId, []);
    }
    pushChild(childrenByParent, parentId, section.id);
  }

  return childrenByParent;
};

const computeDepths = (
  nodeById: Map<string, SectionInstance>,
  childrenByParent: Map<string | null, string[]>
): Map<string, number> => {
  const depthById = new Map<string, number>();

  const visit = (nodeId: string, depth: number): void => {
    depthById.set(nodeId, depth);
    const children = childrenByParent.get(nodeId) ?? [];
    children.forEach((childId: string) => {
      if (!nodeById.has(childId)) return;
      visit(childId, depth + 1);
    });
  };

  const roots = childrenByParent.get(null) ?? [];
  roots.forEach((rootId: string) => {
    if (!nodeById.has(rootId)) return;
    visit(rootId, 1);
  });

  return depthById;
};

const ensureNoCyclesAndInvalidParents = (sections: SectionInstance[]): SectionInstance[] => {
  const byId = createNodeMap(sections);

  const sanitized = sections.map((section: SectionInstance) => {
    const parentId = section.parentSectionId ?? null;
    if (!parentId || !byId.has(parentId) || parentId === section.id) {
      return { ...section, zone: normalizeZone(section.zone), parentSectionId: null };
    }

    // Check ancestry chain for cycles
    let cursor: string | null = parentId;
    const seen = new Set<string>([section.id]);
    while (cursor) {
      if (seen.has(cursor)) {
        return { ...section, zone: normalizeZone(section.zone), parentSectionId: null };
      }
      seen.add(cursor);
      const cursorNode = byId.get(cursor);
      if (!cursorNode) {
        return { ...section, zone: normalizeZone(section.zone), parentSectionId: null };
      }
      cursor = cursorNode.parentSectionId ?? null;
    }

    return {
      ...section,
      zone: normalizeZone(section.zone),
      parentSectionId: parentId,
    };
  });

  return sanitized;
};

const rebuildRootOrderByZone = (
  rootIds: string[],
  nodes: Map<string, SectionInstance>
): string[] => {
  const byZone: Record<PageZone, string[]> = { header: [], template: [], footer: [] };
  rootIds.forEach((id: string) => {
    const node = nodes.get(id);
    if (!node) return;
    byZone[node.zone].push(id);
  });
  return ZONE_ORDER.flatMap((zone: PageZone) => byZone[zone]);
};

const getSubtreeIds = (
  sectionId: string,
  childrenByParent: Map<string | null, string[]>
): Set<string> => {
  const ids = new Set<string>();
  const stack = [sectionId];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || ids.has(current)) continue;
    ids.add(current);
    const children = childrenByParent.get(current) ?? [];
    children.forEach((child: string) => stack.push(child));
  }
  return ids;
};

const getSubtreeHeight = (
  sectionId: string,
  childrenByParent: Map<string | null, string[]>
): number => {
  const children = childrenByParent.get(sectionId) ?? [];
  if (children.length === 0) return 1;
  return (
    1 + Math.max(...children.map((childId: string) => getSubtreeHeight(childId, childrenByParent)))
  );
};

const cloneBlockTree = (
  blocks: SectionInstance['blocks'],
  uidFactory: () => string
): SectionInstance['blocks'] =>
  blocks.map((block) => ({
    ...block,
    id: uidFactory(),
    settings: block.settings ? { ...block.settings } : {},
    ...(Array.isArray(block.blocks) ? { blocks: cloneBlockTree(block.blocks, uidFactory) } : {}),
  }));

const flattenWithStructure = (
  nodeById: Map<string, SectionInstance>,
  childrenByParent: Map<string | null, string[]>
): SectionInstance[] => {
  const ordered: SectionInstance[] = [];

  const visit = (nodeId: string): void => {
    const node = nodeById.get(nodeId);
    if (!node) return;
    ordered.push(node);
    const children = childrenByParent.get(nodeId) ?? [];
    children.forEach((childId: string) => visit(childId));
  };

  const roots = childrenByParent.get(null) ?? [];
  const rootsByZone: Record<PageZone, string[]> = { header: [], template: [], footer: [] };
  roots.forEach((rootId: string) => {
    const node = nodeById.get(rootId);
    if (!node) return;
    rootsByZone[node.zone].push(rootId);
  });

  ZONE_ORDER.forEach((zone: PageZone) => {
    rootsByZone[zone].forEach((rootId: string) => visit(rootId));
  });

  return ordered;
};

const reindexDepths = (
  nodeById: Map<string, SectionInstance>,
  childrenByParent: Map<string | null, string[]>
): Map<string, number> => computeDepths(nodeById, childrenByParent);

export const sanitizeSectionHierarchy = (
  sections: SectionInstance[],
  maxDepth = 5
): SectionInstance[] => {
  const sanitizedInput = ensureNoCyclesAndInvalidParents(sections);
  const nodeById = createNodeMap(sanitizedInput);

  const childrenByParent = buildChildrenByParentFromNodes(nodeById.values());

  // Enforce zone inheritance down the tree.
  const applyZoneInheritance = (nodeId: string, inheritedZone: PageZone): void => {
    const node = nodeById.get(nodeId);
    if (!node) return;
    node.zone = inheritedZone;
    const children = childrenByParent.get(nodeId) ?? [];
    children.forEach((childId: string) => applyZoneInheritance(childId, inheritedZone));
  };

  const rootIds = childrenByParent.get(null) ?? [];
  rootIds.forEach((rootId: string) => {
    const root = nodeById.get(rootId);
    if (!root) return;
    applyZoneInheritance(rootId, normalizeZone(root.zone));
  });

  // Enforce max depth by detaching overflowing nodes to root.
  let depthById = reindexDepths(nodeById, childrenByParent);
  const overflow = Array.from(depthById.entries())
    .filter(([, depth]) => depth > maxDepth)
    .sort((left, right) => right[1] - left[1]);

  overflow.forEach(([nodeId]: [string, number]) => {
    const node = nodeById.get(nodeId);
    if (!node) return;
    const oldParent = node.parentSectionId ?? null;
    if (oldParent) {
      const oldSiblings = listFor(childrenByParent, oldParent).filter(
        (id: string) => id !== nodeId
      );
      childrenByParent.set(oldParent, oldSiblings);
    }
    node.parentSectionId = null;
    pushChild(childrenByParent, null, nodeId);
    depthById = reindexDepths(nodeById, childrenByParent);
  });

  childrenByParent.set(null, rebuildRootOrderByZone(childrenByParent.get(null) ?? [], nodeById));

  return flattenWithStructure(nodeById, childrenByParent);
};

export const buildHierarchyIndexes = (sections: SectionInstance[]): HierarchyIndexes => {
  const sanitized = sanitizeSectionHierarchy(sections);
  const nodeById = createNodeMap(sanitized);
  const childrenByParent = buildChildrenByParentFromNodes(nodeById.values());
  childrenByParent.set(null, rebuildRootOrderByZone(childrenByParent.get(null) ?? [], nodeById));
  const depthById = computeDepths(nodeById, childrenByParent);
  return { nodeById, childrenByParent, depthById };
};

export const flattenByZonePreorder = (sections: SectionInstance[]): SectionInstance[] => {
  const { nodeById, childrenByParent } = buildHierarchyIndexes(sections);
  return flattenWithStructure(nodeById, childrenByParent);
};

export const isDescendant = (
  sections: SectionInstance[],
  ancestorId: string,
  candidateId: string
): boolean => {
  if (!ancestorId || !candidateId || ancestorId === candidateId) return false;
  const { childrenByParent } = buildHierarchyIndexes(sections);
  const stack = [...(childrenByParent.get(ancestorId) ?? [])];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    if (current === candidateId) return true;
    const children = childrenByParent.get(current) ?? [];
    children.forEach((childId: string) => stack.push(childId));
  }
  return false;
};

export const moveSectionSubtree = (
  sections: SectionInstance[],
  { sectionId, toZone, toParentSectionId = null, toIndex, maxDepth = 5 }: MoveSectionSubtreeInput
): MoveSectionSubtreeResult => {
  const sanitized = sanitizeSectionHierarchy(sections, maxDepth);
  const { nodeById, childrenByParent, depthById } = buildHierarchyIndexes(sanitized);
  const movingNode = nodeById.get(sectionId);
  if (!movingNode) {
    return { ok: false, reason: 'SECTION_NOT_FOUND', sections: sanitized };
  }

  if (toParentSectionId === sectionId) {
    return { ok: false, reason: 'TARGET_IS_SELF', sections: sanitized };
  }

  if (toParentSectionId && !nodeById.has(toParentSectionId)) {
    return { ok: false, reason: 'PARENT_NOT_FOUND', sections: sanitized };
  }

  if (toParentSectionId && isDescendant(sanitized, sectionId, toParentSectionId)) {
    return { ok: false, reason: 'TARGET_IN_SUBTREE', sections: sanitized };
  }

  const subtreeHeight = getSubtreeHeight(sectionId, childrenByParent);
  const targetDepth = toParentSectionId ? (depthById.get(toParentSectionId) ?? 0) + 1 : 1;
  if (targetDepth + subtreeHeight - 1 > maxDepth) {
    return { ok: false, reason: 'DEPTH_LIMIT_EXCEEDED', sections: sanitized };
  }

  // Remove from old siblings.
  const previousParentId = movingNode.parentSectionId ?? null;
  const previousSiblings = (childrenByParent.get(previousParentId) ?? []).filter(
    (id: string) => id !== sectionId
  );
  childrenByParent.set(previousParentId, previousSiblings);

  // Insert into target siblings.
  if (toParentSectionId) {
    const targetSiblings = [...(childrenByParent.get(toParentSectionId) ?? [])].filter(
      (id: string) => id !== sectionId
    );
    const insertAt = clampIndex(toIndex, 0, targetSiblings.length);
    targetSiblings.splice(insertAt, 0, sectionId);
    childrenByParent.set(toParentSectionId, targetSiblings);
  } else {
    const roots = [...(childrenByParent.get(null) ?? [])].filter((id: string) => id !== sectionId);
    const zoneRoots = roots.filter((id: string) => {
      const node = nodeById.get(id);
      return node?.zone === toZone;
    });
    const otherRootsByZone: Record<PageZone, string[]> = { header: [], template: [], footer: [] };
    roots.forEach((id: string) => {
      const node = nodeById.get(id);
      if (!node || node.zone === toZone) return;
      otherRootsByZone[node.zone].push(id);
    });
    const insertAt = clampIndex(toIndex, 0, zoneRoots.length);
    zoneRoots.splice(insertAt, 0, sectionId);
    const rebuiltRoots: string[] = [];
    ZONE_ORDER.forEach((zone: PageZone) => {
      if (zone === toZone) {
        rebuiltRoots.push(...zoneRoots);
      } else {
        rebuiltRoots.push(...otherRootsByZone[zone]);
      }
    });
    childrenByParent.set(null, rebuiltRoots);
  }

  const resolvedZone = toParentSectionId
    ? normalizeZone(nodeById.get(toParentSectionId)?.zone)
    : toZone;

  movingNode.parentSectionId = toParentSectionId ?? null;

  // Update moved subtree zone to satisfy inheritance constraints.
  const subtreeIds = getSubtreeIds(sectionId, childrenByParent);
  subtreeIds.forEach((id: string) => {
    const node = nodeById.get(id);
    if (!node) return;
    node.zone = resolvedZone;
  });

  const flattened = flattenWithStructure(nodeById, childrenByParent);
  return { ok: true, sections: flattened };
};

export const removeSectionSubtree = (
  sections: SectionInstance[],
  sectionId: string
): SectionInstance[] => {
  const { nodeById, childrenByParent } = buildHierarchyIndexes(sections);
  if (!nodeById.has(sectionId)) return sections;
  const subtreeIds = getSubtreeIds(sectionId, childrenByParent);
  const nextSections = sections.filter((section: SectionInstance) => !subtreeIds.has(section.id));
  return sanitizeSectionHierarchy(nextSections);
};

export const cloneSectionSubtree = (
  sections: SectionInstance[],
  sectionId: string,
  uidFactory: () => string
): SectionInstance[] => {
  const sanitized = sanitizeSectionHierarchy(sections);
  const { nodeById, childrenByParent } = buildHierarchyIndexes(sanitized);
  if (!nodeById.has(sectionId)) return [];

  const clones: SectionInstance[] = [];
  const idMap = new Map<string, string>();

  const visit = (nodeId: string, parentCloneId: string | null): void => {
    const node = nodeById.get(nodeId);
    if (!node) return;
    const clonedId = uidFactory();
    idMap.set(nodeId, clonedId);
    const clone: SectionInstance = {
      ...node,
      id: clonedId,
      parentSectionId: parentCloneId,
      blocks: cloneBlockTree(node.blocks ?? [], uidFactory),
      settings: node.settings ? { ...node.settings } : {},
    };
    clones.push(clone);
    const children = childrenByParent.get(nodeId) ?? [];
    children.forEach((childId: string) => visit(childId, clonedId));
  };

  visit(sectionId, null);
  return clones;
};
