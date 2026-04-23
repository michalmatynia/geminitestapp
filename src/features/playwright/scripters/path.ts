const PATH_TOKEN_RE = /[^.[\]]+|\[(\*|\d+)\]/g;

type Token = { kind: 'key'; value: string } | { kind: 'index'; value: number } | { kind: 'wildcard' };

const tokenize = (path: string): Token[] => {
  const tokens: Token[] = [];
  const normalized = path.startsWith('$') ? path.slice(1) : path;
  const matches = normalized.match(PATH_TOKEN_RE);
  if (!matches) return tokens;
  for (const match of matches) {
    if (match === '[*]') {
      tokens.push({ kind: 'wildcard' });
      continue;
    }
    const bracket = /^\[(\d+)\]$/.exec(match);
    if (bracket) {
      tokens.push({ kind: 'index', value: Number(bracket[1]) });
      continue;
    }
    tokens.push({ kind: 'key', value: match });
  }
  return tokens;
};

const stepInto = (node: unknown, token: Token): unknown => {
  if (node === null || node === undefined) return undefined;
  if (token.kind === 'key') {
    if (typeof node !== 'object' || Array.isArray(node)) return undefined;
    return (node as Record<string, unknown>)[token.value];
  }
  if (!Array.isArray(node)) return undefined;
  if (token.kind === 'index') return node[token.value];
  return node;
};

export const evaluatePath = (root: unknown, path: string): unknown => {
  const tokens = tokenize(path);
  if (tokens.length === 0) return undefined;

  let current: unknown[] = [root];
  let expanded = false;

  for (const token of tokens) {
    const next: unknown[] = [];
    if (token.kind === 'wildcard') {
      expanded = true;
      for (const node of current) {
        if (Array.isArray(node)) {
          for (const item of node) next.push(item);
        }
      }
    } else {
      for (const node of current) {
        next.push(stepInto(node, token));
      }
    }
    current = next;
  }

  const results = current.filter((value) => value !== undefined);
  if (expanded) return results;
  return results.length > 0 ? results[0] : undefined;
};

export const evaluatePaths = (root: unknown, paths: string[]): unknown => {
  for (const path of paths) {
    const value = evaluatePath(root, path);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
};
