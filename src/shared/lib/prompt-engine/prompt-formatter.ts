import type {
  PromptAutofixOperation,
  PromptValidationRule,
  PromptValidationSettings,
  PromptValidationSimilar as PromptValidationSimilarPattern,
  PromptAppliedFix as AppliedFix,
  FormatPromptResult,
  FormatPromptOptions,
} from '@/shared/contracts/prompt-engine';
import { recordPromptValidationTiming } from '@/shared/lib/prompt-core/runtime-observability';

import {
  doesPromptRuleApplyToScope,
  evaluatePromptValidationRule,
  isPromptRuleInSequenceGroup,
  normalizePromptRuleChainMode,
  normalizePromptRuleMaxExecutions,
  preparePromptValidationRuntime,
  shouldLaunchPromptRule,
  validateProgrammaticPromptWithRuntime,
  type PromptValidationExecutionContext,
} from './prompt-validator';

export type { FormatPromptResult, FormatPromptOptions };

type ScanState = {
  inSingle: boolean;
  inDouble: boolean;
  inTemplate: boolean;
  inLineComment: boolean;
  inBlockComment: boolean;
  escaped: boolean;
};

type SegmentKind = 'code' | 'comment' | 'single_string' | 'double_string' | 'template_string';

type Segment = { kind: SegmentKind; text: string };

const createScanState = (): ScanState => ({
  inSingle: false,
  inDouble: false,
  inTemplate: false,
  inLineComment: false,
  inBlockComment: false,
  escaped: false,
});

function findMatchingBrace(input: string, startIndex: number): number {
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

function segmentizeJsLikeText(input: string): Segment[] {
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
  } catch {
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
  } catch {
    return prompt;
  }
}

export function formatProgrammaticPrompt(
  prompt: string,
  settings: PromptValidationSettings,
  context: PromptValidationExecutionContext = {},
  options: FormatPromptOptions = {}
): FormatPromptResult {
  const startedAt = performance.now();
  const mergedRules: PromptValidationRule[] = [...settings.rules, ...(settings.learnedRules ?? [])];
  const validationSettings = { ...settings, enabled: true, rules: mergedRules };
  const runtime =
    options.preparedRuntime ?? preparePromptValidationRuntime(validationSettings, context);
  const issuesBeforeList =
    options.precomputedIssuesBefore ?? validateProgrammaticPromptWithRuntime(prompt, runtime);
  const issuesBefore = issuesBeforeList.length;
  if (issuesBefore === 0) {
    recordPromptValidationTiming('formatter_ms', performance.now() - startedAt, {
      scope: context.scope ?? 'none',
      changed: '0',
      mode: 'skip',
    });
    return { prompt, changed: false, applied: [], issuesBefore, issuesAfter: 0 };
  }

  const orderedRules = runtime.orderedRules;
  const sequenceGroupCounts = runtime.sequenceGroupCounts;

  let nextPrompt = prompt;
  const applied: AppliedFix[] = [];
  const impactedRuleIds = new Set<string>();
  let wideImpactFix = false;

  for (const rule of orderedRules) {
    if (!rule.enabled) continue;
    if (!doesPromptRuleApplyToScope(rule, runtime.context.scope)) continue;

    const inSequenceGroup = isPromptRuleInSequenceGroup(rule, sequenceGroupCounts);
    const maxExecutions = normalizePromptRuleMaxExecutions(rule);
    let candidatePrompt = nextPrompt;
    let matched = false;
    let replaced = false;

    for (let execution = 0; execution < maxExecutions; execution += 1) {
      if (!shouldLaunchPromptRule(rule, candidatePrompt, runtime.context)) break;
      const issue = evaluatePromptValidationRule(candidatePrompt, rule);
      if (!issue) break;

      matched = true;
      let appliedFixInExecution = false;

      const autofix = rule.autofix;
      if (autofix?.enabled && Array.isArray(autofix.operations) && autofix.operations.length > 0) {
        for (const op of autofix.operations) {
          const before = candidatePrompt;
          candidatePrompt = applyAutofixOperation(candidatePrompt, op);
          if (candidatePrompt !== before) {
            applied.push({ ruleId: rule.id, operationKind: op.kind });
            appliedFixInExecution = true;
            impactedRuleIds.add(rule.id);
            if (op.kind === 'params_json') {
              wideImpactFix = true;
            }
          }
        }
      }

      if (!appliedFixInExecution && Array.isArray(rule.similar) && rule.similar.length > 0) {
        for (const sim of rule.similar) {
          const before = candidatePrompt;
          candidatePrompt = applySuggestionFix(candidatePrompt, sim);
          if (candidatePrompt !== before) {
            applied.push({ ruleId: rule.id, operationKind: 'replace' });
            appliedFixInExecution = true;
            impactedRuleIds.add(rule.id);
            if (sim.pattern.includes('params')) {
              wideImpactFix = true;
            }
          }
        }
      }

      if (!appliedFixInExecution) break;
      replaced = true;

      if (rule.passOutputToNext !== false) {
        nextPrompt = candidatePrompt;
      }
    }

    if (inSequenceGroup) {
      const chainMode = normalizePromptRuleChainMode(rule);
      if (matched && chainMode === 'stop_on_match') break;
      if (replaced && chainMode === 'stop_on_replace') break;
      if (replaced && rule.passOutputToNext === false) break;
      continue;
    }

    if (replaced && rule.passOutputToNext !== false && candidatePrompt !== nextPrompt) {
      nextPrompt = candidatePrompt;
    }

    if (replaced) {
      const sequenceGroupId = rule.sequenceGroupId?.trim();
      if (sequenceGroupId) {
        orderedRules.forEach((entry) => {
          if (entry.sequenceGroupId?.trim() === sequenceGroupId) {
            impactedRuleIds.add(entry.id);
          }
        });
      }
    }
  }

  const changed = nextPrompt !== prompt;
  let issuesAfter = issuesBefore;
  if (changed) {
    const shouldUseIncremental =
      options.enableIncrementalValidation !== false && !wideImpactFix && impactedRuleIds.size > 0;
    if (shouldUseIncremental) {
      const afterTouchedIssues = validateProgrammaticPromptWithRuntime(nextPrompt, runtime, {
        includeRuleIds: impactedRuleIds,
      });
      const untouchedBeforeCount = issuesBeforeList.filter(
        (issue) => !impactedRuleIds.has(issue.ruleId)
      ).length;
      issuesAfter = untouchedBeforeCount + afterTouchedIssues.length;
    } else {
      issuesAfter = validateProgrammaticPromptWithRuntime(nextPrompt, runtime).length;
    }
  }

  recordPromptValidationTiming('formatter_ms', performance.now() - startedAt, {
    scope: context.scope ?? 'none',
    changed: changed ? '1' : '0',
    mode: changed && impactedRuleIds.size > 0 && !wideImpactFix ? 'incremental' : 'full',
  });

  return {
    prompt: nextPrompt,
    changed,
    applied,
    issuesBefore,
    issuesAfter,
  };
}
