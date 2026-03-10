import { type ProductWithImages } from '@/shared/contracts/products';

import { pickProductName } from './product-studio-service.helpers';

export const buildGenerationPrompt = (product: ProductWithImages): string => {
  const productName = pickProductName(product);
  return `Create a high-quality e-commerce studio image for "${productName}". Keep the exact product identity, shape, color, texture, and branding. Use clean neutral lighting and background. No text or watermark.`;
};

export const buildModelNativeSequencePrompt = (params: {
  basePrompt: string;
  sequenceStepTypes: string[];
}): string => {
  if (params.sequenceStepTypes.length === 0) {
    return params.basePrompt;
  }
  const sequencePlan = params.sequenceStepTypes
    .map((stepType, index) => `${index + 1}. ${stepType}`)
    .join('\n');
  return `${params.basePrompt}

Apply this sequence plan in one model-native pass:
${sequencePlan}

Return only the final post-produced image output.`;
};
