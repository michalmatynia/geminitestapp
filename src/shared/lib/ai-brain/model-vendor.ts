import type { BrainModelVendor } from '@/shared/contracts/ai-brain';

const normalizeModelPrefix = (
  modelId: string
): { vendor: BrainModelVendor | null; modelId: string } => {
  const trimmed = modelId.trim();
  const match = trimmed.match(/^(openai|ollama|anthropic|gemini)\s*[:/]\s*(.+)$/i);
  if (!match) {
    return {
      vendor: null,
      modelId: trimmed,
    };
  }
  const vendorRaw = match[1]?.toLowerCase() ?? '';
  const normalizedModelId = match[2]?.trim() ?? '';
  if (
    vendorRaw !== 'openai' &&
    vendorRaw !== 'ollama' &&
    vendorRaw !== 'anthropic' &&
    vendorRaw !== 'gemini'
  ) {
    return {
      vendor: null,
      modelId: trimmed,
    };
  }
  return {
    vendor: vendorRaw,
    modelId: normalizedModelId,
  };
};

export const normalizeBrainModelId = (modelId: string): string =>
  normalizeModelPrefix(modelId).modelId;

export const inferBrainModelVendor = (modelId: string): BrainModelVendor => {
  const prefixed = normalizeModelPrefix(modelId);
  if (prefixed.vendor) return prefixed.vendor;

  const normalized = prefixed.modelId.toLowerCase();
  if (
    (normalized.startsWith('gpt-') && !normalized.includes('oss')) ||
    normalized.startsWith('ft:gpt-') ||
    normalized.startsWith('o1-') ||
    normalized.startsWith('o3-') ||
    normalized.startsWith('o4-') ||
    normalized.startsWith('chatgpt-')
  ) {
    return 'openai';
  }
  if (normalized.startsWith('claude-')) {
    return 'anthropic';
  }
  if (normalized.startsWith('gemini-') || normalized.startsWith('models/gemini-')) {
    return 'gemini';
  }
  return 'ollama';
};
