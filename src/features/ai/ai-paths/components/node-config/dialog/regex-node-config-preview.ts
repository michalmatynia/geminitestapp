import type { RegexConfig } from '@/shared/lib/ai-paths';
import {
  normalizeJsonIntegrityPolicy,
  normalizeJsonLikeValue,
  type JsonIntegrityPolicy,
} from '@/shared/lib/ai-paths/core/runtime/handlers/json-integrity';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export type RegexCandidate = {
  pattern: string;
  flags: string;
  groupBy?: string;
};

export type RegexPreviewRecord = {
  input: string;
  match: string | null;
  index: number | null;
  captures: string[];
  groups: Record<string, string> | null;
  key: string;
  extracted: unknown;
};

type RegexValidation = {
  ok: boolean;
  regex: RegExp | null;
};

export type RegexPreviewResult = {
  matches: RegexPreviewRecord[];
  grouped: unknown;
  extracted: unknown;
};

/** Extract code blocks from markdown-style ``` delimiters */
export function extractCodeSnippets(text: string): string[] {
  const regex = /```[\w]*\n?([\s\S]*?)```/g;
  const snippets: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const code = match[1]?.trim();
    if (code) snippets.push(code);
  }
  return snippets;
}

export const normalizeRegexFlags = (flags: string | undefined): string => {
  if (!flags) return '';
  const allowed = new Set(['d', 'g', 'i', 'm', 's', 'u', 'v', 'y']);
  const seen = new Set<string>();
  const normalized = Array.from(flags)
    .filter((ch: string) => allowed.has(ch))
    .filter((ch: string) => {
      if (seen.has(ch)) return false;
      seen.add(ch);
      return true;
    });
  const order = ['d', 'g', 'i', 'm', 's', 'u', 'v', 'y'];
  normalized.sort((a: string, b: string) => order.indexOf(a) - order.indexOf(b));
  return normalized.join('');
};

export const extractRegexLiteral = (value: string): { pattern: string; flags: string } | null => {
  const s = value.trim();
  if (!s.startsWith('/')) return null;
  let pattern = '';
  let escaped = false;
  let i = 1;
  for (; i < s.length; i += 1) {
    const ch = s[i]!;
    if (escaped) {
      pattern += ch;
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      pattern += ch;
      escaped = true;
      continue;
    }
    if (ch === '/') break;
    pattern += ch;
  }
  if (i >= s.length) return null;
  const flagsMatch = s.slice(i + 1).match(/^[dgimsuvy]*/);
  const flags = flagsMatch?.[0] ?? '';
  return { pattern, flags };
};

export const parseRegexCandidate = (raw: string): RegexCandidate | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // JSON: {"pattern":"...","flags":"...","groupBy":"..."}
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const record = parsed as Record<string, unknown>;
      if (typeof record['pattern'] === 'string' && record['pattern'].trim()) {
        return {
          pattern: record['pattern'].trim(),
          flags: typeof record['flags'] === 'string' ? normalizeRegexFlags(record['flags']) : '',
          ...(typeof record['groupBy'] === 'string' ? { groupBy: record['groupBy'] } : {}),
        };
      }
      if (typeof record['regex'] === 'string' && record['regex'].trim()) {
        const literal = extractRegexLiteral(record['regex']);
        if (literal) return { pattern: literal.pattern, flags: normalizeRegexFlags(literal.flags) };
        return { pattern: record['regex'].trim(), flags: '' };
      }
    }
  } catch (error) {
    logClientError(error);
  
    // ignore
  }

  // Regex literal: /.../gim
  const literal = extractRegexLiteral(trimmed);
  if (literal) {
    return {
      pattern: literal.pattern,
      flags: normalizeRegexFlags(literal.flags),
    };
  }

  // Heuristic: "pattern: ..." and optional "flags: ..."
  const patternLine = trimmed.match(/(?:^|\n)\s*pattern\s*[:=]\s*(.+)\s*$/im);
  if (patternLine?.[1]) {
    const patternValue = patternLine[1].trim();
    const flagsLine = trimmed.match(/(?:^|\n)\s*flags\s*[:=]\s*([dgimsuvy]+)\s*$/im);
    const groupByLine = trimmed.match(/(?:^|\n)\s*groupBy\s*[:=]\s*(.+)\s*$/im);
    const extracted = extractRegexLiteral(patternValue);
    return {
      pattern: extracted
        ? extracted.pattern
        : patternValue.replace(/^"|"$/g, '').replace(/^'|'$/g, ''),
      flags: normalizeRegexFlags(flagsLine?.[1] ?? extracted?.flags ?? ''),
      ...(groupByLine?.[1] ? { groupBy: groupByLine[1].trim() } : {}),
    };
  }

  // Fallback: treat as pattern string
  return { pattern: trimmed, flags: '' };
};

export const buildRegexItems = (value: unknown, splitLines: boolean): string[] => {
  if (value === undefined || value === null) return [];
  const list = Array.isArray(value) ? value : [value];
  return list.flatMap((item: unknown): string[] => {
    if (item === undefined || item === null) return [];
    const asString = typeof item === 'string' ? item : JSON.stringify(item, null, 2);
    if (!asString) return [];
    if (!splitLines) return [asString];
    return asString
      .split(/\r?\n/)
      .map((line: string) => line.trim())
      .filter(Boolean);
  });
};

const stringifyRegexSelection = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value === undefined || value === null) return '';
  try {
    return JSON.stringify(value);
  } catch (error) {
    logClientError(error);
    return typeof value === 'object' ? '[Object]' : String(value as string | number | boolean);
  }
};

const resolveRegexSelection = (match: RegExpExecArray, selector: string | undefined): unknown => {
  const key = (selector ?? 'match').trim();
  if (!key || key === 'match' || key === '0') {
    return match[0] ?? null;
  }
  if (key === 'captures') {
    return match.slice(1).map((value: string | undefined) => value ?? '');
  }
  const rawGroups =
    match.groups && typeof match.groups === 'object'
      ? (match.groups as Record<string, string | undefined>)
      : null;
  const groups = rawGroups
    ? (Object.fromEntries(
      Object.entries(rawGroups).map(([name, value]: [string, string | undefined]) => [
        name,
        value ?? '',
      ])
    ) as Record<string, string>)
    : null;
  if (key === 'groups') {
    return groups;
  }
  const asIndex = Number(key);
  if (Number.isInteger(asIndex)) {
    return match[asIndex] ?? null;
  }
  const candidate = rawGroups ? rawGroups[key] : undefined;
  if (typeof candidate === 'string') return candidate;
  if (candidate === undefined || candidate === null) return null;
  return stringifyRegexSelection(candidate);
};

const resolveGroupKey = (match: RegExpExecArray, groupBy: string | undefined): string | null => {
  const selected = resolveRegexSelection(match, groupBy);
  if (selected === undefined || selected === null) return null;
  if (typeof selected === 'string') return selected;
  return stringifyRegexSelection(selected);
};

const parseRegexExtractedJson = (value: unknown, policy: JsonIntegrityPolicy): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry: unknown) => parseRegexExtractedJson(entry, policy));
  }
  return normalizeJsonLikeValue(value, policy).value;
};

export const buildRegexPreview = (
  regexConfig: RegexConfig,
  regexValidation: RegexValidation,
  sampleLines: string[]
): RegexPreviewResult => {
  const mode = regexConfig.mode ?? 'group';
  const isExtractMode = mode === 'extract' || mode === 'extract_json';
  const shouldParse = mode === 'extract_json';
  const jsonIntegrityPolicy = normalizeJsonIntegrityPolicy(regexConfig.jsonIntegrityPolicy);
  const includeUnmatched = regexConfig.includeUnmatched ?? true;
  const unmatchedKey = (regexConfig.unmatchedKey ?? '__unmatched__').trim() || '__unmatched__';
  const matchMode = regexConfig.matchMode ?? 'first';
  const groupBy = regexConfig.groupBy ?? 'match';

  const matches: RegexPreviewRecord[] = [];
  const groupedMap = new Map<string, RegexPreviewRecord[]>();
  const pushGrouped = (key: string, record: RegexPreviewRecord): void => {
    const current = groupedMap.get(key) ?? [];
    current.push(record);
    groupedMap.set(key, current);
  };

  if (!regexValidation.ok || !regexValidation.regex) {
    return {
      matches,
      grouped: regexConfig.outputMode === 'array' ? [] : {},
      extracted: null,
    };
  }

  const compiled = regexValidation.regex;
  const nonGlobalRegex =
    compiled && matchMode !== 'all' && compiled.flags.includes('g')
      ? new RegExp(compiled.source, compiled.flags.replace('g', ''))
      : compiled;

  if (matchMode === 'first_overall') {
    let found = false;
    for (const input of sampleLines) {
      if (!nonGlobalRegex) break;
      nonGlobalRegex.lastIndex = 0;
      const match = nonGlobalRegex.exec(input);
      if (!match) continue;
      found = true;
      const key = resolveGroupKey(match, groupBy) ?? unmatchedKey;
      const groups =
        match.groups && typeof match.groups === 'object'
          ? (Object.fromEntries(
            Object.entries(match.groups).map(([k, v]: [string, string | undefined]) => [
              k,
              v ?? '',
            ])
          ) as Record<string, string>)
          : null;
      const extracted = shouldParse
        ? parseRegexExtractedJson(resolveRegexSelection(match, groupBy), jsonIntegrityPolicy)
        : resolveRegexSelection(match, groupBy);
      const record: RegexPreviewRecord = {
        input,
        match: match[0] ?? null,
        index: typeof match.index === 'number' ? match.index : null,
        captures: match.slice(1).map((value: string | undefined) => value ?? ''),
        groups,
        key,
        extracted,
      };
      matches.push(record);
      pushGrouped(key, record);
      break;
    }

    if (!found && includeUnmatched && sampleLines.length > 0) {
      const record: RegexPreviewRecord = {
        input: sampleLines[0] ?? '',
        match: null,
        index: null,
        captures: [],
        groups: null,
        key: unmatchedKey,
        extracted: null,
      };
      matches.push(record);
      pushGrouped(unmatchedKey, record);
    }
  } else {
    sampleLines.forEach((input: string) => {
      if (matchMode === 'all' && compiled) {
        const flagsWithG = compiled.flags.includes('g') ? compiled.flags : `${compiled.flags}g`;
        const regexAll = new RegExp(compiled.source, flagsWithG);
        let found = false;
        let match: RegExpExecArray | null;
        while ((match = regexAll.exec(input)) !== null) {
          found = true;
          const key = resolveGroupKey(match, groupBy) ?? unmatchedKey;
          const groups =
            match.groups && typeof match.groups === 'object'
              ? (Object.fromEntries(
                Object.entries(match.groups).map(([k, v]: [string, string | undefined]) => [
                  k,
                  v ?? '',
                ])
              ) as Record<string, string>)
              : null;
          const extracted = shouldParse
            ? parseRegexExtractedJson(resolveRegexSelection(match, groupBy), jsonIntegrityPolicy)
            : resolveRegexSelection(match, groupBy);
          const record: RegexPreviewRecord = {
            input,
            match: match[0] ?? null,
            index: typeof match.index === 'number' ? match.index : null,
            captures: match.slice(1).map((value: string | undefined) => value ?? ''),
            groups,
            key,
            extracted,
          };
          matches.push(record);
          pushGrouped(key, record);
          if (match[0] === '') {
            regexAll.lastIndex = Math.min(input.length, regexAll.lastIndex + 1);
          }
        }
        if (!found && includeUnmatched) {
          const record: RegexPreviewRecord = {
            input,
            match: null,
            index: null,
            captures: [],
            groups: null,
            key: unmatchedKey,
            extracted: null,
          };
          matches.push(record);
          pushGrouped(unmatchedKey, record);
        }
        return;
      }

      if (nonGlobalRegex) {
        nonGlobalRegex.lastIndex = 0;
      }
      const match = nonGlobalRegex ? nonGlobalRegex.exec(input) : null;
      if (!match) {
        if (!includeUnmatched) return;
        const record: RegexPreviewRecord = {
          input,
          match: null,
          index: null,
          captures: [],
          groups: null,
          key: unmatchedKey,
          extracted: null,
        };
        matches.push(record);
        pushGrouped(unmatchedKey, record);
        return;
      }
      const key = resolveGroupKey(match, groupBy) ?? unmatchedKey;
      const groups =
        match.groups && typeof match.groups === 'object'
          ? (Object.fromEntries(
            Object.entries(match.groups).map(([k, v]: [string, string | undefined]) => [
              k,
              v ?? '',
            ])
          ) as Record<string, string>)
          : null;
      const extracted = shouldParse
        ? parseRegexExtractedJson(resolveRegexSelection(match, groupBy), jsonIntegrityPolicy)
        : resolveRegexSelection(match, groupBy);
      const record: RegexPreviewRecord = {
        input,
        match: match[0] ?? null,
        index: typeof match.index === 'number' ? match.index : null,
        captures: match.slice(1).map((value: string | undefined) => value ?? ''),
        groups,
        key,
        extracted,
      };
      matches.push(record);
      pushGrouped(key, record);
    });
  }

  const groupedObject = Object.fromEntries(groupedMap.entries());
  const grouped =
    regexConfig.outputMode === 'array'
      ? Object.entries(groupedObject).map(([key, items]: [string, RegexPreviewRecord[]]) => ({
        key,
        items,
      }))
      : groupedObject;
  const extractedValues = matches
    .filter((record: RegexPreviewRecord): boolean => record.match !== null)
    .map((record: RegexPreviewRecord): unknown => record.extracted);
  const extracted = extractedValues.length <= 1 ? (extractedValues[0] ?? null) : extractedValues;

  return {
    matches,
    grouped,
    extracted: isExtractMode ? extracted : null,
  };
};
