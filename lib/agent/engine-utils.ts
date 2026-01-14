export function jsonValueToRecord(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value !== "object") return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function reminderList(label: string, items: string[]) {
  if (!items.length) return null;
  return `${label}: ${items.join(" | ")}`;
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function buildSelfImprovementPlaybook(
  items: Array<{
    summary?: string | null;
    content?: string;
    metadata?: Record<string, unknown> | null;
  }>
) {
  if (!items.length) return null;
  const collect = (values: unknown) =>
    Array.isArray(values)
      ? values
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean)
      : [];
  const mistakes = new Set<string>();
  const improvements = new Set<string>();
  const guardrails = new Set<string>();
  const toolAdjustments = new Set<string>();
  const summaries: string[] = [];
  for (const item of items) {
    if (item.summary) summaries.push(item.summary.trim());
    const meta = item.metadata ?? {};
    collect((meta as { mistakes?: unknown }).mistakes).forEach((entry) =>
      mistakes.add(entry)
    );
    collect((meta as { improvements?: unknown }).improvements).forEach(
      (entry) => improvements.add(entry)
    );
    collect((meta as { guardrails?: unknown }).guardrails).forEach((entry) =>
      guardrails.add(entry)
    );
    collect((meta as { toolAdjustments?: unknown }).toolAdjustments).forEach(
      (entry) => toolAdjustments.add(entry)
    );
  }
  const lines = [
    summaries.length
      ? `Recent learning: ${summaries.slice(0, 2).join(" | ")}`
      : null,
    mistakes.size
      ? `Avoid: ${Array.from(mistakes).slice(0, 4).join(" | ")}`
      : null,
    improvements.size
      ? `Improve: ${Array.from(improvements).slice(0, 4).join(" | ")}`
      : null,
    guardrails.size
      ? `Guardrails: ${Array.from(guardrails).slice(0, 4).join(" | ")}`
      : null,
    toolAdjustments.size
      ? `Tool tweaks: ${Array.from(toolAdjustments).slice(0, 3).join(" | ")}`
      : null,
  ].filter(Boolean) as string[];
  if (lines.length === 0) return null;
  return `Self-improvement playbook:\n${lines.join("\n")}`;
}
