import 'server-only';

import type { ChatCompletionContentPart } from 'openai/resources/chat/completions';

import { resolveBrainExecutionConfigForCapability } from '@/shared/lib/ai-brain/server';
import { runChatbotModel } from '@/features/ai/chatbot/server-model-runtime';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

/**
 * AI-related settings that should be read from MongoDB when available
 */
const AI_SETTINGS_KEYS = new Set([
  'ai_vision_model',
  'ai_vision_user_prompt',
  'ai_vision_prompt',
  'ai_vision_output_enabled',
  'openai_model',
  'openai_api_key',
  'description_generation_user_prompt',
  'description_generation_prompt',
  'ai_generation_output_enabled',
]);

interface MongoSetting {
  _id: string;
  key?: string;
  value: string;
}

const canUsePrismaSettings = (): boolean =>
  Boolean(process.env['DATABASE_URL']) && 'setting' in prisma;

const readMongoSettingValue = async (key: string): Promise<string | null> => {
  if (!process.env['MONGODB_URI']) return null;
  const mongo = await getMongoDb();
  const doc = await mongo
    .collection<MongoSetting>('settings')
    .findOne({ $or: [{ _id: key }, { key }] });
  return typeof doc?.value === 'string' ? doc.value : null;
};

const readPrismaSettingValue = async (key: string): Promise<string | null> => {
  if (!canUsePrismaSettings()) return null;
  const setting = await prisma.setting.findUnique({
    where: { key },
    select: { value: true },
  });
  return setting?.value ?? null;
};

export async function getSettingValue(key: string): Promise<string | null> {
  const provider = await getAppDbProvider();
  const preferMongo =
    Boolean(process.env['MONGODB_URI']) && (provider === 'mongodb' || AI_SETTINGS_KEYS.has(key));

  if (preferMongo) {
    try {
      const mongoValue = await readMongoSettingValue(key);
      if (mongoValue !== null) return mongoValue;
    } catch (err) {
      void ErrorSystem.logWarning(`Mongo setting fetch failed for ${key}`, {
        service: 'ai-description-service',
        key,
        error: err,
      });
    }
    try {
      return await readPrismaSettingValue(key);
    } catch (err) {
      void ErrorSystem.logWarning(`Prisma setting fetch failed for ${key}`, {
        service: 'ai-description-service',
        key,
        error: err,
      });
    }
    return null;
  }

  try {
    const prismaValue = await readPrismaSettingValue(key);
    if (prismaValue !== null) return prismaValue;
  } catch (err) {
    void ErrorSystem.logWarning(`Prisma setting fetch failed for ${key}`, {
      service: 'ai-description-service',
      key,
      error: err,
    });
  }

  if (process.env['MONGODB_URI']) {
    try {
      return await readMongoSettingValue(key);
    } catch (err) {
      void ErrorSystem.logWarning(`Mongo fallback setting fetch failed for ${key}`, {
        service: 'ai-description-service',
        key,
        error: err,
      });
    }
  }

  return null;
}

/**
 * Interface for AI description generation results.
 */
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

/**
 * Internal helper to run a chat completion through the brain-assigned model.
 */
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
    messages: input.messages.map((m) => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : '',
      images: Array.isArray(m.content)
        ? m.content
          .filter(
            (p): p is { type: 'image_url'; image_url: { url: string } } => p.type === 'image_url'
          )
          .map((p) => p.image_url.url)
        : [],
    })),
    modelId: input.modelId,
    temperature: input.temperature,
    maxTokens: input.maxTokens,
    systemPrompt: '', // Already included in messages
  });
};

/**
 * Simple prompt processor that replaces placeholders with values.
 */
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

/**
 * Main service function to generate product descriptions using AI Vision and LLM.
 */
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

  // 1. Resolve Brain Configurations
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

  // --- Step 1: Vision Analysis ---
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
        service: 'aiDescriptionService',
        action: 'vision_analysis',
        productId: params.productId,
      });
      if (!isGenerationEnabled) throw error;
    }
  }

  // --- Step 2: Description Generation ---
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
        service: 'aiDescriptionService',
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

export const generateProductDescription = generateProductAiDescription;
