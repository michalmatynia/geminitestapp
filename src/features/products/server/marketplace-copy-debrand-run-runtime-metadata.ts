type RuntimeNodeMetadata = { nodeTitle: string | null; nodeType: string | null };

const asTrimmedString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const readLatestRuntimeHistoryEntry = (value: unknown): Record<string, unknown> | null => {
  const entries = Array.isArray(value) ? value.map(asRecord) : [];
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    if (entry !== null && entry !== undefined) return entry;
  }
  return null;
};

export const buildRuntimeNodeMetadataById = (
  runtimeState: unknown
): Map<string, RuntimeNodeMetadata> => {
  const metadataById = new Map<string, RuntimeNodeMetadata>();
  const historyByNodeId = asRecord(asRecord(runtimeState)?.['history']);
  if (historyByNodeId === null) return metadataById;

  Object.entries(historyByNodeId).forEach(([nodeId, historyEntries]: [string, unknown]): void => {
    const entry = readLatestRuntimeHistoryEntry(historyEntries);
    const normalizedNodeId = asTrimmedString(entry?.['nodeId']) ?? asTrimmedString(nodeId);
    if (normalizedNodeId === null) return;
    metadataById.set(normalizedNodeId, {
      nodeTitle: asTrimmedString(entry?.['nodeTitle']),
      nodeType: asTrimmedString(entry?.['nodeType']),
    });
  });

  return metadataById;
};
