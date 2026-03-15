import { logClientError } from '@/shared/utils/observability/client-error-logger';
/**
 * Utility functions for AI generation in the CMS inspector.
 */

export function extractCssFromResponse(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const fenceMatch = trimmed.match(/```(?:css)?\s*([\s\S]*?)```/i);
  if (fenceMatch?.[1]) {
    return fenceMatch[1].trim();
  }
  return trimmed.replace(/```/g, '').trim();
}

export function extractJsonFromResponse(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenceMatch?.[1]?.trim() ?? trimmed;
  const first = candidate.indexOf('{');
  const last = candidate.lastIndexOf('}');
  const jsonText = first >= 0 && last > first ? candidate.slice(first, last + 1) : candidate;
  try {
    const parsed = JSON.parse(jsonText) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as Record<string, unknown>;
  } catch (error) {
    logClientError(error);
    return null;
  }
}

export function buildDiffLines(
  prev: string,
  next: string,
  limit: number = 220
): { lines: Array<{ type: 'add' | 'remove' | 'same'; text: string }>; truncated: boolean } {
  const prevLines = prev.split('\n');
  const nextLines = next.split('\n');
  const max = Math.max(prevLines.length, nextLines.length);
  const lines: Array<{ type: 'add' | 'remove' | 'same'; text: string }> = [];
  let truncated = false;
  for (let index = 0; index < max; index += 1) {
    const prevLine = prevLines[index];
    const nextLine = nextLines[index];
    if (prevLine === nextLine) {
      if (prevLine !== undefined) {
        lines.push({ type: 'same', text: prevLine });
      }
    } else {
      if (prevLine !== undefined) {
        lines.push({ type: 'remove', text: prevLine });
      }
      if (nextLine !== undefined) {
        lines.push({ type: 'add', text: nextLine });
      }
    }
    if (lines.length >= limit) {
      truncated = true;
      break;
    }
  }
  return { lines, truncated };
}
