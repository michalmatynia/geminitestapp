import type { IdLabelOption } from '@/shared/contracts/base';
import type { AiNode, AiPathRunNodeRecord } from '@/shared/contracts/ai-paths';
import type { RuntimeHistoryEntry } from '@/shared/contracts/ai-paths-runtime';

export type HistoryNodeOption = IdLabelOption;

export const buildHistoryNodeOptions = (
  history?: Record<string, RuntimeHistoryEntry[]>,
  runNodes?: AiPathRunNodeRecord[] | null,
  graphNodes?: AiNode[] | null
): HistoryNodeOption[] => {
  const options: HistoryNodeOption[] = [];
  const seen = new Set<string>();
  const add = (id?: string | null, title?: string | null, type?: string | null): void => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    const base = title?.trim() ? title.trim() : id;
    const label = type ? `${base} (${type})` : base;
    options.push({ id, label });
  };
  if (Array.isArray(graphNodes)) {
    graphNodes.forEach((node: AiNode) => add(node.id, node.title ?? null, node.type ?? null));
  }
  if (Array.isArray(runNodes)) {
    runNodes.forEach((node: AiPathRunNodeRecord) =>
      add(node.nodeId, node.nodeTitle ?? null, node.nodeType ?? null)
    );
  }
  if (history) {
    Object.keys(history).forEach((id: string) => add(id, id, null));
  }
  return options;
};
