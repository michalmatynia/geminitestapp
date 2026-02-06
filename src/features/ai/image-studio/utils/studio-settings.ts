import { z } from "zod";

export const IMAGE_STUDIO_SETTINGS_KEY = "image_studio_settings";

export type ImageStudioSettings = {
  version: 1;
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

const imageStudioSettingsSchema: z.ZodType<ImageStudioSettings> = z
  .object({
    version: z.literal(1).optional().default(1),
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
  });

export function parseImageStudioSettings(raw: string | null | undefined): ImageStudioSettings {
  if (!raw) return defaultImageStudioSettings;
  try {
    const parsed = JSON.parse(raw) as unknown;
    const result = imageStudioSettingsSchema.safeParse(parsed);
    if (!result.success) return defaultImageStudioSettings;
    return result.data;
  } catch {
    return defaultImageStudioSettings;
  }
}
