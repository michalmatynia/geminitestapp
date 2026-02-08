import 'server-only';

import fs from 'fs/promises';
import path from 'path';

import OpenAI from 'openai';

import { getImageFileRepository } from '@/features/files/server';
import { ErrorSystem } from '@/features/observability/server';
import {
  badRequestError,
  configurationError,
  operationFailedError,
} from '@/shared/errors/app-error';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';
import type { ImageFileRecord } from '@/shared/types/files';

import type { ProductFormData } from '../types/forms';
import type { ChatCompletionContentPart } from 'openai/resources/chat/completions';

const OLLAMA_BASE_URL = process.env["OLLAMA_BASE_URL"] || 'http://localhost:11434';

// AI-related settings that should be read from MongoDB when available
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
  Boolean(process.env["DATABASE_URL"]) && 'setting' in prisma;

const readMongoSettingValue = async (key: string): Promise<string | null> => {
  if (!process.env["MONGODB_URI"]) return null;
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
    Boolean(process.env["MONGODB_URI"]) &&
    (provider === 'mongodb' || AI_SETTINGS_KEYS.has(key));

  if (preferMongo) {
    try {
      const mongoValue = await readMongoSettingValue(key);
      if (mongoValue !== null) return mongoValue;
    } catch (err) {
      void ErrorSystem.logWarning(`Mongo setting fetch failed for ${key}`, {
        service: 'ai-description-service',
        key,
        error: err
      });
    }
    try {
      return await readPrismaSettingValue(key);
    } catch (err) {
      void ErrorSystem.logWarning(`Prisma setting fetch failed for ${key}`, {
        service: 'ai-description-service',
        key,
        error: err
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
      error: err
    });
  }

  if (process.env["MONGODB_URI"]) {
    try {
      return await readMongoSettingValue(key);
    } catch (err) {
      void ErrorSystem.logWarning(`Mongo fallback setting fetch failed for ${key}`, {
        service: 'ai-description-service',
        key,
        error: err
      });
    }
  }

  return null;
}

function getClient(
  modelName: string,
  apiKey: string | null,
): { openai: OpenAI; isOllama: boolean } {
  // Check if it's a real OpenAI model (not gpt-oss or other Ollama variants)
  const modelLower = modelName.toLowerCase();
  const isOpenAI =
    (modelLower.startsWith('gpt-') && !modelLower.includes('oss')) ||
    modelLower.startsWith('ft:gpt-') ||
    modelLower.startsWith('o1-');

  if (isOpenAI) {
    if (!apiKey) {
      throw configurationError('OpenAI API key is missing for GPT model.');
    }
    return { openai: new OpenAI({ apiKey }), isOllama: false };
  }

  // All other models use Ollama
  return {
    openai: new OpenAI({
      baseURL: `${OLLAMA_BASE_URL}/v1`,
      apiKey: 'ollama',
    }),
    isOllama: true,
  };
}

interface GenerateProductDescriptionResult {
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
}

export async function generateProductDescription(params: {
  productData: ProductFormData;
  imageUrls?: string[] | undefined;
  visionOutputEnabled?: boolean | undefined;
  generationOutputEnabled?: boolean | undefined;
}): Promise<GenerateProductDescriptionResult> {
  const {
    productData,
    imageUrls = [],
    visionOutputEnabled,
    generationOutputEnabled,
  } = params;

  if (!productData?.name_en) {
    throw badRequestError('Product name is required', { field: 'name_en' });
  }

  const [
    apiKeySetting,
    visionModelSetting,
    visionInputPromptSetting,
    visionOutputPromptSetting,
    visionOutputEnabledSetting,
    generationModelSetting,
    generationInputPromptSetting,
    generationOutputPromptSetting,
    generationOutputEnabledSetting,
  ] = await Promise.all([
    getSettingValue('openai_api_key'),
    getSettingValue('ai_vision_model'),
    getSettingValue('ai_vision_user_prompt'),
    getSettingValue('ai_vision_prompt'),
    getSettingValue('ai_vision_output_enabled'),
    getSettingValue('openai_model'),
    getSettingValue('description_generation_user_prompt'),
    getSettingValue('description_generation_prompt'),
    getSettingValue('ai_generation_output_enabled'),
  ]);

  const apiKey = apiKeySetting ?? process.env["OPENAI_API_KEY"] ?? null;
  const visionModel = visionModelSetting?.trim() || 'gemma3:27b';
  const visionInputPrompt =
    visionInputPromptSetting?.trim() || 'Analyze these product images...';
  const visionOutputPrompt = visionOutputPromptSetting?.trim() || '';
  const isVisionOutputEnabled =
    visionOutputEnabled !== undefined
      ? visionOutputEnabled
      : visionOutputEnabledSetting === 'true';

  const generationModel = generationModelSetting?.trim() || 'qwen3-vl:30b';
  const generationInputPrompt =
    generationInputPromptSetting?.trim() ||
    'Generate description for [name_en]';
  const generationOutputPrompt = generationOutputPromptSetting?.trim() || '';
  const isGenerationOutputEnabled =
    generationOutputEnabled !== undefined
      ? generationOutputEnabled
      : generationOutputEnabledSetting === 'true';

  const processPrompt = (
    text: string,
    currentResult: string = '',
    analysisResult: string = '',
    descriptionInitial: string = '',
  ): { text: string; attachImages: boolean } => {
    let processed = text;
    const hasImagesPlaceholder = processed.includes('[images]');
    processed = processed.replace(/\[analysis\]/g, analysisResult);
    processed = processed.replace(/\[imageAnalysis\]/g, analysisResult);
    processed = processed.replace(/\[description\]/g, descriptionInitial);
    processed = processed.replace(/\[result\]/g, currentResult);
    processed = processed.replace(/\[initialResult\]/g, currentResult);
    processed = processed.replace(/\[images\]/g, '');

    if (productData) {
      for (const key in productData) {
        if (Object.prototype.hasOwnProperty.call(productData, key)) {
          const value = productData[key as keyof ProductFormData];
          if (value !== null && value !== undefined) {
            const stringValue =
              typeof value === 'object' ? JSON.stringify(value) : String(value);
            processed = processed.replace(
              new RegExp(`\\[${key}\\]`, 'g'),
              stringValue,
            );
          }
        }
      }
    }
    return { text: processed.trim(), attachImages: hasImagesPlaceholder };
  };

  let processedImages: ChatCompletionContentPart[] = [];
  if (imageUrls.length > 0) {
    const imageFileRepository = await getImageFileRepository();
    const imageFiles = await imageFileRepository.listImageFiles();
    const imageFileMap = new Map(
      imageFiles.map((file: ImageFileRecord) => [file.filepath, file]),
    );

    const imagePromises = imageUrls.map(async (item: string) => {
      try {
        let base64Image: string;
        let mimetype: string = 'image/jpeg';
        if (item.startsWith('http')) {
          const res = await fetch(item);
          if (!res.ok) {
            void ErrorSystem.logWarning(`Failed to fetch image URL: ${item}`, {
              service: 'ai-description-service',
              status: res.status,
              statusText: res.statusText
            });
            return null;
          }
          const buffer = Buffer.from(await res.arrayBuffer());
          base64Image = buffer.toString('base64');
          mimetype = res.headers.get('content-type') || 'image/jpeg';
        } else {
          const imagePath = path.join(process.cwd(), 'public', item);
          const buffer = await fs.readFile(imagePath);
          base64Image = buffer.toString('base64');
          const record = imageFileMap.get(item);
          if (record) mimetype = record.mimetype;
        }
        return {
          type: 'image_url' as const,
          image_url: { url: `data:${mimetype};base64,${base64Image}` },
        } as ChatCompletionContentPart;
      } catch (err) {
        void ErrorSystem.logWarning(`Failed to process image: ${item}`, {
          service: 'ai-description-service',
          error: err
        });
        return null;
      }
    });
    processedImages = (await Promise.all(imagePromises)).filter(
      (img: ChatCompletionContentPart | null): img is ChatCompletionContentPart => img !== null,
    );
  }

  let analysisInitial = '';
  let analysisFinal = '';
  const { openai: visionClient, isOllama: isVisionOllama } = getClient(
    visionModel,
    apiKey,
  );

  try {
    const prompt1_1 = processPrompt(visionInputPrompt);
    const content1_1: ChatCompletionContentPart[] = [
      { type: 'text', text: prompt1_1.text },
    ];
    if (prompt1_1.attachImages) content1_1.push(...processedImages);

    const visionCompletion = await visionClient.chat.completions.create({
      model: visionModel,
      messages: [
        { role: 'system', content: 'You are an AI assistant.' },
        { role: 'user', content: content1_1 },
      ],
      max_tokens: 500,
    });
    analysisInitial =
      visionCompletion.choices[0]?.message.content?.trim() || '';

    if (isVisionOutputEnabled && visionOutputPrompt) {
      const prompt1_2 = processPrompt(
        visionOutputPrompt,
        analysisInitial,
        analysisInitial,
      );
      const content1_2: ChatCompletionContentPart[] = [
        { type: 'text', text: prompt1_2.text },
      ];
      if (prompt1_2.attachImages) content1_2.push(...processedImages);
      const refineCompletion = await visionClient.chat.completions.create({
        model: visionModel,
        messages: [
          { role: 'system', content: 'You are an AI assistant.' },
          { role: 'user', content: content1_2 },
        ],
        max_tokens: 500,
      });
      analysisFinal =
        refineCompletion.choices[0]?.message.content?.trim() || '';
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const isConnectionError =
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('fetch failed') ||
      errorMessage.includes('failed to fetch');

    if (isVisionOllama && isConnectionError) {
      throw operationFailedError(
        `Description generation failed: Could not connect to Ollama server at ${OLLAMA_BASE_URL}. Please ensure the Ollama server is running and accessible.`,
        undefined,
        {
          originalError: errorMessage,
          url: OLLAMA_BASE_URL,
          model: visionModel,
        },
      );
    }
    throw error;
  }

  const visionResultForNext = analysisFinal || analysisInitial;
  const { openai: generationClient, isOllama: isGenerationOllama } = getClient(
    generationModel,
    apiKey,
  );
  let descriptionInitial = '';
  let descriptionFinal = '';

  try {
    const prompt2_1 = processPrompt(
      generationInputPrompt,
      visionResultForNext,
      visionResultForNext,
    );
    const content2_1: ChatCompletionContentPart[] = [
      { type: 'text', text: prompt2_1.text },
    ];
    if (prompt2_1.attachImages) content2_1.push(...processedImages);
    const genCompletion = await generationClient.chat.completions.create({
      model: generationModel,
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: content2_1 },
      ],
      max_tokens: 1000,
    });
    descriptionInitial =
      genCompletion.choices[0]?.message.content?.trim() || '';

    if (isGenerationOutputEnabled && generationOutputPrompt) {
      const prompt2_2 = processPrompt(
        generationOutputPrompt,
        descriptionInitial,
        visionResultForNext,
        descriptionInitial,
      );
      const content2_2: ChatCompletionContentPart[] = [
        { type: 'text', text: prompt2_2.text },
      ];
      if (prompt2_2.attachImages) content2_2.push(...processedImages);
      const refineGenCompletion =
        await generationClient.chat.completions.create({
          model: generationModel,
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: content2_2 },
          ],
          max_tokens: 1000,
        });
      descriptionFinal =
        refineGenCompletion.choices[0]?.message.content?.trim() || '';
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const isConnectionError =
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('fetch failed') ||
      errorMessage.includes('failed to fetch');

    if (isGenerationOllama && isConnectionError) {
      throw operationFailedError(
        `Description generation failed: Could not connect to Ollama server at ${OLLAMA_BASE_URL}. Please ensure the Ollama server is running and accessible.`,
        undefined,
        {
          originalError: errorMessage,
          url: OLLAMA_BASE_URL,
          model: generationModel,
        },
      );
    }
    throw error;
  }

  return {
    analysisInitial,
    analysisFinal,
    descriptionInitial,
    descriptionFinal,
    description: descriptionFinal || descriptionInitial,
    analysis: analysisFinal || analysisInitial,
    // Include model information for job tracking
    visionModel,
    generationModel,
    visionOutputEnabled: isVisionOutputEnabled,
    generationOutputEnabled: isGenerationOutputEnabled,
  };
}
