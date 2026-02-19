import type {
  CmsCssAiProviderDto,
  CmsCssAiConfigDto,
} from '@/shared/contracts/cms';

export type CustomCssAiProvider = CmsCssAiProviderDto;

export type CustomCssAiConfig = CmsCssAiConfigDto;

export const DEFAULT_CUSTOM_CSS_AI_CONFIG: CustomCssAiConfig = {
  provider: 'model',
  modelId: '',
  agentId: '',
  prompt: '',
};
