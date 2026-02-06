const PARENT_TOKEN = /\bparent\b/g;
const CHILDREN_TOKEN = /\bchildren\b/g;

export function getCustomCssSelector(nodeId: string): string {
  return `.cms-node-${nodeId}`;
}

export function buildScopedCustomCss(
  raw: unknown,
  selector: string | null
): string | null {
  if (!selector) return null;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const childrenSelector = `${selector} > *`;
  return trimmed
    .replace(PARENT_TOKEN, selector)
    .replace(CHILDREN_TOKEN, childrenSelector);
}
