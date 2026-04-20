export function jsonValueToRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function reminderList(label: string, items: string[]): string | null {
  if (items.length === 0) return null;
  return `${label}: ${items.join(' | ')}`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

const collect = (values: unknown): string[] =>
  Array.isArray(values)
    ? values
        .filter((item: unknown): item is string => typeof item === 'string')
        .map((item: string) => item.trim())
        .filter((s: string) => s.length > 0)
    : [];

function processMetaEntries(
  meta: Record<string, unknown>,
  collections: {
    mistakes: Set<string>;
    improvements: Set<string>;
    guardrails: Set<string>;
    toolAdjustments: Set<string>;
  }
): void {
  collect(meta['mistakes']).forEach((e) => collections.mistakes.add(e));
  collect(meta['improvements']).forEach((e) => collections.improvements.add(e));
  collect(meta['guardrails']).forEach((e) => collections.guardrails.add(e));
  collect(meta['toolAdjustments']).forEach((e) => collections.toolAdjustments.add(e));
}

function buildPlaybookLines(
  summaries: string[],
  collections: {
    mistakes: Set<string>;
    improvements: Set<string>;
    guardrails: Set<string>;
    toolAdjustments: Set<string>;
  }
): string[] {
  return [
    summaries.length > 0 ? `Recent learning: ${summaries.slice(0, 2).join(' | ')}` : null,
    collections.mistakes.size > 0 ? `Avoid: ${Array.from(collections.mistakes).slice(0, 4).join(' | ')}` : null,
    collections.improvements.size > 0 ? `Improve: ${Array.from(collections.improvements).slice(0, 4).join(' | ')}` : null,
    collections.guardrails.size > 0 ? `Guardrails: ${Array.from(collections.guardrails).slice(0, 4).join(' | ')}` : null,
    collections.toolAdjustments.size > 0 ? `Tool tweaks: ${Array.from(collections.toolAdjustments).slice(0, 3).join(' | ')}` : null,
  ].filter((l): l is string => l !== null && l.length > 0);
}

export function buildSelfImprovementPlaybook(
  items: Array<{
    summary?: string | null;
    content?: string;
    metadata?: Record<string, unknown> | null;
  }>
): string | null {
  if (items.length === 0) return null;

  const collections = {
    mistakes: new Set<string>(),
    improvements: new Set<string>(),
    guardrails: new Set<string>(),
    toolAdjustments: new Set<string>(),
  };
  const summaries: string[] = [];

  for (const item of items) {
    if (item.summary !== null && item.summary !== undefined && item.summary.trim().length > 0) {
      summaries.push(item.summary.trim());
    }
    const meta = (item.metadata ?? {});
    processMetaEntries(meta, collections);
  }

  const lines = buildPlaybookLines(summaries, collections);
  return lines.length === 0 ? null : `Self-improvement playbook:\n${lines.join('\n')}`;
}
