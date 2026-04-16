/* eslint-disable complexity */
/* eslint-disable max-depth */

export type SegmentKind =
  | 'code'
  | 'comment'
  | 'single_string'
  | 'double_string'
  | 'template_string';

export type Segment = { kind: SegmentKind; text: string };

export class ScanState {
  inSingle = false;
  inDouble = false;
  inTemplate = false;
  inLineComment = false;
  inBlockComment = false;
  escaped = false;

  isInString(): boolean {
    return this.inSingle || this.inDouble || this.inTemplate;
  }

  isInComment(): boolean {
    return this.inLineComment || this.inBlockComment;
  }

  resetStringEscaped(): void {
    this.escaped = false;
  }

  updateStringEscaped(char: string): void {
    this.escaped = !this.escaped && char === '\\';
  }

  handleComment(char: string, next: string): { done: boolean; advance: number } {
    if (this.inLineComment && char === '\n') {
      this.inLineComment = false;
      return { done: true, advance: 0 };
    }
    if (this.inBlockComment && char === '*' && next === '/') {
      this.inBlockComment = false;
      return { done: true, advance: 1 };
    }
    return { done: false, advance: 0 };
  }

  private getQuote(kind: SegmentKind): string {
    if (kind === 'single_string') return '\'';
    if (kind === 'double_string') return '"';
    return '`';
  }

  handleString(char: string, kind: SegmentKind): boolean {
    const quote = this.getQuote(kind);
    if (!this.escaped && char === quote) {
      if (kind === 'single_string') this.inSingle = false;
      else if (kind === 'double_string') this.inDouble = false;
      else this.inTemplate = false;
      return true;
    }
    this.updateStringEscaped(char);
    return false;
  }

  detectNew(char: string, next: string): { newKind: SegmentKind; advance: number } | null {
    if (char === '/' && (next === '/' || next === '*')) {
      if (next === '/') this.inLineComment = true;
      else this.inBlockComment = true;
      return { newKind: 'comment', advance: 1 };
    }
    if (char === '\'' || char === '"' || char === '`') {
      let k: SegmentKind = 'template_string';
      if (char === '\'') {
        this.inSingle = true;
        k = 'single_string';
      } else if (char === '"') {
        this.inDouble = true;
        k = 'double_string';
      } else {
        this.inTemplate = true;
      }
      this.resetStringEscaped();
      return { newKind: k, advance: 0 };
    }
    return null;
  }
}

export function segmentizeJsLikeText(input: string): Segment[] {
  const state = new ScanState();
  const segments: Segment[] = [];
  let kind: SegmentKind = 'code';
  let buf = '';

  const flush = (): void => {
    if (buf.length > 0) {
      segments.push({ kind, text: buf });
      buf = '';
    }
  };

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index] ?? '';
    const next = input[index + 1] ?? '';

    if (kind === 'comment') {
      buf += char;
      const res = state.handleComment(char, next);
      if (res.done) {
        if (res.advance > 0) buf += next;
        index += res.advance;
        flush();
        kind = 'code';
      }
      continue;
    }

    if (kind !== 'code') {
      buf += char;
      if (state.handleString(char, kind)) {
        flush();
        kind = 'code';
      }
      continue;
    }

    const newSeg = state.detectNew(char, next);
    if (newSeg !== null) {
      flush();
      kind = newSeg.newKind;
      buf = input.slice(index, index + newSeg.advance + 1);
      index += newSeg.advance;
    } else {
      buf += char;
    }
  }

  flush();
  return segments;
}
