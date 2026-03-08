export type BrainProviderCredentialVendor = 'openai' | 'anthropic' | 'gemini';

export const BRAIN_PROVIDER_SETTING_KEYS = {
  openai: 'openai_api_key',
  anthropic: 'anthropic_api_key',
  gemini: 'gemini_api_key',
} as const satisfies Record<BrainProviderCredentialVendor, string>;

export const BRAIN_PROVIDER_SETTINGS_PATHS = {
  openai: 'ai_brain.providers.openai_api_key',
  anthropic: 'ai_brain.providers.anthropic_api_key',
  gemini: 'ai_brain.providers.gemini_api_key',
} as const satisfies Record<BrainProviderCredentialVendor, string>;

export const BRAIN_PROVIDER_ENV_KEYS = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  gemini: 'GEMINI_API_KEY',
} as const satisfies Record<BrainProviderCredentialVendor, string>;

export const BRAIN_PROVIDER_LABELS = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  gemini: 'Gemini',
} as const satisfies Record<BrainProviderCredentialVendor, string>;
