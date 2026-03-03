export type ScanState = {
  inSingle: boolean;
  inDouble: boolean;
  inTemplate: boolean;
  inLineComment: boolean;
  inBlockComment: boolean;
  escaped: boolean;
};

export type SegmentKind = 'code' | 'comment' | 'single_string' | 'double_string' | 'template_string';

export type Segment = { kind: SegmentKind; text: string };

export const createScanState = (): ScanState => ({
  inSingle: false,
  inDouble: false,
  inTemplate: false,
  inLineComment: false,
  inBlockComment: false,
  escaped: false,
});

export const isInString = (state: ScanState): boolean =>
  state.inSingle || state.inDouble || state.inTemplate;

export function segmentizeJsLikeText(input: string): Segment[] {
  const state = createScanState();
  const segments: Segment[] = [];
  let kind: SegmentKind = 'code';
  let buf = '';

  const flush = (): void => {
    if (!buf) return;
    segments.push({ kind, text: buf });
    buf = '';
  };

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index] ?? '';
    const next = input[index + 1] ?? '';

    if (kind === 'comment') {
      buf += char;
      if (state.inLineComment) {
        if (char === '\n') {
          state.inLineComment = false;
          flush();
          kind = 'code';
        }
      } else if (state.inBlockComment) {
        if (char === '*' && next === '/') {
          buf += next;
          index += 1;
          state.inBlockComment = false;
          flush();
          kind = 'code';
        }
      }
      continue;
    }

    if (kind === 'single_string') {
      buf += char;
      if (!state.escaped && char === '\'') {
        state.inSingle = false;
        flush();
        kind = 'code';
      }
      state.escaped = !state.escaped && char === '\\';
      continue;
    }

    if (kind === 'double_string') {
      buf += char;
      if (!state.escaped && char === '"') {
        state.inDouble = false;
        flush();
        kind = 'code';
      }
      state.escaped = !state.escaped && char === '\\';
      continue;
    }

    if (kind === 'template_string') {
      buf += char;
      if (!state.escaped && char === '`') {
        state.inTemplate = false;
        flush();
        kind = 'code';
      }
      state.escaped = !state.escaped && char === '\\';
      continue;
    }

    // code
    if (char === '/' && next === '/') {
      flush();
      kind = 'comment';
      state.inLineComment = true;
      buf = '//';
      index += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      flush();
      kind = 'comment';
      state.inBlockComment = true;
      buf = '/*';
      index += 1;
      continue;
    }
    if (char === '\'') {
      flush();
      kind = 'single_string';
      state.inSingle = true;
      state.escaped = false;
      buf = '\'';
      continue;
    }
    if (char === '"') {
      flush();
      kind = 'double_string';
      state.inDouble = true;
      state.escaped = false;
      buf = '"';
      continue;
    }
    if (char === '`') {
      flush();
      kind = 'template_string';
      state.inTemplate = true;
      state.escaped = false;
      buf = '`';
      continue;
    }

    buf += char;
  }

  flush();
  return segments;
}

export function findMatchingBrace(input: string, startIndex: number): number {
  if (input[startIndex] !== '{') return -1;

  let depth = 0;
  const state = createScanState();

  for (let index = startIndex; index < input.length; index += 1) {
    const char = input[index] ?? '';
    const next = input[index + 1] ?? '';

    if (state.inLineComment) {
      if (char === '\n') state.inLineComment = false;
      continue;
    }
    if (state.inBlockComment) {
      if (char === '*' && next === '/') {
        state.inBlockComment = false;
        index += 1;
      }
      continue;
    }

    if (state.inSingle) {
      if (!state.escaped && char === '\'') state.inSingle = false;
      state.escaped = !state.escaped && char === '\\';
      continue;
    }
    if (state.inDouble) {
      if (!state.escaped && char === '"') state.inDouble = false;
      state.escaped = !state.escaped && char === '\\';
      continue;
    }
    if (state.inTemplate) {
      if (!state.escaped && char === '`') state.inTemplate = false;
      state.escaped = !state.escaped && char === '\\';
      continue;
    }

    if (char === '/' && next === '/') {
      state.inLineComment = true;
      index += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      state.inBlockComment = true;
      index += 1;
      continue;
    }

    if (char === '\'') {
      state.inSingle = true;
      state.escaped = false;
      continue;
    }
    if (char === '"') {
      state.inDouble = true;
      state.escaped = false;
      continue;
    }
    if (char === '`') {
      state.inTemplate = true;
      state.escaped = false;
      continue;
    }

    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;

    if (depth === 0) return index;
  }

  return -1;
}

export function stripJsComments(input: string): string {
  const state = createScanState();
  const out: string[] = [];

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index] ?? '';
    const next = input[index + 1] ?? '';

    if (state.inLineComment) {
      if (char === '\n') {
        state.inLineComment = false;
        out.push(char);
      }
      continue;
    }

    if (state.inBlockComment) {
      if (char === '*' && next === '/') {
        state.inBlockComment = false;
        index += 1;
      }
      continue;
    }

    if (state.inSingle) {
      out.push(char);
      if (!state.escaped && char === '\'') state.inSingle = false;
      state.escaped = !state.escaped && char === '\\';
      continue;
    }
    if (state.inDouble) {
      out.push(char);
      if (!state.escaped && char === '"') state.inDouble = false;
      state.escaped = !state.escaped && char === '\\';
      continue;
    }
    if (state.inTemplate) {
      out.push(char);
      if (!state.escaped && char === '`') state.inTemplate = false;
      state.escaped = !state.escaped && char === '\\';
      continue;
    }

    if (char === '/' && next === '/') {
      state.inLineComment = true;
      index += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      state.inBlockComment = true;
      index += 1;
      continue;
    }

    out.push(char);
    if (char === '\'') state.inSingle = true;
    if (char === '"') state.inDouble = true;
    if (char === '`') state.inTemplate = true;
  }

  return out.join('');
}

export function removeTrailingCommas(input: string): string {
  const state = createScanState();
  const out: string[] = [];

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index] ?? '';

    if (isInString(state)) {
      out.push(char);
      if (state.inSingle) {
        if (!state.escaped && char === '\'') state.inSingle = false;
        state.escaped = !state.escaped && char === '\\';
        continue;
      }
      if (state.inDouble) {
        if (!state.escaped && char === '"') state.inDouble = false;
        state.escaped = !state.escaped && char === '\\';
        continue;
      }
      if (state.inTemplate) {
        if (!state.escaped && char === '`') state.inTemplate = false;
        state.escaped = !state.escaped && char === '\\';
        continue;
      }
      continue;
    }

    if (char === '\'') {
      state.inSingle = true;
      out.push(char);
      continue;
    }
    if (char === '"') {
      state.inDouble = true;
      out.push(char);
      continue;
    }
    if (char === '`') {
      state.inTemplate = true;
      out.push(char);
      continue;
    }

    if (char === ',') {
      let lookahead = index + 1;
      while (lookahead < input.length) {
        const ahead = input[lookahead] ?? '';
        if (!/\s/.test(ahead)) break;
        lookahead += 1;
      }
      const ahead = input[lookahead] ?? '';
      if (ahead === '}' || ahead === ']') {
        continue; // skip trailing comma
      }
    }

    out.push(char);
  }

  return out.join('');
}

export function splitLineCodeAndLineComment(line: string): { code: string; comment: string | null } {
  const state = createScanState();

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index] ?? '';
    const next = line[index + 1] ?? '';

    if (state.inSingle) {
      if (!state.escaped && char === '\'') state.inSingle = false;
      state.escaped = !state.escaped && char === '\\';
      continue;
    }
    if (state.inDouble) {
      if (!state.escaped && char === '"') state.inDouble = false;
      state.escaped = !state.escaped && char === '\\';
      continue;
    }
    if (state.inTemplate) {
      if (!state.escaped && char === '`') state.inTemplate = false;
      state.escaped = !state.escaped && char === '\\';
      continue;
    }

    if (char === '/' && next === '/') {
      return { code: line.slice(0, index), comment: line.slice(index + 2) };
    }

    if (char === '\'') {
      state.inSingle = true;
      state.escaped = false;
      continue;
    }
    if (char === '"') {
      state.inDouble = true;
      state.escaped = false;
      continue;
    }
    if (char === '`') {
      state.inTemplate = true;
      state.escaped = false;
      continue;
    }
  }

  return { code: line, comment: null };
}
