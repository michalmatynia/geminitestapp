export const buildPathLabelMap = <
  T extends { id: string; name: string; parentId: string | null },
>(
    items: T[]
  ): Map<string, string> => {
  const byId = new Map<string, T>(items.map((item: T): [string, T] => [item.id, item]));
  const cache = new Map<string, string>();

  const resolveLabel = (id: string, visited: Set<string>): string => {
    const cached = cache.get(id);
    if (cached) return cached;
    const item = byId.get(id);
    if (!item) return '';
    if (visited.has(id)) {
      cache.set(id, item.name);
      return item.name;
    }
    if (!item.parentId || !byId.has(item.parentId)) {
      cache.set(id, item.name);
      return item.name;
    }
    const nextVisited = new Set(visited);
    nextVisited.add(id);
    const parentLabel = resolveLabel(item.parentId, nextVisited);
    const label = `${parentLabel} / ${item.name}`;
    cache.set(id, label);
    return label;
  };

  items.forEach((item: T): void => {
    resolveLabel(item.id, new Set<string>());
  });

  return cache;
};
