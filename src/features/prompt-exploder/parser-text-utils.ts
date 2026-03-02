import type { ParsedPromptHeading } from '@/shared/contracts/prompt-exploder';

export const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const toLine = (line: string | undefined): string => (line ?? '').replace(/\r/g, '');

export const normalizeHeadingLabel = (line: string): string =>
  line
    .trim()
    .replace(/^#{1,6}\s+/, '')
    .replace(/^\[(.+)]$/, '$1')
    .trim();

export const parseCodeFromLine = (line: string): ParsedPromptHeading => {
  const trimmed = line.trim();
  const match = /^(P\d+|RL\d+|QA(?:_R)?\d+)\s*[—:-]?\s*(.*)$/i.exec(trimmed);
  if (!match) {
    return {
      code: null,
      title: trimmed,
    };
  }
  return {
    code: (match[1] ?? '').toUpperCase(),
    title: (match[2] ?? '').trim() || trimmed,
  };
};
