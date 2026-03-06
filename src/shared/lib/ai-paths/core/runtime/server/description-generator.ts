import 'server-only';

import type { ChatCompletionContentPart } from 'openai/resources/chat/completions';

import { runChatbotModel } from '@/shared/lib/ai/chatbot/server-model-runtime';
import { resolveBrainExecutionConfigForCapability } from '@/shared/lib/ai-brain/server';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

export interface ProductAiDescriptionResult {
  analysisInitial: string;
  analysisFinal: string;
  descriptionInitial: string;
  descriptionFinal: string;
  description: string;
  analysis: string;
  visionModel: string;
  generationModel: string;
  visionOutputEnabled: boolean;
  generationOutputEnabled: boolean;
  visionBrainApplied: unknown;
  generationBrainApplied: unknown;
}

const runBrainChatCompletion = async (input: {
  modelId: string;
  temperature: number;
  maxTokens: number;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string | ChatCompletionContentPart[];
  }>;
}) => {
  return runChatbotModel({
    messages: input.messages.map((message) => ({
      role: message.role,
      content: typeof message.content === 'string' ? message.content : '',
      images: Array.isArray(message.content)
        ? message.content
            .filter(
              (part): part is { type: 'image_url'; image_url: { url: string } } =>
                part.type === 'image_url'
            )
            .map((part) => part.image_url.url)
        : [],
    })),
    modelId: input.modelId,
    temperature: input.temperature,
    maxTokens: input.maxTokens,
    systemPrompt: '',
  });
};

const processPrompt = (
  template: string,
  primaryValue: string,
  secondaryValue: string,
  fallbackValue: string = ''
): { text: string; attachImages: boolean } => {
  let text = template
    .replace(/{{primary}}/g, primaryValue || fallbackValue)
    .replace(/{{secondary}}/g, secondaryValue || fallbackValue)
    .replace(/{{fallback}}/g, fallbackValue);

  const attachImages = text.includes('{{images}}');
  text = text.replace(/{{images}}/g, '');

  return { text: text.trim(), attachImages };
};

const DEFAULT_VISION_INPUT_PROMPT =
  'Analyze this product image and describe its key features, materials, and appearance. {{images}}';
const DEFAULT_GENERATION_INPUT_PROMPT =
  'Based on this product analysis: {{primary}}, write a compelling product description. {{images}}';

export const generateProductAiDescription = async (params: {
  productId: string;
  images: string[];
  visionInputPrompt?: string;
  visionOutputPrompt?: string;
  generationInputPrompt?: string;
  generationOutputPrompt?: string;
  options?: {
    visionEnabled?: boolean;
    generationEnabled?: boolean;
  };
}): Promise<ProductAiDescriptionResult> => {
  const isVisionEnabled = params.options?.visionEnabled !== false;
  const isGenerationEnabled = params.options?.generationEnabled !== false;

  const visionInputPrompt = params.visionInputPrompt || DEFAULT_VISION_INPUT_PROMPT;
  const generationInputPrompt = params.generationInputPrompt || DEFAULT_GENERATION_INPUT_PROMPT;

  const visionConfig = await resolveBrainExecutionConfigForCapability('product.description.vision');
  const generationConfig = await resolveBrainExecutionConfigForCapability(
    'product.description.generation'
  );

  const visionModel = visionConfig.modelId;
  const generationModel = generationConfig.modelId;

  const isVisionOutputEnabled = Boolean(params.visionOutputPrompt?.trim());
  const isGenerationOutputEnabled = Boolean(params.generationOutputPrompt?.trim());

  const processedImages = params.images.map(
    (url): ChatCompletionContentPart => ({
      type: 'image_url',
      image_url: { url },
    })
  );

  let analysisInitial = '';
  let analysisFinal = '';

  if (isVisionEnabled) {
    try {
      const prompt1_1 = processPrompt(visionInputPrompt, '', '');
      const content1_1: ChatCompletionContentPart[] = [{ type: 'text', text: prompt1_1.text }];
      if (prompt1_1.attachImages) content1_1.push(...processedImages);

      const completion = await runBrainChatCompletion({
        modelId: visionModel,
        temperature: visionConfig.temperature,
        maxTokens: visionConfig.maxTokens,
        messages: [
          { role: 'system', content: visionConfig.systemPrompt },
          { role: 'user', content: content1_1 },
        ],
      });
      analysisInitial = completion.message.trim() || '';

      if (isVisionOutputEnabled && params.visionOutputPrompt) {
        const prompt1_2 = processPrompt(
          params.visionOutputPrompt,
          analysisInitial,
          analysisInitial
        );
        const content1_2: ChatCompletionContentPart[] = [{ type: 'text', text: prompt1_2.text }];
        if (prompt1_2.attachImages) content1_2.push(...processedImages);

        const refineCompletion = await runBrainChatCompletion({
          modelId: visionModel,
          temperature: visionConfig.temperature,
          maxTokens: visionConfig.maxTokens,
          messages: [
            { role: 'system', content: visionConfig.systemPrompt },
            { role: 'user', content: content1_2 },
          ],
        });
        analysisFinal = refineCompletion.message.trim() || '';
      }
    } catch (error) {
      await ErrorSystem.captureException(error, {
        service: 'ai-paths-description-generator',
        action: 'vision_analysis',
        productId: params.productId,
      });
      if (!isGenerationEnabled) throw error;
    }
  }

  const visionResultForNext = analysisFinal || analysisInitial;
  let descriptionInitial = '';
  let descriptionFinal = '';

  if (isGenerationEnabled) {
    try {
      const prompt2_1 = processPrompt(
        generationInputPrompt,
        visionResultForNext,
        visionResultForNext
      );
      const content2_1: ChatCompletionContentPart[] = [{ type: 'text', text: prompt2_1.text }];
      if (prompt2_1.attachImages) content2_1.push(...processedImages);

      const genCompletion = await runBrainChatCompletion({
        modelId: generationModel,
        temperature: generationConfig.temperature,
        maxTokens: generationConfig.maxTokens,
        messages: [
          { role: 'system', content: generationConfig.systemPrompt },
          { role: 'user', content: content2_1 },
        ],
      });
      descriptionInitial = genCompletion.message.trim() || '';

      if (isGenerationOutputEnabled && params.generationOutputPrompt) {
        const prompt2_2 = processPrompt(
          params.generationOutputPrompt,
          descriptionInitial,
          visionResultForNext
        );
        const content2_2: ChatCompletionContentPart[] = [{ type: 'text', text: prompt2_2.text }];
        if (prompt2_2.attachImages) content2_2.push(...processedImages);

        const refineGenCompletion = await runBrainChatCompletion({
          modelId: generationModel,
          temperature: generationConfig.temperature,
          maxTokens: generationConfig.maxTokens,
          messages: [
            { role: 'system', content: generationConfig.systemPrompt },
            { role: 'user', content: content2_2 },
          ],
        });
        descriptionFinal = refineGenCompletion.message.trim() || '';
      }
    } catch (error) {
      await ErrorSystem.captureException(error, {
        service: 'ai-paths-description-generator',
        action: 'description_generation',
        productId: params.productId,
      });
      throw error;
    }
  }

  return {
    analysisInitial,
    analysisFinal,
    descriptionInitial,
    descriptionFinal,
    description: descriptionFinal || descriptionInitial,
    analysis: analysisFinal || analysisInitial,
    visionModel,
    generationModel,
    visionOutputEnabled: isVisionOutputEnabled,
    generationOutputEnabled: isGenerationOutputEnabled,
    visionBrainApplied: visionConfig.brainApplied,
    generationBrainApplied: generationConfig.brainApplied,
  };
};
