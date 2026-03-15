import { parseJsonSetting } from '@/shared/utils/settings-json';

import {
  DEFAULT_FILEMAKER_EMAIL_PARSER_RULES,
  DEFAULT_FILEMAKER_PHONE_VALIDATION_RULES,
  type FilemakerEmailExtractionResult,
  type FilemakerEmailParserRule,
  type FilemakerPhoneValidationResult,
  type FilemakerPhoneValidationRule,
} from './filemaker-settings.extraction';
import { normalizeString, sanitizePhoneCandidate } from './filemaker-settings.helpers';
import {
  FILEMAKER_EMAIL_PARSER_RULE_PREFIX,
  FILEMAKER_PHONE_VALIDATION_RULE_PREFIX,
} from './settings-constants';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


const FILEMAKER_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FilemakerEmailParserRuntimeRule = {
  id: string;
  regex: RegExp;
  sequence: number;
};

type FilemakerPhoneValidationRuntimeRule = {
  id: string;
  regex: RegExp;
  sequence: number;
};

const normalizeRegexFlags = (
  value: unknown,
  options?: {
    forceGlobal?: boolean;
  }
): string => {
  const raw = normalizeString(value);
  const unique = new Set<string>();
  raw.split('').forEach((flag: string): void => {
    if (flag === 'i' || flag === 'm' || flag === 's' || flag === 'u' || flag === 'd') {
      unique.add(flag);
    }
  });
  if (options?.forceGlobal) {
    unique.add('g');
  }
  return Array.from(unique).join('');
};

const normalizeEmailParserFlags = (value: unknown): string =>
  normalizeRegexFlags(value, { forceGlobal: true });

const normalizePhoneValidationFlags = (value: unknown): string =>
  normalizeRegexFlags(value, { forceGlobal: false });

const sanitizeEmailCandidate = (value: string): string => {
  let current = value.trim().replace(/^mailto:\s*/i, '');
  if (!current) return '';

  const leadingWrapperRe = /^[<([{'"`]+/;
  const trailingWrapperRe = /[>\])}"'`.,;:!?]+$/;
  let previous = '';
  while (previous !== current) {
    previous = current;
    current = current.replace(leadingWrapperRe, '').replace(trailingWrapperRe, '').trim();
  }
  return current;
};

const toParserRuleSequence = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
};

const sortFilemakerEmailParserRules = (
  rules: FilemakerEmailParserRule[]
): FilemakerEmailParserRule[] =>
  [...rules].sort((left: FilemakerEmailParserRule, right: FilemakerEmailParserRule) => {
    const leftSequence = toParserRuleSequence(left.sequence);
    const rightSequence = toParserRuleSequence(right.sequence);
    if (leftSequence !== rightSequence) return leftSequence - rightSequence;
    return left.id.localeCompare(right.id);
  });

const sortFilemakerPhoneValidationRules = (
  rules: FilemakerPhoneValidationRule[]
): FilemakerPhoneValidationRule[] =>
  [...rules].sort((left: FilemakerPhoneValidationRule, right: FilemakerPhoneValidationRule) => {
    const leftSequence = toParserRuleSequence(left.sequence);
    const rightSequence = toParserRuleSequence(right.sequence);
    if (leftSequence !== rightSequence) return leftSequence - rightSequence;
    return left.id.localeCompare(right.id);
  });

const compileFilemakerEmailParserRules = (
  rules: FilemakerEmailParserRule[]
): FilemakerEmailParserRuntimeRule[] =>
  sortFilemakerEmailParserRules(rules)
    .map((rule: FilemakerEmailParserRule): FilemakerEmailParserRuntimeRule | null => {
      const pattern = normalizeString(rule.pattern);
      if (!pattern) return null;
      try {
        return {
          id: normalizeString(rule.id) || FILEMAKER_EMAIL_PARSER_RULE_PREFIX,
          regex: new RegExp(pattern, normalizeEmailParserFlags(rule.flags)),
          sequence: toParserRuleSequence(rule.sequence),
        };
      } catch (error) {
        logClientError(error);
        return null;
      }
    })
    .filter(
      (entry: FilemakerEmailParserRuntimeRule | null): entry is FilemakerEmailParserRuntimeRule =>
        Boolean(entry)
    );

const compileFilemakerPhoneValidationRules = (
  rules: FilemakerPhoneValidationRule[]
): FilemakerPhoneValidationRuntimeRule[] =>
  sortFilemakerPhoneValidationRules(rules)
    .map((rule: FilemakerPhoneValidationRule): FilemakerPhoneValidationRuntimeRule | null => {
      const pattern = normalizeString(rule.pattern);
      if (!pattern) return null;
      try {
        return {
          id: normalizeString(rule.id) || FILEMAKER_PHONE_VALIDATION_RULE_PREFIX,
          regex: new RegExp(pattern, normalizePhoneValidationFlags(rule.flags)),
          sequence: toParserRuleSequence(rule.sequence),
        };
      } catch (error) {
        logClientError(error);
        return null;
      }
    })
    .filter(
      (
        entry: FilemakerPhoneValidationRuntimeRule | null
      ): entry is FilemakerPhoneValidationRuntimeRule => Boolean(entry)
    );

const parseRegexRulesFromPromptSettings = (
  rawPromptSettings: string | null | undefined,
  rulePrefix: string
): Array<{
  id: string;
  pattern: string;
  flags: string;
  sequence: number;
}> => {
  const parsed = parseJsonSetting<Record<string, unknown> | null>(rawPromptSettings, null);
  if (!parsed || typeof parsed !== 'object') return [];

  const promptValidation =
    parsed['promptValidation'] &&
    typeof parsed['promptValidation'] === 'object' &&
    !Array.isArray(parsed['promptValidation'])
      ? (parsed['promptValidation'] as Record<string, unknown>)
      : null;
  if (!promptValidation) return [];

  const rawRules = Array.isArray(promptValidation['rules'])
    ? (promptValidation['rules'] as unknown[])
    : [];
  return rawRules
    .filter(
      (entry: unknown): entry is Record<string, unknown> =>
        Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry)
    )
    .map(
      (
        entry: Record<string, unknown>
      ): { id: string; pattern: string; flags: string; sequence: number } | null => {
        const id = normalizeString(entry['id']);
        if (!id.startsWith(rulePrefix)) return null;
        if (normalizeString(entry['kind']).toLowerCase() !== 'regex') return null;
        if (entry['enabled'] === false) return null;

        const pattern = normalizeString(entry['pattern']);
        if (!pattern) return null;

        return {
          id,
          pattern,
          flags: normalizeString(entry['flags']),
          sequence: typeof entry['sequence'] === 'number' ? entry['sequence'] : 0,
        };
      }
    )
    .filter(
      (
        entry: { id: string; pattern: string; flags: string; sequence: number } | null
      ): entry is { id: string; pattern: string; flags: string; sequence: number } => Boolean(entry)
    );
};

export const parseFilemakerEmailParserRulesFromPromptSettings = (
  rawPromptSettings: string | null | undefined
): FilemakerEmailParserRule[] => {
  return sortFilemakerEmailParserRules(
    parseRegexRulesFromPromptSettings(rawPromptSettings, FILEMAKER_EMAIL_PARSER_RULE_PREFIX)
  );
};

export const parseFilemakerPhoneValidationRulesFromPromptSettings = (
  rawPromptSettings: string | null | undefined
): FilemakerPhoneValidationRule[] => {
  return sortFilemakerPhoneValidationRules(
    parseRegexRulesFromPromptSettings(rawPromptSettings, FILEMAKER_PHONE_VALIDATION_RULE_PREFIX)
  );
};

export const validateFilemakerPhoneNumber = (
  rawPhoneNumber: string,
  options?: {
    validationRules?: FilemakerPhoneValidationRule[] | null | undefined;
  }
): FilemakerPhoneValidationResult => {
  const normalizedPhoneNumber = sanitizePhoneCandidate(normalizeString(rawPhoneNumber));
  const customRules = sortFilemakerPhoneValidationRules(options?.validationRules ?? []);
  const fallbackRules =
    customRules.length > 0 ? customRules : DEFAULT_FILEMAKER_PHONE_VALIDATION_RULES;
  const runtimeRules = compileFilemakerPhoneValidationRules(fallbackRules);
  if (!normalizedPhoneNumber || runtimeRules.length === 0) {
    return {
      isValid: false,
      normalizedPhoneNumber,
      matchedRuleId: null,
      usedDefaultRules: customRules.length === 0,
    };
  }

  const matchedRule =
    runtimeRules.find((rule: FilemakerPhoneValidationRuntimeRule): boolean => {
      rule.regex.lastIndex = 0;
      return rule.regex.test(normalizedPhoneNumber);
    }) ?? null;

  return {
    isValid: Boolean(matchedRule),
    normalizedPhoneNumber,
    matchedRuleId: matchedRule?.id ?? null,
    usedDefaultRules: customRules.length === 0,
  };
};

export const extractFilemakerEmailsFromText = (
  rawText: string,
  options?: {
    parserRules?: FilemakerEmailParserRule[] | null | undefined;
  }
): FilemakerEmailExtractionResult => {
  const source = normalizeString(rawText);
  const customRules = sortFilemakerEmailParserRules(options?.parserRules ?? []);
  const fallbackRules = customRules.length > 0 ? customRules : DEFAULT_FILEMAKER_EMAIL_PARSER_RULES;
  const runtimeRules = compileFilemakerEmailParserRules(fallbackRules);
  if (!source || runtimeRules.length === 0) {
    return {
      emails: [],
      totalMatches: 0,
      invalidMatches: 0,
      usedDefaultRules: customRules.length === 0,
    };
  }

  const extracted: string[] = [];
  const uniqueEmails = new Set<string>();
  let totalMatches = 0;
  let invalidMatches = 0;

  runtimeRules.forEach((rule: FilemakerEmailParserRuntimeRule): void => {
    const regex = new RegExp(rule.regex.source, rule.regex.flags);
    let match: RegExpExecArray | null = regex.exec(source);
    while (match) {
      totalMatches += 1;

      const captured =
        match
          .slice(1)
          .find(
            (entry: string | undefined): entry is string =>
              typeof entry === 'string' && entry.trim().length > 0
          ) ??
        match[0] ??
        '';

      const normalizedEmail = sanitizeEmailCandidate(captured).toLowerCase();

      if (!FILEMAKER_EMAIL_RE.test(normalizedEmail)) {
        invalidMatches += 1;
      } else if (!uniqueEmails.has(normalizedEmail)) {
        uniqueEmails.add(normalizedEmail);
        extracted.push(normalizedEmail);
      }

      if ((match[0] ?? '').length === 0) {
        regex.lastIndex += 1;
      }
      match = regex.exec(source);
    }
  });

  return {
    emails: extracted,
    totalMatches,
    invalidMatches,
    usedDefaultRules: customRules.length === 0,
  };
};
