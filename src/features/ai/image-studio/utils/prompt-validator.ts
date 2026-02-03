import { extractParamsFromPrompt } from "./prompt-params";
import type { PromptValidationRule, PromptValidationSettings, PromptValidationSeverity, PromptValidationSimilarPattern } from "./studio-settings";

export type PromptValidationSuggestion = {
  suggestion: string;
  found?: string;
  comment?: string | null;
};

export type PromptValidationIssue = {
  ruleId: string;
  severity: PromptValidationSeverity;
  title: string;
  message: string;
  suggestions: PromptValidationSuggestion[];
};

function compileRegex(pattern: string, flags: string | undefined): RegExp | null {
  try {
    return new RegExp(pattern, flags);
  } catch {
    return null;
  }
}

function findSuggestions(prompt: string, rule: Pick<PromptValidationRule, "similar">): PromptValidationSuggestion[] {
  const suggestions: PromptValidationSuggestion[] = [];

  (rule.similar ?? []).forEach((sim: PromptValidationSimilarPattern) => {
    const re = compileRegex(sim.pattern, sim.flags);
    if (!re) return;
    const match = re.exec(prompt);
    if (!match) return;
    suggestions.push({
      suggestion: sim.suggestion,
      found: match[0],
      comment: sim.comment ?? null,
    });
  });

  return suggestions;
}

function formatSeverityLabel(severity: PromptValidationSeverity): string {
  if (severity === "error") return "Error";
  if (severity === "warning") return "Warning";
  return "Info";
}

export function validateProgrammaticPrompt(
  prompt: string,
  settings: PromptValidationSettings
): PromptValidationIssue[] {
  if (!settings.enabled) return [];
  if (!prompt.trim()) return [];

  const rules: PromptValidationRule[] = [
    ...settings.rules,
    ...(settings.learnedRules ?? []),
  ];

  const issues: PromptValidationIssue[] = [];

  rules.forEach((rule: PromptValidationRule) => {
    if (!rule.enabled) return;

    if (rule.kind === "regex") {
      const re = compileRegex(rule.pattern, rule.flags);
      if (!re) {
        issues.push({
          ruleId: rule.id,
          severity: "warning",
          title: rule.title,
          message: `Invalid regex in rule "${rule.title}".`,
          suggestions: [],
        });
        return;
      }

      if (re.test(prompt)) return;

      issues.push({
        ruleId: rule.id,
        severity: rule.severity,
        title: rule.title,
        message: rule.message,
        suggestions: findSuggestions(prompt, rule),
      });
      return;
    }

    if (rule.kind === "params_object") {
      const result = extractParamsFromPrompt(prompt);
      if (result.ok) return;

      const suggestions = findSuggestions(prompt, rule);

      // Add a few built-in suggestions based on common failure modes.
      if (result.error.includes("Could not find `params = {")) {
        suggestions.push({
          suggestion:
            "Add a `params = { ... }` block (JSON-like: double-quoted keys/strings).",
        });
      } else if (result.error.includes("unbalanced braces")) {
        suggestions.push({
          suggestion: "Fix the `{}` braces in the params object (they must be balanced).",
        });
      } else if (result.error.includes("Failed to parse params")) {
        suggestions.push({
          suggestion:
            "Ensure the params object is JSON-parseable: use double quotes for keys/strings and avoid JS-only syntax.",
        });
        suggestions.push({
          suggestion:
            "Example: `\"output_profile\": \"ecommerce_strict\"` (not `output_profile: 'ecommerce_strict'`).",
        });
      }

      issues.push({
        ruleId: rule.id,
        severity: rule.severity,
        title: rule.title,
        message: `${rule.message} (${formatSeverityLabel(rule.severity)}: ${result.error})`,
        suggestions,
      });
    }
  });

  return issues;
}
