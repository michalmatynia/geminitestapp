export type ModelCostProfile = {
  imageUsdPerImage: number;
  inputUsdPer1KTokens: number;
};

export type GenerationCostEstimate = {
  currency: 'USD';
  estimated: true;
  promptTokens: number;
  promptCostUsdTotal: number;
  promptCostUsdPerOutput: number;
  imageCostUsdPerOutput: number;
  totalCostUsdPerOutput: number;
  outputCount: number;
};

const CHARS_PER_TOKEN_ESTIMATE = 4;

const DEFAULT_MODEL_COST_PROFILE: ModelCostProfile = {
  imageUsdPerImage: 0.03,
  inputUsdPer1KTokens: 0.004,
};

const MODEL_COST_PROFILES: Array<{ prefix: string; profile: ModelCostProfile }> = [
  { prefix: 'gpt-image-1', profile: { imageUsdPerImage: 0.04, inputUsdPer1KTokens: 0.006 } },
  { prefix: 'gpt-5.2', profile: { imageUsdPerImage: 0.05, inputUsdPer1KTokens: 0.01 } },
  { prefix: 'gpt-5', profile: { imageUsdPerImage: 0.045, inputUsdPer1KTokens: 0.009 } },
  { prefix: 'gpt-4.1-mini', profile: { imageUsdPerImage: 0.02, inputUsdPer1KTokens: 0.003 } },
  { prefix: 'gpt-4.1', profile: { imageUsdPerImage: 0.028, inputUsdPer1KTokens: 0.005 } },
  { prefix: 'gpt-4o-mini', profile: { imageUsdPerImage: 0.018, inputUsdPer1KTokens: 0.0025 } },
  { prefix: 'gpt-4o', profile: { imageUsdPerImage: 0.026, inputUsdPer1KTokens: 0.0045 } },
  { prefix: 'dall-e-3', profile: { imageUsdPerImage: 0.08, inputUsdPer1KTokens: 0.0 } },
  { prefix: 'dall-e-2', profile: { imageUsdPerImage: 0.02, inputUsdPer1KTokens: 0.0 } },
];

export const estimatePromptTokens = (prompt: string): number => {
  const trimmed = prompt.trim();
  if (!trimmed) return 0;
  return Math.max(1, Math.ceil(trimmed.length / CHARS_PER_TOKEN_ESTIMATE));
};

export const resolveModelCostProfile = (model: string): ModelCostProfile => {
  const normalizedModel = model.trim().toLowerCase();
  if (!normalizedModel) return DEFAULT_MODEL_COST_PROFILE;
  const matched = MODEL_COST_PROFILES.find(({ prefix }) =>
    normalizedModel.startsWith(prefix)
  );
  return matched ? matched.profile : DEFAULT_MODEL_COST_PROFILE;
};

const roundUsd = (value: number): number => Number(value.toFixed(6));

export const estimateGenerationCost = (params: {
  prompt: string;
  model: string;
  outputCount: number;
}): GenerationCostEstimate => {
  const outputCount = Math.max(1, Math.floor(params.outputCount || 1));
  const promptTokens = estimatePromptTokens(params.prompt);
  const profile = resolveModelCostProfile(params.model);
  const promptCostUsdTotal = (promptTokens / 1000) * profile.inputUsdPer1KTokens;
  const promptCostUsdPerOutput = promptCostUsdTotal / outputCount;
  const imageCostUsdPerOutput = profile.imageUsdPerImage;
  const totalCostUsdPerOutput = imageCostUsdPerOutput + promptCostUsdPerOutput;
  return {
    currency: 'USD',
    estimated: true,
    promptTokens,
    promptCostUsdTotal: roundUsd(promptCostUsdTotal),
    promptCostUsdPerOutput: roundUsd(promptCostUsdPerOutput),
    imageCostUsdPerOutput: roundUsd(imageCostUsdPerOutput),
    totalCostUsdPerOutput: roundUsd(totalCostUsdPerOutput),
    outputCount,
  };
};
