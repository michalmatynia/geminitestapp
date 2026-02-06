export type CustomCssAiProvider = 'model' | 'agent';

export interface CustomCssAiConfig {
  provider?: CustomCssAiProvider;
  modelId?: string;
  agentId?: string;
  prompt?: string;
}

export const DEFAULT_CUSTOM_CSS_AI_CONFIG: CustomCssAiConfig = {
  provider: 'model',
  modelId: '',
  agentId: '',
  prompt: '',
};
