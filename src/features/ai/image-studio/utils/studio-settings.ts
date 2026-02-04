import { z } from "zod";

export const IMAGE_STUDIO_SETTINGS_KEY = "image_studio_settings";

export type PromptValidationSeverity = "error" | "warning" | "info";

export type PromptValidationSimilarPattern = {
  pattern: string;
  flags?: string | undefined;
  suggestion: string;
  comment?: string | null;
};

export type PromptAutofixOperation =
  | {
      kind: "replace";
      pattern: string;
      flags?: string | undefined;
      replacement: string;
      comment?: string | null;
    }
  | {
      kind: "params_json";
      comment?: string | null;
    };

export type PromptAutofixConfig = {
  enabled: boolean;
  operations: PromptAutofixOperation[];
};

export type PromptValidationRule =
  | {
      kind: "regex";
      id: string;
      enabled: boolean;
      severity: PromptValidationSeverity;
      title: string;
      description: string | null;
      pattern: string;
      flags: string;
      message: string;
      similar: PromptValidationSimilarPattern[];
      autofix?: PromptAutofixConfig | undefined;
    }
  | {
      kind: "params_object";
      id: string;
      enabled: boolean;
      severity: PromptValidationSeverity;
      title: string;
      description: string | null;
      message: string;
      similar: PromptValidationSimilarPattern[];
      autofix?: PromptAutofixConfig | undefined;
    };

export type PromptValidationSettings = {
  enabled: boolean;
  rules: PromptValidationRule[];
  learnedRules?: PromptValidationRule[];
};

export const defaultPromptValidationRules: PromptValidationRule[] = [
  {
    kind: "params_object",
    id: "params.object",
    enabled: true,
    severity: "error",
    title: "Params block",
    description:
      "Required for programmatic extraction. The params object must be JSON-parseable (quoted keys/strings).",
    message: "Prompt must include a valid `params = { ... }` object for extraction.",
    similar: [
      { pattern: "param\\s*=\\s*\\{", flags: "i", suggestion: "Use `params = {` (plural) instead of `param = {`.", comment: null },
      { pattern: "params\\s*:\\s*\\{", flags: "i", suggestion: "Use `params = {` (assignment) instead of `params: {`.", comment: null },
      { pattern: "parameters\\s*=\\s*\\{", flags: "i", suggestion: "Use `params = {` instead of `parameters = {`.", comment: null },
    ],
    autofix: {
      enabled: true,
      operations: [
        { kind: "replace", pattern: "\\bparam\\s*[:=]\\s*\\{", flags: "i", replacement: "params = {", comment: null },
        { kind: "replace", pattern: "\\bparameters\\s*[:=]\\s*\\{", flags: "i", replacement: "params = {", comment: null },
        { kind: "replace", pattern: "\\bparams\\s*[:=]\\s*\\{", flags: "i", replacement: "params = {", comment: "Normalizes casing/spaces so extraction can find `params = {`." },
        { kind: "params_json", comment: "Attempts to convert the params object into strict JSON (quoted keys/strings)." },
      ],
    },
  },
  {
    kind: "regex",
    id: "section.role",
    enabled: true,
    severity: "warning",
    title: "ROLE section",
    description: "Helps keep prompts consistent and readable.",
    pattern: "^##\\s+ROLE\\b",
    flags: "mi",
    message: "Missing `## ROLE` section heading.",
    similar: [
      { pattern: "^#+\\s*Role\\b", flags: "mi", suggestion: "Rename to `## ROLE`.", comment: null },
      { pattern: "^##\\s*ROL\\b", flags: "mi", suggestion: "Fix typo to `## ROLE`.", comment: null },
    ],
    autofix: {
      enabled: true,
      operations: [
        { kind: "replace", pattern: "^#+\\s*role\\b.*$", flags: "mi", replacement: "## ROLE", comment: null },
        { kind: "replace", pattern: "^#+\\s*rol\\b.*$", flags: "mi", replacement: "## ROLE", comment: null },
      ],
    },
  },
  {
    kind: "regex",
    id: "section.non_negotiable_goal",
    enabled: true,
    severity: "warning",
    title: "NON-NEGOTIABLE GOAL section",
    description: "Encouraged structure for strict editing prompts.",
    pattern: "^##\\s+NON-NEGOTIABLE\\s+GOAL\\b",
    flags: "mi",
    message: "Missing `## NON-NEGOTIABLE GOAL` section heading.",
    similar: [
      { pattern: "^##\\s+NON\\s*NEGOTIABLE\\s+GOAL\\b", flags: "mi", suggestion: "Use hyphenated `## NON-NEGOTIABLE GOAL`.", comment: null },
      { pattern: "^#+\\s*Non[-\\s]?negotiable\\b", flags: "mi", suggestion: "Rename to `## NON-NEGOTIABLE GOAL`.", comment: null },
    ],
    autofix: {
      enabled: true,
      operations: [
        { kind: "replace", pattern: "^#+\\s*non\\s*negotiable\\s+goal\\b.*$", flags: "mi", replacement: "## NON-NEGOTIABLE GOAL", comment: null },
        { kind: "replace", pattern: "^#+\\s*non[-\\s]?negotiable\\b.*$", flags: "mi", replacement: "## NON-NEGOTIABLE GOAL", comment: null },
      ],
    },
  },
  {
    kind: "regex",
    id: "section.params",
    enabled: true,
    severity: "warning",
    title: "PARAMS section",
    description: "Expected to wrap the params block so it’s easy to find.",
    pattern: "^##\\s+PARAMS\\b",
    flags: "mi",
    message: "Missing `## PARAMS` section heading.",
    similar: [
      { pattern: "^##\\s*PARAM\\b", flags: "mi", suggestion: "Rename to `## PARAMS`.", comment: null },
      { pattern: "^#+\\s*Params\\b", flags: "mi", suggestion: "Rename to `## PARAMS`.", comment: null },
    ],
    autofix: {
      enabled: true,
      operations: [
        { kind: "replace", pattern: "^#+\\s*param\\b.*$", flags: "mi", replacement: "## PARAMS", comment: null },
        { kind: "replace", pattern: "^#+\\s*params\\b.*$", flags: "mi", replacement: "## PARAMS", comment: null },
      ],
    },
  },
  {
    kind: "regex",
    id: "section.final_qa",
    enabled: true,
    severity: "info",
    title: "FINAL QA section",
    description: "Optional, but helps ensure the prompt includes a clear QA checklist.",
    pattern: "^##\\s+FINAL\\s+QA\\b",
    flags: "mi",
    message: "Missing `## FINAL QA` section heading.",
    similar: [
      { pattern: "^#+\\s*QA\\b", flags: "mi", suggestion: "Rename to `## FINAL QA`.", comment: null },
    ],
    autofix: {
      enabled: true,
      operations: [
        { kind: "replace", pattern: "^#+\\s*qa\\b.*$", flags: "mi", replacement: "## FINAL QA", comment: null },
      ],
    },
  },
];

export type ImageStudioSettings = {
  version: 1;
  promptValidation: PromptValidationSettings;
  promptExtraction: {
    mode: "programmatic" | "gpt";
    gpt: {
      model: string;
      temperature: number | null;
      top_p: number | null;
      max_output_tokens: number | null;
    };
  };
  uiExtractor: {
    mode: "heuristic" | "ai" | "both";
    model: string;
    temperature: number | null;
    max_output_tokens: number | null;
  };
  targetAi: {
    provider: "openai";
    openai: {
      api: "responses" | "images";
      model: string;
      temperature: number | null;
      top_p: number | null;
      max_output_tokens: number | null;
      presence_penalty: number | null;
      frequency_penalty: number | null;
      seed: number | null;
      user: string | null;
      stream: boolean;
      reasoning_effort: "low" | "medium" | "high" | null;
      response_format: "text" | "json" | null;
      tool_choice: "auto" | "none" | null;
      image: {
        size: string | null;
        quality: "standard" | "high" | null;
        background: "transparent" | "white" | null;
        format: "png" | "jpeg" | null;
        n: number | null;
      };
      advanced_overrides: Record<string, unknown> | null;
    };
  };
};

export const defaultImageStudioSettings: ImageStudioSettings = {
  version: 1,
  promptValidation: {
    enabled: true,
    rules: defaultPromptValidationRules,
    learnedRules: [],
  },
  promptExtraction: {
    mode: "programmatic",
    gpt: {
      model: "gpt-4o-mini",
      temperature: null,
      top_p: null,
      max_output_tokens: null,
    },
  },
  uiExtractor: {
    mode: "heuristic",
    model: "gpt-4o-mini",
    temperature: 0.2,
    max_output_tokens: 800,
  },
  targetAi: {
    provider: "openai",
    openai: {
      api: "images",
      model: "gpt-image-1",
      temperature: null,
      top_p: null,
      max_output_tokens: null,
      presence_penalty: null,
      frequency_penalty: null,
      seed: null,
      user: null,
      stream: false,
      reasoning_effort: null,
      response_format: "text",
      tool_choice: null,
      image: {
        size: null,
        quality: null,
        background: null,
        format: "png",
        n: 1,
      },
      advanced_overrides: null,
    },
  },
};

const finiteNumberOrNull = z.number().finite().nullable().optional().default(null);
const intOrNull = z.number().int().nullable().optional().default(null);
const nonEmptyStringOrNull = z.string().trim().min(1).nullable().optional().default(null);

const promptValidationSeveritySchema = z.enum(["error", "warning", "info"]);
const promptValidationSimilarSchema: z.ZodType<PromptValidationSimilarPattern> = z
  .object({
    pattern: z.string().trim().min(1),
    flags: z.string().trim().optional(),
    suggestion: z.string().trim().min(1),
    comment: z.string().trim().min(1).nullable().optional().default(null),
  })
  .strict();

const promptAutofixOperationSchema: z.ZodType<PromptAutofixOperation> = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("replace"),
      pattern: z.string().trim().min(1),
      flags: z.string().trim().optional(),
      replacement: z.string(),
      comment: z.string().trim().min(1).nullable().optional().default(null),
    })
    .strict(),
  z
    .object({
      kind: z.literal("params_json"),
      comment: z.string().trim().min(1).nullable().optional().default(null),
    })
    .strict(),
]);

const promptAutofixSchema: z.ZodType<PromptAutofixConfig> = z
  .object({
    enabled: z.boolean().optional().default(true),
    operations: z.array(promptAutofixOperationSchema).optional().default([]),
  })
  .strict();

const promptValidationRuleSchema: z.ZodType<PromptValidationRule> = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("regex"),
      id: z.string().trim().min(1),
      enabled: z.boolean().optional().default(true),
      severity: promptValidationSeveritySchema.optional().default("warning"),
      title: z.string().trim().min(1),
      description: z.string().trim().min(1).nullable().optional().default(null),
      pattern: z.string().trim().min(1),
      flags: z.string().trim().optional().default("mi"),
      message: z.string().trim().min(1),
      similar: z.array(promptValidationSimilarSchema).optional().default([]),
      autofix: promptAutofixSchema.optional().default({ enabled: true, operations: [] }),
    })
    .strict(),
  z
    .object({
      kind: z.literal("params_object"),
      id: z.string().trim().min(1),
      enabled: z.boolean().optional().default(true),
      severity: promptValidationSeveritySchema.optional().default("error"),
      title: z.string().trim().min(1),
      description: z.string().trim().min(1).nullable().optional().default(null),
      message: z.string().trim().min(1),
      similar: z.array(promptValidationSimilarSchema).optional().default([]),
      autofix: promptAutofixSchema.optional().default({ enabled: true, operations: [] }),
    })
    .strict(),
]);

const promptValidationSettingsSchema: z.ZodType<PromptValidationSettings> = z
  .object({
    enabled: z.boolean().optional().default(defaultImageStudioSettings.promptValidation.enabled),
    rules: z.array(promptValidationRuleSchema).optional().default(defaultImageStudioSettings.promptValidation.rules),
    learnedRules: z.array(promptValidationRuleSchema).optional().default([]),
  })
  .strict();

const imageStudioSettingsSchema: z.ZodType<ImageStudioSettings> = z
  .object({
    version: z.literal(1).optional().default(1),
    promptValidation: promptValidationSettingsSchema.optional().default(defaultImageStudioSettings.promptValidation),
    promptExtraction: z
      .object({
        mode: z.enum(["programmatic", "gpt"]).optional().default("programmatic"),
        gpt: z
          .object({
            model: z.string().trim().min(1).optional().default(defaultImageStudioSettings.promptExtraction.gpt.model),
            temperature: finiteNumberOrNull,
            top_p: finiteNumberOrNull,
            max_output_tokens: intOrNull,
          })
          .optional()
          .default(defaultImageStudioSettings.promptExtraction.gpt),
      })
      .optional()
      .default(defaultImageStudioSettings.promptExtraction),
    uiExtractor: z
      .object({
        mode: z.enum(["heuristic", "ai", "both"]).optional().default(defaultImageStudioSettings.uiExtractor.mode),
        model: z.string().trim().min(1).optional().default(defaultImageStudioSettings.uiExtractor.model),
        temperature: finiteNumberOrNull,
        max_output_tokens: intOrNull,
      })
      .optional()
      .default(defaultImageStudioSettings.uiExtractor),
    targetAi: z
      .object({
        provider: z.literal("openai").optional().default("openai"),
        openai: z
          .object({
            api: z.enum(["responses", "images"]).optional().default(defaultImageStudioSettings.targetAi.openai.api),
            model: z.string().trim().min(1).optional().default(defaultImageStudioSettings.targetAi.openai.model),
            temperature: finiteNumberOrNull,
            top_p: finiteNumberOrNull,
            max_output_tokens: intOrNull,
            presence_penalty: finiteNumberOrNull,
            frequency_penalty: finiteNumberOrNull,
            seed: intOrNull,
            user: nonEmptyStringOrNull,
            stream: z.boolean().optional().default(defaultImageStudioSettings.targetAi.openai.stream),
            reasoning_effort: z.enum(["low", "medium", "high"]).nullable().optional().default(null),
            response_format: z.enum(["text", "json"]).nullable().optional().default(defaultImageStudioSettings.targetAi.openai.response_format),
            tool_choice: z.enum(["auto", "none"]).nullable().optional().default(null),
            image: z
              .object({
                size: nonEmptyStringOrNull,
                quality: z.enum(["standard", "high"]).nullable().optional().default(null),
                background: z.enum(["transparent", "white"]).nullable().optional().default(null),
                format: z.enum(["png", "jpeg"]).nullable().optional().default(defaultImageStudioSettings.targetAi.openai.image.format),
                n: z.number().int().min(1).nullable().optional().default(defaultImageStudioSettings.targetAi.openai.image.n),
              })
              .optional()
              .default(defaultImageStudioSettings.targetAi.openai.image),
            advanced_overrides: z.record(z.string(), z.any()).nullable().optional().default(null),
          })
          .optional()
          .default(defaultImageStudioSettings.targetAi.openai),
      })
      .optional()
      .default(defaultImageStudioSettings.targetAi),
  })
  .strict();

export function parseImageStudioSettings(raw: string | null | undefined): ImageStudioSettings {
  if (!raw) return defaultImageStudioSettings;
  try {
    const parsed = JSON.parse(raw) as unknown;
    const result = imageStudioSettingsSchema.safeParse(parsed);
    if (!result.success) return defaultImageStudioSettings;

    const rawRules = (parsed && typeof parsed === "object" && !Array.isArray(parsed))
      ? (parsed as Record<string, unknown>)?.promptValidation
      : null;
    const rawRulesArray =
      rawRules && typeof rawRules === "object" && !Array.isArray(rawRules)
        ? (rawRules as Record<string, unknown>)?.rules
        : null;
    const hadAutofixInStorage = Array.isArray(rawRulesArray)
      ? rawRulesArray.some((rule: unknown) => Boolean(rule) && typeof rule === "object" && "autofix" in (rule as Record<string, unknown>))
      : false;

    if (hadAutofixInStorage) return result.data;

    const defaultById = new Map(defaultPromptValidationRules.map((rule: PromptValidationRule) => [rule.id, rule]));
    const mergedRules = result.data.promptValidation.rules.map((rule: PromptValidationRule) => {
      const defaults = defaultById.get(rule.id);
      if (!defaults?.autofix || defaults.autofix.operations.length === 0) return rule;
      const needsAutofix =
        !rule.autofix ||
        !Array.isArray(rule.autofix.operations) ||
        rule.autofix.operations.length === 0;
      return needsAutofix ? { ...rule, autofix: defaults.autofix } : rule;
    });

    return {
      ...result.data,
      promptValidation: {
        ...result.data.promptValidation,
        rules: mergedRules,
        learnedRules: result.data.promptValidation.learnedRules ?? [],
      },
    };
  } catch {
    return defaultImageStudioSettings;
  }
}

export function parsePromptValidationRules(raw: string): { ok: true; rules: PromptValidationRule[] } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(raw) as unknown;
    const result = z.array(promptValidationRuleSchema).safeParse(parsed);
    if (result.success) {
      const hadAutofix = Array.isArray(parsed)
        ? parsed.some((rule: unknown) => Boolean(rule) && typeof rule === "object" && "autofix" in (rule as Record<string, unknown>))
        : false;
      if (hadAutofix) return { ok: true, rules: result.data };

      const defaultById = new Map(defaultPromptValidationRules.map((rule: PromptValidationRule) => [rule.id, rule]));
      const mergedRules = result.data.map((rule: PromptValidationRule) => {
        const defaults = defaultById.get(rule.id);
        if (!defaults?.autofix || defaults.autofix.operations.length === 0) return rule;
        const needsAutofix =
          !rule.autofix ||
          !Array.isArray(rule.autofix.operations) ||
          rule.autofix.operations.length === 0;
        return needsAutofix ? { ...rule, autofix: defaults.autofix } : rule;
      });

      return { ok: true, rules: mergedRules };
    }
    return { ok: false, error: "Invalid rules shape. Expected an array of rule objects." };
  } catch {
    return { ok: false, error: "Invalid JSON." };
  }
}
