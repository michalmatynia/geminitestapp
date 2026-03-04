/**
 * Prompt Exploder contract freeze for migration (2026-03-04).
 *
 * This file declares canonical identifiers only.
 */

export const PROMPT_EXPLODER_CANONICAL_VALIDATION_STACK_IDS = [
  'prompt-exploder',
  'case-resolver-prompt-exploder',
] as const;

export type PromptExploderCanonicalValidationStackId =
  (typeof PROMPT_EXPLODER_CANONICAL_VALIDATION_STACK_IDS)[number];

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
