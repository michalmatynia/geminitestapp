/**
 * AI Brain Provider Metadata
 * 
 * Metadata and configuration for AI provider integrations.
 * Provides:
 * - Provider credential vendor types
 * - Settings key mappings
 * - Settings path definitions
 * - Provider labels and identifiers
 * - Multi-provider configuration
 */

/**
 * Valid AI vendors that require API key credentials.
 */
export type BrainProviderCredentialVendor = 'openai' | 'anthropic' | 'gemini';

/**
 * Flat setting keys for each provider's API key.
 */
export const BRAIN_PROVIDER_SETTING_KEYS = {
  openai: 'openai_api_key',
  anthropic: 'anthropic_api_key',
  gemini: 'gemini_api_key',
} as const satisfies Record<BrainProviderCredentialVendor, string>;

/**
 * Full settings paths (dot notation) for each provider's API key.
 */
export const BRAIN_PROVIDER_SETTINGS_PATHS = {
  openai: 'ai_brain.providers.openai_api_key',
  anthropic: 'ai_brain.providers.anthropic_api_key',
  gemini: 'ai_brain.providers.gemini_api_key',
} as const satisfies Record<BrainProviderCredentialVendor, string>;

/**
 * Human-readable labels for each provider.
 */
export const BRAIN_PROVIDER_LABELS = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  gemini: 'Gemini',
} as const satisfies Record<BrainProviderCredentialVendor, string>;
