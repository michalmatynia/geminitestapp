/**
 * Assignment Editor Helpers
 * 
 * Utility functions and constants for managing the Brain assignment editor.
 * Provides:
 * - Provider and vendor metadata mapping.
 * - Credential configuration helpers.
 * - Logic for filtering available model families.
 * - Type definitions for assignment state patches.
 */

import type { BrainModelDescriptor, BrainModelVendor } from '@/shared/contracts/ai-brain';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { SelectSimpleOption } from '@/shared/contracts/ui/controls';
import type { BrainModelFamily } from '@/shared/lib/ai-brain/settings';

import type { AiBrainAssignment, AiBrainProvider } from '../settings';

/** Patch handler function signature for updating assignment state. */
export type AssignmentPatchHandler = (patch: Partial<AiBrainAssignment>) => void;

/** Supported provider options for assignment selection. */
export const providerOptions: Array<LabeledOptionDto<AiBrainProvider>> = [
  { value: 'model', label: 'Model' },
  { value: 'agent', label: 'Agent' },
];

/** Maps model vendor keys to human-readable labels. */
export const VENDOR_LABELS: Record<BrainModelVendor, string> = {
  openai: 'GPT',
  anthropic: 'Claude',
  gemini: 'Gemini',
  ollama: 'Ollama',
};

/** Tailwind CSS class mapping for model vendor UI styling. */
export const VENDOR_COLORS: Record<BrainModelVendor, string> = {
  openai: 'border-emerald-600/60 text-emerald-300',
  anthropic: 'border-amber-600/60 text-amber-300',
  gemini: 'border-blue-600/60 text-blue-300',
  ollama: 'border-gray-600/60 text-gray-400',
};

/** API key format hints per model vendor. */
export const API_KEY_PLACEHOLDERS: Record<BrainModelVendor, string> = {
  openai: 'sk-...',
  anthropic: 'sk-ant-...',
  gemini: 'AIza...',
  ollama: '',
};

/**
 * Returns the active list of allowed providers.
 * If no providers are explicitly allowed, defaults to all available options.
 */
export const getActiveAllowedProviders = (
  allowedProviders: AiBrainProvider[] | undefined
): AiBrainProvider[] =>
  (allowedProviders !== undefined && allowedProviders.length > 0)
    ? allowedProviders
    : providerOptions.map((option) => option.value);

export const resolveProvider = (
  provider: AiBrainProvider,
  allowedProviders: readonly AiBrainProvider[]
): AiBrainProvider =>
  allowedProviders.includes(provider) ? provider : (allowedProviders[0] ?? 'model');

export const resolveSelectedVendor = (
  provider: AiBrainProvider,
  modelId: string,
  modelDescriptors: Record<string, BrainModelDescriptor>
): BrainModelVendor | null => {
  if (provider !== 'model') return null;
  return modelDescriptors[modelId]?.vendor ?? null;
};

/**
 * Filters the list of model quick-picks based on the selected model family.
 * Returns the original list if no family filter is applied.
 */
export const filterQuickPicksByFamily = (
  modelQuickPicks: SelectSimpleOption[],
  modelDescriptors: Record<string, BrainModelDescriptor>,
  modelFamily: BrainModelFamily | undefined
): SelectSimpleOption[] => {
  if (modelFamily === undefined) return modelQuickPicks;
  return modelQuickPicks.filter((option) => {
    const descriptor = modelDescriptors[option.value];
    return descriptor?.family === modelFamily;
  });
};
