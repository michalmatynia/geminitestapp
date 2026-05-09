import type { BrainModelDescriptor, BrainModelVendor } from '@/shared/contracts/ai-brain';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { SelectSimpleOption } from '@/shared/contracts/ui/controls';
import { inferBrainModelVendor } from '@/shared/lib/ai-brain/model-vendor';
import type { BrainModelFamily } from '@/shared/lib/ai-brain/settings';

import type { AiBrainAssignment, AiBrainProvider } from '../settings';

export type AssignmentPatchHandler = (patch: Partial<AiBrainAssignment>) => void;

export const providerOptions: Array<LabeledOptionDto<AiBrainProvider>> = [
  { value: 'model', label: 'Model' },
  { value: 'agent', label: 'Agent' },
];

export const VENDOR_LABELS: Record<BrainModelVendor, string> = {
  openai: 'GPT',
  anthropic: 'Claude',
  gemini: 'Gemini',
  ollama: 'Ollama',
};

export const VENDOR_COLORS: Record<BrainModelVendor, string> = {
  openai: 'border-emerald-600/60 text-emerald-300',
  anthropic: 'border-amber-600/60 text-amber-300',
  gemini: 'border-blue-600/60 text-blue-300',
  ollama: 'border-gray-600/60 text-gray-400',
};

export const API_KEY_PLACEHOLDERS: Record<BrainModelVendor, string> = {
  openai: 'sk-...',
  anthropic: 'sk-ant-...',
  gemini: 'AIza...',
  ollama: '',
};

export const getActiveAllowedProviders = (
  allowedProviders: AiBrainProvider[] | undefined
): AiBrainProvider[] =>
  allowedProviders !== undefined && allowedProviders.length > 0
    ? allowedProviders
    : providerOptions.map((option) => option.value);

export const filterQuickPicksByFamily = (
  modelQuickPicks: SelectSimpleOption[],
  modelDescriptors: Record<string, BrainModelDescriptor>,
  modelFamily: BrainModelFamily | undefined
): SelectSimpleOption[] => {
  if (modelFamily === undefined) return modelQuickPicks;
  return modelQuickPicks.filter((option) => {
    const descriptor = modelDescriptors[option.value];
    return descriptor === undefined || descriptor.family === modelFamily;
  });
};

export const resolveProvider = (
  assignmentProvider: AiBrainProvider,
  activeAllowedProviders: AiBrainProvider[]
): AiBrainProvider =>
  activeAllowedProviders.includes(assignmentProvider)
    ? assignmentProvider
    : (activeAllowedProviders[0] ?? assignmentProvider);

export const resolveSelectedVendor = (
  resolvedProvider: AiBrainProvider,
  modelId: string
): BrainModelVendor | null =>
  resolvedProvider === 'model' && modelId.trim().length > 0 ? inferBrainModelVendor(modelId) : null;
