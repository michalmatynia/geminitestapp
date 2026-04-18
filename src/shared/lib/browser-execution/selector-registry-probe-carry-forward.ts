export type SelectorRegistryProbeCarryForwardItem = {
  itemId: string;
  role: string;
  defaultKey?: string;
};

export type SelectorRegistryProbeCarryForwardSource = {
  itemId: string;
  selectedKey: string;
};

export const buildSelectorRegistryProbeEntriesByRole = <T extends { role: string }>(
  entries: T[]
): Map<string, T[]> => {
  const next = new Map<string, T[]>();

  for (const entry of entries) {
    const current = next.get(entry.role);
    if (current) {
      current.push(entry);
      continue;
    }
    next.set(entry.role, [entry]);
  }

  return next;
};

export const buildSelectorRegistryProbeCarryForwardDefaultKeysByRole = <
  T extends { role: string; key: string }
>(
  entries: T[]
): Map<string, string> => {
  const next = new Map<string, string>();

  for (const [role, roleEntries] of buildSelectorRegistryProbeEntriesByRole(entries)) {
    const firstKey = roleEntries[0]?.key;
    if (firstKey) {
      next.set(role, firstKey);
    }
  }

  return next;
};

export const buildSelectorRegistryProbeCarryForwardItems = <T>({
  items,
  getItemId,
  getRole,
  defaultKeysByRole,
}: {
  items: T[];
  getItemId: (item: T) => string;
  getRole: (item: T) => string;
  defaultKeysByRole?: Map<string, string>;
}): SelectorRegistryProbeCarryForwardItem[] =>
  items.map((item) => {
    const role = getRole(item);
    return {
      itemId: getItemId(item),
      role,
      defaultKey: defaultKeysByRole?.get(role) ?? '',
    };
  });

type CarryForwardState = {
  items: SelectorRegistryProbeCarryForwardItem[];
  selectedKeys: Record<string, string>;
  manuallySelectedKeys: Record<string, boolean>;
};

export const buildSelectorRegistryProbeCarryForwardSources = ({
  items,
  selectedKeys,
  manuallySelectedKeys,
}: CarryForwardState): Map<string, SelectorRegistryProbeCarryForwardSource> => {
  const next = new Map<string, SelectorRegistryProbeCarryForwardSource>();

  for (const item of items) {
    const selectedKey = selectedKeys[item.itemId]?.trim() ?? '';
    if (
      manuallySelectedKeys[item.itemId] === true &&
      selectedKey.length > 0 &&
      !next.has(item.role)
    ) {
      next.set(item.role, {
        itemId: item.itemId,
        selectedKey,
      });
    }
  }

  return next;
};

export const applySelectorRegistryProbeCarryForwardDefaults = ({
  items,
  selectedKeys,
  manuallySelectedKeys,
}: CarryForwardState): Record<string, string> => {
  const next: Record<string, string> = {};
  const carryForwardSourcesByRole = buildSelectorRegistryProbeCarryForwardSources({
    items,
    selectedKeys,
    manuallySelectedKeys,
  });

  for (const item of items) {
    const existingKey = selectedKeys[item.itemId]?.trim() ?? '';
    const defaultKey = item.defaultKey?.trim() ?? '';
    const carryForwardKey = carryForwardSourcesByRole.get(item.role)?.selectedKey ?? '';

    if (manuallySelectedKeys[item.itemId] === true) {
      next[item.itemId] = existingKey || defaultKey || '';
      continue;
    }

    next[item.itemId] = carryForwardKey || existingKey || defaultKey || '';
  }

  return next;
};

export const applySelectorRegistryProbeCarryForwardManualSelection = ({
  items,
  selectedKeys,
  manuallySelectedKeys,
  itemId,
  selectedKey,
}: CarryForwardState & {
  itemId: string;
  selectedKey: string;
}): {
  selectedKeys: Record<string, string>;
  manuallySelectedKeys: Record<string, boolean>;
} => {
  const nextManuallySelectedKeys = {
    ...manuallySelectedKeys,
    [itemId]: true,
  };

  const nextSelectedKeys = applySelectorRegistryProbeCarryForwardDefaults({
    items,
    selectedKeys: {
      ...selectedKeys,
      [itemId]: selectedKey,
    },
    manuallySelectedKeys: nextManuallySelectedKeys,
  });

  return {
    selectedKeys: nextSelectedKeys,
    manuallySelectedKeys: nextManuallySelectedKeys,
  };
};

export const buildSelectorRegistryProbeCarryForwardSummaries = ({
  items,
  selectedKeys,
}: Pick<CarryForwardState, 'items' | 'selectedKeys'>): Array<{
  role: string;
  selectedKey: string;
}> => {
  const byRole = new Map<string, { count: number; selectedKey: string }>();

  for (const item of items) {
    const selectedKey = selectedKeys[item.itemId]?.trim() ?? '';
    const current = byRole.get(item.role);
    if (!current) {
      byRole.set(item.role, { count: 1, selectedKey });
      continue;
    }
    byRole.set(item.role, {
      count: current.count + 1,
      selectedKey: current.selectedKey === selectedKey ? current.selectedKey : '',
    });
  }

  return Array.from(byRole.entries())
    .filter(([, summary]) => summary.count > 1 && summary.selectedKey.length > 0)
    .map(([role, summary]) => ({
      role,
      selectedKey: summary.selectedKey,
    }));
};

export const isSelectorRegistryProbeCarryForwardInherited = ({
  itemId,
  role,
  selectedKey,
  manuallySelectedKeys,
  carryForwardSourcesByRole,
}: {
  itemId: string;
  role: string;
  selectedKey: string;
  manuallySelectedKeys: Record<string, boolean>;
  carryForwardSourcesByRole: Map<string, SelectorRegistryProbeCarryForwardSource>;
}): boolean => {
  const trimmedSelectedKey = selectedKey.trim();
  const carryForwardSource = carryForwardSourcesByRole.get(role);
  return (
    manuallySelectedKeys[itemId] !== true &&
    trimmedSelectedKey.length > 0 &&
    carryForwardSource !== undefined &&
    carryForwardSource.itemId !== itemId &&
    carryForwardSource.selectedKey === trimmedSelectedKey
  );
};

export const buildSelectorRegistryProbeCarryForwardInheritedCounts = ({
  items,
  selectedKeys,
  manuallySelectedKeys,
  carryForwardSourcesByRole,
}: CarryForwardState & {
  carryForwardSourcesByRole: Map<string, SelectorRegistryProbeCarryForwardSource>;
}): Record<string, number> => {
  const counts: Record<string, number> = {};

  for (const item of items) {
    const selectedKey = selectedKeys[item.itemId]?.trim() ?? '';
    if (
      !isSelectorRegistryProbeCarryForwardInherited({
        itemId: item.itemId,
        role: item.role,
        selectedKey,
        manuallySelectedKeys,
        carryForwardSourcesByRole,
      })
    ) {
      continue;
    }

    const carryForwardSource = carryForwardSourcesByRole.get(item.role);
    if (!carryForwardSource) {
      continue;
    }

    counts[carryForwardSource.itemId] = (counts[carryForwardSource.itemId] ?? 0) + 1;
  }

  return counts;
};
