import type {
  FormatPromptResult,
  PromptAutofixOperation,
  PromptAppliedFix,
  PromptValidationSimilar as PromptValidationSimilarPattern,
  PromptValidationRule,
  PromptValidationSettings,
} from '@/shared/contracts/prompt-engine';
import { validateProgrammaticPrompt } from '@/shared/lib/prompt-engine/prompt-validator';
import {
  findMatchingBrace,
  segmentizeJsLikeText,
  type Segment,
} from '@/shared/utils/prompt-params/scanner';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

type AppliedFix = PromptAppliedFix;

function normalizeParamsObject(rawObjectText: string): string {
  const segments = segmentizeJsLikeText(rawObjectText);
  const normalized = segments.map((segment: Segment) => {
    if (segment.kind === 'code') {
      // Quote simple unquoted keys: { foo: 1 } -> { "foo": 1 }
      return segment.text.replace(/(^|[{\s,])([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":');
    }
    if (segment.kind === 'single_string') {
      const inner = segment.text.slice(1, -1);
      // Best-effort safety: only convert simple single-quoted strings.
      if (
        !inner ||
        inner.includes('\n') ||
        inner.includes('\r') ||
        inner.includes('\\') ||
        inner.includes('"')
      ) {
        return segment.text;
      }
      return `"${inner}"`;
    }
    return segment.text;
  });

  return normalized.join('');
}

function applyParamsJsonFix(prompt: string): string {
  const match = /\bparams\b\s*=\s*\{/i.exec(prompt);
  if (!match) return prompt;

  const objectStart = prompt.indexOf('{', match.index);
  if (objectStart === -1) return prompt;

  const objectEndInclusive = findMatchingBrace(prompt, objectStart);
  if (objectEndInclusive === -1) return prompt;

  const rawObjectText = prompt.slice(objectStart, objectEndInclusive + 1);
  const normalizedObjectText = normalizeParamsObject(rawObjectText);
  if (normalizedObjectText === rawObjectText) return prompt;

  return `${prompt.slice(0, objectStart)}${normalizedObjectText}${prompt.slice(objectEndInclusive + 1)}`;
}

const normalizeRegexFlags = (flags: string | undefined, forceGlobal: boolean): string => {
  const raw = (flags ?? '').trim();
  const allowed = new Set(['d', 'g', 'i', 'm', 's', 'u', 'v', 'y']);
  const seen = new Set<string>();
  const normalized = Array.from(raw)
    .filter((ch: string) => allowed.has(ch))
    .filter((ch: string) => {
      if (seen.has(ch)) return false;
      seen.add(ch);
      return true;
    });
  if (forceGlobal && !seen.has('g')) normalized.push('g');
  const order = ['d', 'g', 'i', 'm', 's', 'u', 'v', 'y'];
  normalized.sort((a: string, b: string) => order.indexOf(a) - order.indexOf(b));
  return normalized.join('');
};

function applyAutofixOperation(prompt: string, operation: PromptAutofixOperation): string {
  if (operation.kind === 'params_json') {
    return applyParamsJsonFix(prompt);
  }

  const flags = normalizeRegexFlags(operation.flags, true);
  try {
    const re = new RegExp(operation.pattern, flags);
    return prompt.replace(re, operation.replacement);
  } catch (error) {
    logClientError(error);
    return prompt;
  }
}

const extractReplacementFromSuggestion = (suggestion: string): string | null => {
  const match = suggestion.match(/`([^`]+)`/);
  return match?.[1] ?? null;
};

function applySuggestionFix(prompt: string, suggestion: PromptValidationSimilarPattern): string {
  const replacement = extractReplacementFromSuggestion(suggestion.suggestion);
  if (!replacement) return prompt;
  const flags = normalizeRegexFlags(suggestion.flags, true);
  try {
    const re = new RegExp(suggestion.pattern, flags);
    const safeReplacement = replacement.replace(/\$/g, '$$');
    return prompt.replace(re, safeReplacement);
  } catch (error) {
    logClientError(error);
    return prompt;
  }
}

function getRuleById(rules: PromptValidationRule[], id: string): PromptValidationRule | null {
  return rules.find((rule: PromptValidationRule) => rule.id === id) ?? null;
}

export function formatProgrammaticPrompt(
  prompt: string,
  settings: PromptValidationSettings
): FormatPromptResult {
  const mergedRules: PromptValidationRule[] = [...settings.rules, ...(settings.learnedRules ?? [])];
  const validationSettings = { ...settings, enabled: true, rules: mergedRules };
  const issuesBeforeList = validateProgrammaticPrompt(prompt, validationSettings);
  const issuesBefore = issuesBeforeList.length;
  if (issuesBefore === 0) {
    return { prompt, changed: false, applied: [], issuesBefore, issuesAfter: 0 };
  }

  let nextPrompt = prompt;
  const applied: AppliedFix[] = [];

  for (const issue of issuesBeforeList) {
    const rule = getRuleById(mergedRules, issue.ruleId);
    const autofix = rule?.autofix;
    let appliedFix = false;
    if (
      rule &&
      autofix?.enabled &&
      Array.isArray(autofix.operations) &&
      autofix.operations.length > 0
    ) {
      for (const op of autofix.operations) {
        const before = nextPrompt;
        nextPrompt = applyAutofixOperation(nextPrompt, op);
        if (nextPrompt !== before) {
          applied.push({ ruleId: rule.id, operationKind: op.kind });
          appliedFix = true;
        }
      }
    }

    if (!rule || appliedFix) continue;

    if (Array.isArray(rule.similar) && rule.similar.length > 0) {
      for (const sim of rule.similar) {
        const before = nextPrompt;
        nextPrompt = applySuggestionFix(nextPrompt, sim);
        if (nextPrompt !== before) {
          applied.push({ ruleId: rule.id, operationKind: 'replace' });
        }
      }
    }
  }

  const issuesAfter = validateProgrammaticPrompt(nextPrompt, validationSettings).length;
  return {
    prompt: nextPrompt,
    changed: nextPrompt !== prompt,
    applied,
    issuesBefore,
    issuesAfter,
  };
}
