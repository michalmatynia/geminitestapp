import { z } from 'zod';

export const customCssAiConfigSchema = z.object({
  enabled: z.boolean(),
  model: z.string(),
  temperature: z.number(),
  maxTokens: z.number(),
  systemPrompt: z.string(),
});

export type CustomCssAiConfig = z.infer<typeof customCssAiConfigSchema>;

export const DEFAULT_CUSTOM_CSS_AI_CONFIG: CustomCssAiConfig = {
  enabled: true,
  model: 'gpt-4',
  temperature: 0.2,
  maxTokens: 1000,
  systemPrompt: 'You are a CSS expert AI assistant.',
};
