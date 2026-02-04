import { validateProgrammaticPrompt } from "./prompt-validator";
import type { PromptAutofixOperation, PromptValidationRule, PromptValidationSettings, PromptValidationSimilarPattern } from "./settings";

type AppliedFix = {
  ruleId: string;
  operationKind: PromptAutofixOperation["kind"];
};

export type FormatPromptResult = {
  prompt: string;
  changed: boolean;
  applied: AppliedFix[];
  issuesBefore: number;
  issuesAfter: number;
};

type ScanState = {
  inSingle: boolean;
  inDouble: boolean;
  inTemplate: boolean;
  inLineComment: boolean;
  inBlockComment: boolean;
  escaped: boolean;
};

type SegmentKind = "code" | "comment" | "single_string" | "double_string" | "template_string";

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
  if (input[startIndex] !== "{") return -1;

  let depth = 0;
  const state = createScanState();

  for (let index = startIndex; index < input.length; index += 1) {
    const char = input[index] ?? "";
    const next = input[index + 1] ?? "";

    if (state.inLineComment) {
      if (char === "\n") state.inLineComment = false;
      continue;
    }
    if (state.inBlockComment) {
      if (char === "*" && next === "/") {
        state.inBlockComment = false;
        index += 1;
      }
      continue;
    }

    if (state.inSingle) {
      if (!state.escaped && char === "'") state.inSingle = false;
      state.escaped = !state.escaped && char === "\\";
      continue;
    }
    if (state.inDouble) {
      if (!state.escaped && char === '"') state.inDouble = false;
      state.escaped = !state.escaped && char === "\\";
      continue;
    }
    if (state.inTemplate) {
      if (!state.escaped && char === "`") state.inTemplate = false;
      state.escaped = !state.escaped && char === "\\";
      continue;
    }

    if (char === "/" && next === "/") {
      state.inLineComment = true;
      index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      state.inBlockComment = true;
      index += 1;
      continue;
    }

    if (char === "'") {
      state.inSingle = true;
      state.escaped = false;
      continue;
    }
    if (char === '"') {
      state.inDouble = true;
      state.escaped = false;
      continue;
    }
    if (char === "`") {
      state.inTemplate = true;
      state.escaped = false;
      continue;
    }

    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;

    if (depth === 0) return index;
  }

  return -1;
}

function segmentizeJsLikeText(input: string): Segment[] {
  const state = createScanState();
  const segments: Segment[] = [];
  let kind: SegmentKind = "code";
  let buf = "";

  const flush = (): void => {
    if (!buf) return;
    segments.push({ kind, text: buf });
    buf = "";
  };

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index] ?? "";
    const next = input[index + 1] ?? "";

    if (kind === "comment") {
      buf += char;
      if (state.inLineComment) {
        if (char === "\n") {
          state.inLineComment = false;
          flush();
          kind = "code";
        }
      } else if (state.inBlockComment) {
        if (char === "*" && next === "/") {
          buf += next;
          index += 1;
          state.inBlockComment = false;
          flush();
          kind = "code";
        }
      }
      continue;
    }

    if (kind === "single_string") {
      buf += char;
      if (!state.escaped && char === "'") {
        state.inSingle = false;
        flush();
        kind = "code";
      }
      state.escaped = !state.escaped && char === "\\";
      continue;
    }

    if (kind === "double_string") {
      buf += char;
      if (!state.escaped && char === '"') {
        state.inDouble = false;
        flush();
        kind = "code";
      }
      state.escaped = !state.escaped && char === "\\";
      continue;
    }

    if (kind === "template_string") {
      buf += char;
      if (!state.escaped && char === "`") {
        state.inTemplate = false;
        flush();
        kind = "code";
      }
      state.escaped = !state.escaped && char === "\\";
      continue;
    }

    // code
    if (char === "/" && next === "/") {
      flush();
      kind = "comment";
      state.inLineComment = true;
      buf = "//";
      index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      flush();
      kind = "comment";
      state.inBlockComment = true;
      buf = "/*";
      index += 1;
      continue;
    }
    if (char === "'") {
      flush();
      kind = "single_string";
      state.inSingle = true;
      state.escaped = false;
      buf = "'";
      continue;
    }
    if (char === '"') {
      flush();
      kind = "double_string";
      state.inDouble = true;
      state.escaped = false;
      buf = '"';
      continue;
    }
    if (char === "`") {
      flush();
      kind = "template_string";
      state.inTemplate = true;
      state.escaped = false;
      buf = "`";
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
    if (segment.kind === "code") {
      // Quote simple unquoted keys: { foo: 1 } -> { "foo": 1 }
      return segment.text.replace(/(^|[{\s,])([A-Za-z_][A-Za-z0-9_]*)\s*:/g, "$1\"$2\":");
    }
    if (segment.kind === "single_string") {
      const inner = segment.text.slice(1, -1);
      // Best-effort safety: only convert simple single-quoted strings.
      if (!inner || inner.includes("\n") || inner.includes("\r") || inner.includes("\\") || inner.includes('"')) {
        return segment.text;
      }
      return `"${inner}"`;
    }
    return segment.text;
  });

  return normalized.join("");
}

function applyParamsJsonFix(prompt: string): string {
  const match = /\bparams\b\s*=\s*\{/i.exec(prompt);
  if (!match) return prompt;

  const objectStart = prompt.indexOf("{", match.index);
  if (objectStart === -1) return prompt;

  const objectEndInclusive = findMatchingBrace(prompt, objectStart);
  if (objectEndInclusive === -1) return prompt;

  const rawObjectText = prompt.slice(objectStart, objectEndInclusive + 1);
  const normalizedObjectText = normalizeParamsObject(rawObjectText);
  if (normalizedObjectText === rawObjectText) return prompt;

  return `${prompt.slice(0, objectStart)}${normalizedObjectText}${prompt.slice(objectEndInclusive + 1)}`;
}

const normalizeRegexFlags = (flags: string | undefined, forceGlobal: boolean): string => {
  const raw = (flags ?? "").trim();
  const allowed = new Set(["d", "g", "i", "m", "s", "u", "v", "y"]);
  const seen = new Set<string>();
  const normalized = Array.from(raw)
    .filter((ch: string) => allowed.has(ch))
    .filter((ch: string) => {
      if (seen.has(ch)) return false;
      seen.add(ch);
      return true;
    });
  if (forceGlobal && !seen.has("g")) normalized.push("g");
  const order = ["d", "g", "i", "m", "s", "u", "v", "y"];
  normalized.sort((a: string, b: string) => order.indexOf(a) - order.indexOf(b));
  return normalized.join("");
};

function applyAutofixOperation(prompt: string, operation: PromptAutofixOperation): string {
  if (operation.kind === "params_json") {
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
    const safeReplacement = replacement.replace(/\$/g, "$$");
    return prompt.replace(re, safeReplacement);
  } catch {
    return prompt;
  }
}

function getRuleById(rules: PromptValidationRule[], id: string): PromptValidationRule | null {
  return rules.find((rule: PromptValidationRule) => rule.id === id) ?? null;
}

export function formatProgrammaticPrompt(prompt: string, settings: PromptValidationSettings): FormatPromptResult {
  const mergedRules: PromptValidationRule[] = [
    ...settings.rules,
    ...(settings.learnedRules ?? []),
  ];
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
    if (rule && autofix?.enabled && Array.isArray(autofix.operations) && autofix.operations.length > 0) {
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
          applied.push({ ruleId: rule.id, operationKind: "replace" });
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
