const isEscaped = (value: string, index: number): boolean => {
  let slashCount = 0;
  let cursor = index - 1;
  while (cursor >= 0 && value[cursor] === '\\') {
    slashCount += 1;
    cursor -= 1;
  }
  return slashCount % 2 === 1;
};

const splitTopLevelAlternation = (pattern: string): string[] => {
  const input = pattern.trim();
  if (!input) return [];

  const parts: string[] = [];
  let depth = 0;
  let inCharClass = false;
  let start = 0;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (!char) continue;

    if (char === '[' && !inCharClass && !isEscaped(input, index)) {
      inCharClass = true;
      continue;
    }
    if (char === ']' && inCharClass && !isEscaped(input, index)) {
      inCharClass = false;
      continue;
    }
    if (inCharClass) continue;

    if (char === '(' && !isEscaped(input, index)) {
      depth += 1;
      continue;
    }
    if (char === ')' && !isEscaped(input, index)) {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (char === '|' && depth === 0 && !isEscaped(input, index)) {
      parts.push(input.slice(start, index));
      start = index + 1;
    }
  }

  parts.push(input.slice(start));
  return parts.map((part) => part.trim()).filter(Boolean);
};

const wrapsWholeNonCapturingGroup = (pattern: string): boolean => {
  const input = pattern.trim();
  if (!input.startsWith('(?:') || !input.endsWith(')')) return false;

  let depth = 0;
  let inCharClass = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (!char) continue;

    if (char === '[' && !inCharClass && !isEscaped(input, index)) {
      inCharClass = true;
      continue;
    }
    if (char === ']' && inCharClass && !isEscaped(input, index)) {
      inCharClass = false;
      continue;
    }
    if (inCharClass) continue;

    if (char === '(' && !isEscaped(input, index)) {
      depth += 1;
      continue;
    }
    if (char === ')' && !isEscaped(input, index)) {
      depth = Math.max(0, depth - 1);
      if (depth === 0 && index !== input.length - 1) {
        return false;
      }
    }
  }

  return depth === 0;
};

const stripOuterNonCapturingGroup = (pattern: string): string => {
  let output = pattern.trim();
  while (wrapsWholeNonCapturingGroup(output)) {
    output = output.slice(3, -1).trim();
  }
  return output;
};

const extractVariants = (pattern: string): string[] => {
  const input = pattern.trim();
  if (!input) return [];
  const topLevelParts = splitTopLevelAlternation(input);
  return topLevelParts.map((part) => stripOuterNonCapturingGroup(part)).filter(Boolean);
};

const safeRegexCompiles = (pattern: string, flags = 'mi'): boolean => {
  try {
    void new RegExp(pattern, flags);
    return true;
  } catch {
    return false;
  }
};

export const mergeRegexPatternsForRule = (
  existingPattern: string,
  incomingPattern: string
): string => {
  const existing = existingPattern.trim();
  const incoming = incomingPattern.trim();
  if (!existing) return incoming;
  if (!incoming) return existing;

  const variants: string[] = [];
  const known = new Set<string>();
  [...extractVariants(existing), ...extractVariants(incoming)].forEach((variant) => {
    const normalized = variant.trim();
    if (!normalized || known.has(normalized)) return;
    known.add(normalized);
    variants.push(normalized);
  });

  if (variants.length === 0) {
    return incoming;
  }
  if (variants.length === 1) {
    return variants[0] ?? incoming;
  }

  const merged = variants.map((variant) => `(?:${variant})`).join('|');
  if (merged.length > 4000) {
    return incoming;
  }
  if (!safeRegexCompiles(merged, 'mi')) {
    return incoming;
  }
  return merged;
};
