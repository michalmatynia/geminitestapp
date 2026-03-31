import type { CaseResolverTag } from '@/shared/contracts/case-resolver';

export type TagPathOption = {
  id: string;
  label: string;
  pathIds: string[];
};

export const buildTagPathOptions = (tags: CaseResolverTag[]): TagPathOption[] => {
  const byId = new Map<string, CaseResolverTag>(
    tags.map((tag: CaseResolverTag): [string, CaseResolverTag] => [tag.id, tag])
  );
  const cache = new Map<string, { ids: string[]; names: string[] }>();

  const resolvePath = (tagId: string, trail: Set<string>): { ids: string[]; names: string[] } => {
    const cached = cache.get(tagId);
    if (cached) return cached;
    const tag = byId.get(tagId);
    if (!tag) return { ids: [], names: [] };
    if (trail.has(tagId)) {
      const fallback = { ids: [tag.id], names: [tag.label] };
      cache.set(tagId, fallback);
      return fallback;
    }

    if (!tag.parentId || !byId.has(tag.parentId)) {
      const rootPath = { ids: [tag.id], names: [tag.label] };
      cache.set(tagId, rootPath);
      return rootPath;
    }

    const nextTrail = new Set(trail);
    nextTrail.add(tagId);
    const parentPath = resolvePath(tag.parentId, nextTrail);
    const fullPath = {
      ids: [...parentPath.ids, tag.id],
      names: [...parentPath.names, tag.label],
    };
    cache.set(tagId, fullPath);
    return fullPath;
  };

  return tags
    .map((tag: CaseResolverTag): TagPathOption => {
      const path = resolvePath(tag.id, new Set<string>());
      return {
        id: tag.id,
        label: path.names.join(' / '),
        pathIds: path.ids,
      };
    })
    .sort((left: TagPathOption, right: TagPathOption) => left.label.localeCompare(right.label));
};

export const collectDescendantTagIds = (tags: CaseResolverTag[], rootTagId: string): Set<string> => {
  const descendants = new Set<string>([rootTagId]);
  let expanded = true;

  while (expanded) {
    expanded = false;
    tags.forEach((tag: CaseResolverTag): void => {
      if (!tag.parentId || descendants.has(tag.id)) return;
      if (!descendants.has(tag.parentId)) return;
      descendants.add(tag.id);
      expanded = true;
    });
  }

  return descendants;
};
