export function toggleLanguage(
  selectedIds: string[],
  id: string,
  defaultId: string,
  onDefaultIdChange: (id: string) => void
): string[] {
  const next = selectedIds.includes(id)
    ? selectedIds.filter((i) => i !== id)
    : [...selectedIds, id];
  if (!next.includes(defaultId)) {
    onDefaultIdChange(next[0] ?? '');
  }
  return next;
}

export function moveLanguage(
  selectedIds: string[],
  id: string,
  direction: 'up' | 'down'
): string[] {
  const idx = selectedIds.indexOf(id);
  if (idx === -1) return selectedIds;
  const nextIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (nextIdx < 0 || nextIdx >= selectedIds.length) return selectedIds;
  const next = [...selectedIds];
  const current = next[idx];
  const target = next[nextIdx];
  if (current === undefined || target === undefined) return selectedIds;
  next[idx] = target;
  next[nextIdx] = current;
  return next;
}

export function togglePriceGroup(
  selectedIds: string[],
  id: string,
  defaultId: string,
  onDefaultIdChange: (id: string) => void
): string[] {
  const next = selectedIds.includes(id)
    ? selectedIds.filter((i) => i !== id)
    : [...selectedIds, id];
  if (!next.includes(defaultId)) {
    onDefaultIdChange(next[0] ?? '');
  }
  return next;
}
