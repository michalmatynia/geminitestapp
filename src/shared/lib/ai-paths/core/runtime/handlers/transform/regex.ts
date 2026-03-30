import type { RegexConfig } from '@/shared/contracts/ai-paths';
import type {
  NodeHandler,
  NodeHandlerContext,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths-runtime';
import { cloneValue, coerceInputArray, renderTemplate, safeStringify } from '@/shared/lib/ai-paths/core/utils';

import {
  normalizeJsonIntegrityPolicy,
  normalizeJsonLikeValue,
  type JsonIntegrityDiagnostic,
  type JsonIntegrityPolicy,
} from '../json-integrity';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


type RegexMatchRecord = {
  input: string;
  match: string | null;
  index: number | null;
  captures: string[];
  groups: Record<string, string> | null;
  key: string;
  extracted: unknown;
};

type RegexJsonIntegrityDiagnostic = JsonIntegrityDiagnostic & {
  key: string;
  index: number | null;
};

const normalizeRegexFlags = (flags: string | undefined): string => {
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
  // Stable-ish ordering to avoid churn.
  const order = ['d', 'g', 'i', 'm', 's', 'u', 'v', 'y'];
  normalized.sort((a: string, b: string) => order.indexOf(a) - order.indexOf(b));
  return normalized.join('');
};

const buildRegexItems = (value: unknown, splitLines: boolean): string[] => {
  const rawValues = coerceInputArray(value);
  const strings = rawValues.flatMap((item: unknown): string[] => {
    if (item === undefined || item === null) return [];
    const asString = typeof item === 'string' ? item : safeStringify(item);
    if (!asString) return [];
    if (!splitLines) return [asString];
    return asString
      .split(/\r?\n/)
      .map((line: string) => line.trim())
      .filter(Boolean);
  });
  return strings;
};

const resolveRegexSelectorKey = (selector: string | undefined): string =>
  (selector ?? 'match').trim();

const resolveRegexRawGroups = (match: RegExpExecArray): Record<string, unknown> | null =>
  match.groups && typeof match.groups === 'object'
    ? (match.groups as Record<string, unknown>)
    : null;

const normalizeRegexGroupValue = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value === undefined || value === null) return '';
  return safeStringify(value);
};

const normalizeRegexGroups = (
  rawGroups: Record<string, unknown> | null
): Record<string, string> | null =>
  rawGroups
    ? (Object.fromEntries(
      Object.entries(rawGroups).map(([name, value]: [string, unknown]) => [
        name,
        normalizeRegexGroupValue(value),
      ])
    ) as Record<string, string>)
    : null;

const resolveRegexIndexedSelection = (
  match: RegExpExecArray,
  key: string
): { handled: boolean; value: unknown } => {
  const asIndex = Number(key);
  if (!Number.isInteger(asIndex)) return { handled: false, value: null };
  return {
    handled: true,
    value: match[asIndex] ?? null,
  };
};

const resolveRegexGroupSelection = (
  rawGroups: Record<string, unknown> | null,
  key: string
): unknown => {
  const candidate = rawGroups ? rawGroups[key] : undefined;
  if (typeof candidate === 'string') return candidate;
  if (candidate === undefined || candidate === null) return null;
  return safeStringify(candidate);
};

const resolveRegexSelection = (match: RegExpExecArray, selector: string | undefined): unknown => {
  const key = resolveRegexSelectorKey(selector);
  if (!key || key === 'match' || key === '0') {
    return match[0] ?? null;
  }
  if (key === 'captures') {
    return match.slice(1).map((value: string | undefined) => value ?? '');
  }
  const rawGroups = resolveRegexRawGroups(match);
  const groups = normalizeRegexGroups(rawGroups);
  if (key === 'groups') {
    return groups;
  }
  const indexed = resolveRegexIndexedSelection(match, key);
  if (indexed.handled) return indexed.value;
  return resolveRegexGroupSelection(rawGroups, key);
};

const parseRegexExtractedJson = (
  value: unknown,
  policy: JsonIntegrityPolicy
): { value: unknown; diagnostics: JsonIntegrityDiagnostic[] } => {
  if (Array.isArray(value)) {
    const diagnostics: JsonIntegrityDiagnostic[] = [];
    const parsed = value.map((entry: unknown): unknown => {
      const next = parseRegexExtractedJson(entry, policy);
      diagnostics.push(...next.diagnostics);
      return next.value;
    });
    return { value: parsed, diagnostics };
  }
  const normalized = normalizeJsonLikeValue(value, policy);
  const diagnostics =
    normalized.state === 'repaired' || normalized.state === 'unparseable'
      ? [normalized.diagnostic]
      : [];
  return {
    value: normalized.value,
    diagnostics,
  };
};

const resolveGroupKey = (match: RegExpExecArray, groupBy: string | undefined): string | null => {
  const selected = resolveRegexSelection(match, groupBy);
  if (selected === undefined || selected === null) return null;
  if (typeof selected === 'string') return selected;
  return safeStringify(selected);
};

const buildRegexMatchRecord = (
  input: string,
  match: RegExpExecArray | null,
  key: string,
  extracted: unknown
): RegexMatchRecord => ({
  input,
  match: match?.[0] ?? null,
  index: typeof match?.index === 'number' ? match.index : null,
  captures: match ? match.slice(1).map((value: string | undefined) => value ?? '') : [],
  groups: match ? normalizeRegexGroups(resolveRegexRawGroups(match)) : null,
  key,
  extracted,
});

export const handleRegex: NodeHandler = ({
  node,
  nodeInputs,
}: NodeHandlerContext): RuntimePortValues => {
  const regexConfig: RegexConfig = node.config?.regex ?? {
    pattern: '',
    flags: 'g',
    mode: 'group',
    matchMode: 'first',
    groupBy: 'match',
    outputMode: 'object',
    includeUnmatched: true,
    unmatchedKey: '__unmatched__',
    splitLines: true,
    sampleText: '',
    aiPrompt: '',
  };

  const rawInput = nodeInputs['value'] ?? nodeInputs['prompt'];
  const splitLines = regexConfig.splitLines ?? true;
  const items = buildRegexItems(rawInput, splitLines);

  const pattern = (regexConfig.pattern ?? '').trim();
  const flags = normalizeRegexFlags(regexConfig.flags);
  const mode = regexConfig.mode ?? 'group';
  const isExtractMode = mode === 'extract' || mode === 'extract_json';
  const matchMode = regexConfig.matchMode ?? 'first';
  const groupBy = regexConfig.groupBy ?? 'match';
  const includeUnmatched = regexConfig.includeUnmatched ?? true;
  const unmatchedKey = (regexConfig.unmatchedKey ?? '__unmatched__').trim() || '__unmatched__';
  const jsonIntegrityPolicy = normalizeJsonIntegrityPolicy(regexConfig.jsonIntegrityPolicy);
  const jsonIntegrityDiagnostics: RegexJsonIntegrityDiagnostic[] = [];

  const textForPrompt = typeof rawInput === 'string' ? rawInput : items.join('\n');
  const aiPromptTemplate = regexConfig.aiPrompt ?? '';
  const aiPrompt = aiPromptTemplate.trim()
    ? renderTemplate(
      aiPromptTemplate,
        { ...nodeInputs, text: textForPrompt, lines: items } as Record<string, unknown>,
        textForPrompt
    )
    : '';
  const aiAutoRun = regexConfig.aiAutoRun ?? false;

  if (!pattern) {
    const emptyGrouped = regexConfig.outputMode === 'array' ? [] : {};
    return {
      grouped: emptyGrouped,
      matches: [],
      value: isExtractMode ? null : emptyGrouped,
      ...(aiAutoRun && aiPrompt ? { aiPrompt } : {}),
    };
  }

  let compiled: RegExp;
  try {
    compiled = new RegExp(pattern, flags);
  } catch (error) {
    logClientError(error);
    const emptyGrouped = regexConfig.outputMode === 'array' ? [] : {};
    return {
      grouped: emptyGrouped,
      matches: [],
      value: isExtractMode ? null : emptyGrouped,
      ...(aiAutoRun && aiPrompt ? { aiPrompt } : {}),
    };
  }

  const matches: RegexMatchRecord[] = [];
  const groupedMap = new Map<string, RegexMatchRecord[]>();
  const nonGlobalRegex =
    matchMode === 'all'
      ? compiled
      : compiled.flags.includes('g')
        ? new RegExp(compiled.source, compiled.flags.replace('g', ''))
        : compiled;

  const pushGrouped = (key: string, record: RegexMatchRecord): void => {
    const current = groupedMap.get(key) ?? [];
    current.push(record);
    groupedMap.set(key, current);
  };
  const resolveExtractedValue = (
    selectedValue: unknown,
    context: {
      key: string;
      index: number | null;
    }
  ): unknown => {
    if (mode !== 'extract_json') return selectedValue;
    const parsed = parseRegexExtractedJson(selectedValue, jsonIntegrityPolicy);
    if (parsed.diagnostics.length > 0) {
      parsed.diagnostics.forEach((diagnostic: JsonIntegrityDiagnostic): void => {
        jsonIntegrityDiagnostics.push({
          ...diagnostic,
          key: context.key,
          index: context.index,
        });
      });
    }
    return parsed.value;
  };

  if (matchMode === 'first_overall') {
    let found = false;
    for (const input of items) {
      nonGlobalRegex.lastIndex = 0;
      const match = nonGlobalRegex.exec(input);
      if (!match) continue;
      found = true;
      const key = resolveGroupKey(match, groupBy) ?? unmatchedKey;
      const selectedValue = resolveRegexSelection(match, groupBy);
      const extracted = resolveExtractedValue(selectedValue, {
        key,
        index: typeof match.index === 'number' ? match.index : null,
      });
      const record = buildRegexMatchRecord(input, match, key, extracted);
      matches.push(record);
      pushGrouped(key, record);
      break;
    }

    if (!found && includeUnmatched && items.length > 0) {
      const record = buildRegexMatchRecord(items[0] ?? '', null, unmatchedKey, null);
      matches.push(record);
      pushGrouped(unmatchedKey, record);
    }
  } else {
    items.forEach((input: string) => {
      if (matchMode === 'all') {
        const flagsWithG = compiled.flags.includes('g') ? compiled.flags : `${compiled.flags}g`;
        const regexAll = new RegExp(compiled.source, flagsWithG);
        let found = false;
        let match: RegExpExecArray | null;
        while ((match = regexAll.exec(input)) !== null) {
          found = true;
          const key = resolveGroupKey(match, groupBy) ?? unmatchedKey;
          const selectedValue = resolveRegexSelection(match, groupBy);
          const extracted = resolveExtractedValue(selectedValue, {
            key,
            index: typeof match.index === 'number' ? match.index : null,
          });
          const record = buildRegexMatchRecord(input, match, key, extracted);
          matches.push(record);
          pushGrouped(key, record);
          // Avoid infinite loops on zero-length matches.
          if (match[0] === '') {
            regexAll.lastIndex = Math.min(input.length, regexAll.lastIndex + 1);
          }
        }
        if (!found && includeUnmatched) {
          const record = buildRegexMatchRecord(input, null, unmatchedKey, null);
          matches.push(record);
          pushGrouped(unmatchedKey, record);
        }
        return;
      }

      // matchMode === "first"
      nonGlobalRegex.lastIndex = 0;
      const match = nonGlobalRegex.exec(input);
      if (!match) {
        if (!includeUnmatched) return;
        const record = buildRegexMatchRecord(input, null, unmatchedKey, null);
        matches.push(record);
        pushGrouped(unmatchedKey, record);
        return;
      }
      const key = resolveGroupKey(match, groupBy) ?? unmatchedKey;
      const selectedValue = resolveRegexSelection(match, groupBy);
      const extracted = resolveExtractedValue(selectedValue, {
        key,
        index: typeof match.index === 'number' ? match.index : null,
      });
      const record = buildRegexMatchRecord(input, match, key, extracted);
      matches.push(record);
      pushGrouped(key, record);
    });
  }

  const groupedObject = Object.fromEntries(groupedMap.entries());
  const grouped =
    regexConfig.outputMode === 'array'
      ? Object.entries(groupedObject).map(([key, items]: [string, RegexMatchRecord[]]) => ({
        key,
        items,
      }))
      : groupedObject;
  const extractedValues = matches
    .filter((record: RegexMatchRecord): boolean => record.match !== null)
    .map((record: RegexMatchRecord): unknown => cloneValue(record.extracted));
  const extractedValue =
    extractedValues.length <= 1 ? (extractedValues[0] ?? null) : extractedValues;

  return {
    grouped,
    matches,
    value: isExtractMode ? extractedValue : grouped,
    ...(jsonIntegrityDiagnostics.length > 0 ? { jsonIntegrity: jsonIntegrityDiagnostics } : {}),
    ...(aiAutoRun && aiPrompt ? { aiPrompt } : {}),
  };
};
