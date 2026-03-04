/**
 * Prompt Exploder contract freeze for migration (2026-03-04).
 *
 * This file declares canonical identifiers and explicitly lists legacy aliases
 * that are still accepted during the migration window.
 */

export const PROMPT_EXPLODER_CANONICAL_VALIDATION_STACK_IDS = [
  'prompt-exploder',
  'case-resolver-prompt-exploder',
] as const;

export type PromptExploderCanonicalValidationStackId =
  (typeof PROMPT_EXPLODER_CANONICAL_VALIDATION_STACK_IDS)[number];

export const PROMPT_EXPLODER_LEGACY_VALIDATION_STACK_ALIASES = {
  prompt_exploder: 'prompt-exploder',
  case_resolver_prompt_exploder: 'case-resolver-prompt-exploder',
} as const;

export type PromptExploderLegacyValidationStackAlias =
  keyof typeof PROMPT_EXPLODER_LEGACY_VALIDATION_STACK_ALIASES;

export const PROMPT_EXPLODER_CANONICAL_RUNTIME_SCOPES = [
  'prompt_exploder',
  'case_resolver_prompt_exploder',
] as const;

export type PromptExploderCanonicalRuntimeScope =
  (typeof PROMPT_EXPLODER_CANONICAL_RUNTIME_SCOPES)[number];

export const PROMPT_EXPLODER_CANONICAL_BRIDGE_SOURCES = [
  'manual',
  'auto',
  'external',
  'draft',
  'template',
  'sequence',
  'qa_matrix',
  'prompt-exploder',
  'image-studio',
  'case-resolver',
] as const;

export type PromptExploderCanonicalBridgeSource =
  (typeof PROMPT_EXPLODER_CANONICAL_BRIDGE_SOURCES)[number];

export const PROMPT_EXPLODER_CANONICAL_BRIDGE_TARGETS = [
  'image-studio',
  'case-resolver',
  'external',
  'clipboard',
  'file',
  'prompt-exploder',
] as const;

export type PromptExploderCanonicalBridgeTarget =
  (typeof PROMPT_EXPLODER_CANONICAL_BRIDGE_TARGETS)[number];

export const PROMPT_EXPLODER_LEGACY_BRIDGE_SOURCE_ALIASES = {
  prompt_exploder: 'prompt-exploder',
} as const;

export type PromptExploderLegacyBridgeSourceAlias =
  keyof typeof PROMPT_EXPLODER_LEGACY_BRIDGE_SOURCE_ALIASES;

export const PROMPT_EXPLODER_LEGACY_BRIDGE_TARGET_ALIASES = {
  studio: 'image-studio',
  prompt_exploder: 'prompt-exploder',
} as const;

export type PromptExploderLegacyBridgeTargetAlias =
  keyof typeof PROMPT_EXPLODER_LEGACY_BRIDGE_TARGET_ALIASES;
