/* eslint-disable complexity */

import { ScanState, type SegmentKind } from './scanner';

const getStringKind = (state: ScanState): SegmentKind => {
  if (state.inSingle) return 'single_string';
  if (state.inDouble) return 'double_string';
  return 'template_string';
};

export function findMatchingBrace(input: string, startIndex: number): number {
  if (input[startIndex] !== '{') return -1;

  let depth = 0;
  const state = new ScanState();

  for (let index = startIndex; index < input.length; index += 1) {
    const char = input[index] ?? '';
    const next = input[index + 1] ?? '';

    if (state.isInComment()) {
      const res = state.handleComment(char, next);
      index += res.advance;
      continue;
    }

    if (state.isInString()) {
      state.handleString(char, getStringKind(state));
      continue;
    }

    const newSeg = state.detectNew(char, next);
    if (newSeg !== null) {
      index += newSeg.advance;
      continue;
    }

    if (char === '{') depth += 1;
    else if (char === '}') depth -= 1;

    if (depth === 0) return index;
  }

  return -1;
}

export function stripJsComments(input: string): string {
  const state = new ScanState();
  const out: string[] = [];

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index] ?? '';
    const next = input[index + 1] ?? '';

    if (state.isInComment()) {
      const wasLine = state.inLineComment;
      const res = state.handleComment(char, next);
      if (wasLine && res.done) out.push(char);
      index += res.advance;
      continue;
    }

    if (state.isInString()) {
      out.push(char);
      state.handleString(char, getStringKind(state));
      continue;
    }

    const newSeg = state.detectNew(char, next);
    if (newSeg !== null) {
      if (newSeg.newKind !== 'comment') out.push(char);
      index += newSeg.advance;
      continue;
    }

    out.push(char);
  }

  return out.join('');
}

const shouldSkipComma = (input: string, index: number): boolean => {
  let lookahead = index + 1;
  while (lookahead < input.length) {
    const ahead = input[lookahead] ?? '';
    if (!/\s/.test(ahead)) break;
    lookahead += 1;
  }
  const ahead = input[lookahead] ?? '';
  return ahead === '}' || ahead === ']';
};

export function removeTrailingCommas(input: string): string {
  const state = new ScanState();
  const out: string[] = [];

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index] ?? '';

    if (state.isInString()) {
      out.push(char);
      state.handleString(char, getStringKind(state));
      continue;
    }

    const newSeg = state.detectNew(char, '');
    if (newSeg !== null) {
      out.push(char);
      continue;
    }

    if (char === ',' && shouldSkipComma(input, index)) {
      continue;
    }

    out.push(char);
  }

  return out.join('');
}

export function splitLineCodeAndLineComment(line: string): {
  code: string;
  comment: string | null;
} {
  const state = new ScanState();

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index] ?? '';
    const next = line[index + 1] ?? '';

    if (state.isInString()) {
      state.handleString(char, getStringKind(state));
      continue;
    }

    if (char === '/' && next === '/') {
      return { code: line.slice(0, index), comment: line.slice(index + 2) };
    }

    state.detectNew(char, '');
  }

  return { code: line, comment: null };
}
