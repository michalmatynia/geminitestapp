import 'server-only';

import fs from 'fs/promises';
import path from 'path';

import { ObjectId } from 'mongodb';
import OpenAI from 'openai';

import { runDatabaseSync, type DatabaseSyncDirection } from '@/features/database/server';
import type { ImageFileRecord } from '@/features/files/server';
import { getImageFileRepository } from '@/features/files/server';
import { listBaseListingsForSync, syncBaseImagesForListing } from '@/features/integrations/services/base-image-sync';
import { defaultLanguages } from '@/features/internationalization/server';
import { getInternationalizationProvider } from '@/features/internationalization/services/internationalization-provider';
import type { ProductAiJobRecord } from '@/features/jobs/types/product-ai-job-repository';
import { ErrorSystem } from '@/features/observability/server';
import {
  generateProductDescription,
  getProductRepository,
  getSettingValue,
  translateProduct,
} from '@/features/products/server';
import { buildImageBase64Slots } from '@/features/products/services/image-base64';
import type { ProductFormData } from '@/features/products/types/forms';
import {
  badRequestError,
  configurationError,
  notFoundError,
  operationFailedError,
} from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

import type { ChatCompletionContentPart } from 'openai/resources/chat/completions';

type LanguageRecord = {
  id: string;
  code: string;
  name: string;
};

export type JobPayload = {
  isTest?: boolean;
  productData?: ProductFormData;
  imageUrls?: string[];
  visionOutputEnabled?: boolean;
  generationOutputEnabled?: boolean;
  languageIds?: string[];
  prompt?: string;
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
  vision?: boolean;
  source?: string;
  graph?: Record<string, unknown>;
  direction?: DatabaseSyncDirection;
  skipAuthCollections?: boolean;
  [key: string]: unknown;
};

export type Job = ProductAiJobRecord & {
  payload: JobPayload;
};

const OLLAMA_BASE_URL = process.env['OLLAMA_BASE_URL'] || 'http://localhost:11434';

const getClient = (modelName: string, apiKey: string | null): { openai: OpenAI; isOllama: boolean } => {
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

  return {
    openai: new OpenAI({
      baseURL: `${OLLAMA_BASE_URL}/v1`,
      apiKey: 'ollama',
    }),
    isOllama: true
  };
};

const buildImageParts = async (imageUrls: string[]): Promise<ChatCompletionContentPart[]> => {
  if (!imageUrls.length) return [] as ChatCompletionContentPart[];
  const imageFileRepository = await getImageFileRepository();
  const imageFiles = await imageFileRepository.listImageFiles();
  const imageFileMap = new Map<string, ImageFileRecord>(imageFiles.map((file: ImageFileRecord) => [file.filepath, file]));

  const imagePromises = imageUrls.map(async (item: string): Promise<ChatCompletionContentPart | null> => {
    try {
      let base64Image: string;
      let mimetype = 'image/jpeg';
      if (item.startsWith('http')) {
        const res = await fetch(item);
        if (!res.ok) return null;
        const buffer = Buffer.from(await res.arrayBuffer());
        base64Image = buffer.toString('base64');
        mimetype = res.headers.get('content-type') || 'image/jpeg';
      } else {
        const normalized = item.startsWith('/') ? item.slice(1) : item;
        const imagePath = path.join(process.cwd(), 'public', normalized);
        const buffer = await fs.readFile(imagePath);
        base64Image = buffer.toString('base64');
        const record = imageFileMap.get(item);
        if (record) mimetype = record.mimetype;
      }
      return {
        type: 'image_url' as const,
        image_url: { url: `data:${mimetype};base64,${base64Image}` },
      };
    } catch {
      return null;
    }
  });

  return (await Promise.all(imagePromises)).filter(
    (img: ChatCompletionContentPart | null): img is Extract<ChatCompletionContentPart, { type: 'image_url' }> => Boolean(img)
  );
};

export async function processGraphModel(job: Job): Promise<Record<string, unknown>> {
  const { payload, productId } = job;
  const prompt = typeof payload.prompt === 'string' ? payload.prompt.trim() : '';
  if (!prompt) {
    throw badRequestError('Graph model job missing prompt', { jobId: job.id });
  }
  const requestedModelId =
    typeof payload.modelId === 'string' ? payload.modelId.trim() : '';
  const visionFallback = (await getSettingValue('ai_vision_model'))?.trim() || '';
  const textFallback = (await getSettingValue('openai_model'))?.trim() || '';
  let modelId =
    requestedModelId ||
    (payload.vision ? visionFallback : textFallback) ||
    (payload.vision ? 'gemma3:27b' : 'gpt-4o');
  const temperature =
    typeof payload.temperature === 'number' ? payload.temperature : 0.7;
  const maxTokens =
    typeof payload.maxTokens === 'number' ? payload.maxTokens : 800;
  const imageUrls = Array.isArray(payload.imageUrls)
    ? payload.imageUrls.filter((url: unknown): url is string => typeof url === 'string' && url.trim() !== '')
    : [];
  const attachImages = Boolean(payload.vision) && imageUrls.length > 0;
  const apiKey = (await getSettingValue('openai_api_key')) ?? process.env['OPENAI_API_KEY'] ?? null;
  const modelLower = modelId.toLowerCase();
  const isOpenAIModel =
    (modelLower.startsWith('gpt-') && !modelLower.includes('oss')) ||
    modelLower.startsWith('ft:gpt-') ||
    modelLower.startsWith('o1-');
  if (isOpenAIModel && !apiKey) {
    const fallback = visionFallback || 'gemma3:27b';
    modelId = fallback;
  }
  const { openai: client, isOllama } = getClient(modelId, apiKey);
  const content: ChatCompletionContentPart[] = [{ type: 'text', text: prompt }];
  if (attachImages) {
    const imageParts = await buildImageParts(imageUrls);
    content.push(...imageParts);
  }

  try {
    const completion = await client.chat.completions.create({
      model: modelId,
      messages: [
        { role: 'system', content: 'You are an AI assistant.' },
        { role: 'user', content },
      ],
      temperature,
      max_tokens: maxTokens,
    });
    const resultText = completion.choices[0]?.message.content?.trim() || '';
    return {
      result: resultText,
      modelId,
      prompt,
      imageUrls,
      temperature,
      maxTokens,
      source: payload.source ?? 'ai_paths',
      graph: payload.graph ?? undefined,
      productId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isConnectionError = errorMessage.includes('ECONNREFUSED') ||
                             errorMessage.includes('fetch failed') ||
                             errorMessage.includes('failed to fetch');

    if (isOllama && isConnectionError) {
      throw operationFailedError(
        `AI Path Node failed: Could not connect to Ollama server at ${OLLAMA_BASE_URL}. Please ensure the Ollama server is running and accessible.`,
        undefined,
        { originalError: errorMessage, url: OLLAMA_BASE_URL, model: modelId }
      );
    }
    throw error;
  }
}

export async function processDatabaseSync(job: Job): Promise<Record<string, unknown>> {
  const direction = job.payload.direction ?? 'mongo_to_prisma';
  return runDatabaseSync(direction, {
    skipAuthCollections: Boolean(job.payload.skipAuthCollections),
  });
}

export async function processBase64ConvertAll(job: Job): Promise<Record<string, unknown>> {
  const productRepo = await getProductRepository();
  const pageSize = typeof job.payload['pageSize'] === 'number' ? job.payload['pageSize'] : 100;
  let page = 1;
  let requested = 0;
  let succeeded = 0;
  let failed = 0;

  for (;;) {
    const products = await productRepo.getProducts({
      page: page,
      pageSize: pageSize,
    });
    if (!products.length) break;
    requested += products.length;

    for (const product of products) {
      try {
        const { imageBase64s, imageLinks } = await buildImageBase64Slots(product);
        await productRepo.updateProduct(product.id, { imageBase64s, imageLinks });
        succeeded += 1;
      } catch {
        failed += 1;
      }
    }

    if (products.length < pageSize) break;
    page += 1;
  }

  return {
    collections: [
      {
        name: 'products',
        requested,
        succeeded,
        failed,
      },
    ],
    requested,
    succeeded,
    failed,
    pageSize,
    source: job.payload.source ?? 'base64_all',
  };
}

export async function processBaseImageSyncAll(job: Job): Promise<Record<string, unknown>> {
  const listings = await listBaseListingsForSync();
  const requested = listings.length;
  let succeeded = 0;
  let failed = 0;

  for (const listing of listings) {
    try {
      await syncBaseImagesForListing(listing.id, listing.productId, listing.inventoryId ?? null);
      succeeded += 1;
    } catch {
      failed += 1;
    }
  }

  return {
    collections: [
      {
        name: 'base_image_sync',
        requested,
        succeeded,
        failed,
      },
    ],
    requested,
    succeeded,
    failed,
    source: job.payload.source ?? 'base_image_sync_all',
  };
}

const normalizeLanguageDoc = (doc: Record<string, unknown>): LanguageRecord | null => {
  const rawId = doc['id'] ?? doc['_id'];
  const rawCode = doc['code'] ?? doc['languageCode'] ?? doc['isoCode'];
  const rawName = doc['name'] ?? doc['languageName'];

  const id = typeof rawId === 'string' ? rawId : (typeof rawId === 'number' ? String(rawId) : '');
  const code = typeof rawCode === 'string' ? rawCode.trim() : (typeof rawCode === 'number' ? String(rawCode) : '');
  const name = typeof rawName === 'string' ? rawName.trim() : (typeof rawName === 'number' ? String(rawName) : '');

  if (!id || !code || !name) return null;
  return { id, code, name };
};

const normalizeIdValue = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (value instanceof ObjectId) return value.toString();
  return '';
};

const fetchLanguagesByIds = async (ids: string[]): Promise<LanguageRecord[]> => {
  const normalizedIds = ids.map((id: string) => normalizeIdValue(id)).filter(Boolean);
  if (!normalizedIds.length) return [];
  const provider = await getInternationalizationProvider();
  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    const objectIds = normalizedIds
      .filter((id: string) => ObjectId.isValid(id))
      .map((id: string) => new ObjectId(id));
    const docs = await mongo
      .collection<Record<string, unknown>>('languages')
      .find({
        $or: [
          ...(objectIds.length ? [{ _id: { $in: Array.from(objectIds) } }] : []),
          { id: { $in: normalizedIds } },
          { code: { $in: normalizedIds } },
        ],
      })
      .toArray();
    return docs.map((doc: Record<string, unknown>) => normalizeLanguageDoc(doc)).filter(Boolean) as LanguageRecord[];
  }
  const languages = await prisma.language.findMany({
    where: { id: { in: normalizedIds } },
  });
  return languages.map((lang: { id: string; code: string; name: string }) => ({
    id: lang.id,
    code: lang.code,
    name: lang.name,
  }));
};

const fetchAllLanguages = async (): Promise<LanguageRecord[]> => {
  const provider = await getInternationalizationProvider();
  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    const docs = await mongo
      .collection<Record<string, unknown>>('languages')
      .find({})
      .toArray();
    return docs.map((doc: Record<string, unknown>) => normalizeLanguageDoc(doc)).filter(Boolean) as LanguageRecord[];
  }
  const languages = await prisma.language.findMany();
  return languages.map((lang: { id: string; code: string; name: string }) => ({
    id: lang.id,
    code: lang.code,
    name: lang.name,
  }));
};

const resolveFallbackLanguages = async (): Promise<string[]> => {
  const allLanguages = await fetchAllLanguages();
  try {
    const { logSystemEvent } = await import('@/features/observability/server');
    void logSystemEvent({
      level: 'info',
      source: 'product-ai-processors',
      message: `Found ${allLanguages.length} available languages`,
      context: { count: allLanguages.length }
    });
  } catch {
    console.log(`[processTranslation] Found ${allLanguages.length} available languages`);
  }
  const filtered = allLanguages.filter((lang: LanguageRecord) => lang.code.toUpperCase() !== 'EN');
  if (filtered.length > 0) {
    return filtered.map((lang: LanguageRecord) => lang.name);
  }
  const defaults = defaultLanguages
    .filter((lang: { code: string }) => lang.code !== 'EN')
    .map((lang: { name: string }) => lang.name);
  try {
    const { logSystemEvent } = await import('@/features/observability/server');
    void logSystemEvent({
      level: 'info',
      source: 'product-ai-processors',
      message: 'Using default languages fallback',
      context: { defaults }
    });
  } catch {
    console.log('[processTranslation] Using default languages fallback:', defaults);
  }
  return defaults;
};

export async function processDescriptionGeneration(job: Job): Promise<{ description: string }> {
  const { productId, payload } = job;

  let productData: ProductFormData;
  let allImageUrls: string[];

  if (payload.productData && payload.isTest) {
    const rawData = payload.productData;
    productData = {
      name_en: rawData.name_en || '',
      name_pl: rawData.name_pl || '',
      name_de: rawData.name_de || '',
      description_en: rawData.description_en || '',
      description_pl: rawData.description_pl || '',
      description_de: rawData.description_de || '',
      sku: rawData.sku || '',
      price: rawData.price || 0,
      stock: rawData.stock || 0,
      ean: rawData.ean || '',
      gtin: rawData.gtin || '',
      asin: rawData.asin || '',
      supplierName: rawData.supplierName || '',
      supplierLink: rawData.supplierLink || '',
      priceComment: rawData.priceComment || '',
      weight: rawData.weight || 0,
      sizeLength: rawData.sizeLength || 0,
      sizeWidth: rawData.sizeWidth || 0,
      length: rawData.length || 0,
      baseProductId: rawData.baseProductId || '',
      defaultPriceGroupId: rawData.defaultPriceGroupId || '',
      imageLinks: rawData.imageLinks || [],
      imageBase64s: rawData.imageBase64s || [],
      parameters: (rawData.parameters as Array<{ parameterId: string; value: string | null; }> | undefined) || [],
    };
    allImageUrls = payload.imageUrls || [];
  } else {
    const productRepository = await getProductRepository();
    const product = await productRepository.getProductById(productId);

    if (!product) {
      void ErrorSystem.logWarning(`Product not found for ID: "${productId}" (possibly a SKU)`, {
        service: 'product-ai-queue',
        productId
      });
      throw notFoundError('Product not found', { productId });
    }

    productData = {
      name_en: product.name_en || '',
      name_pl: product.name_pl || '',
      name_de: product.name_de || '',
      description_en: product.description_en || '',
      description_pl: product.description_pl || '',
      description_de: product.description_de || '',
      sku: product.sku || '',
      price: product.price || 0,
      stock: product.stock || 0,
      ean: product.ean || '',
      gtin: product.gtin || '',
      asin: product.asin || '',
      supplierName: product.supplierName || '',
      supplierLink: product.supplierLink || '',
      priceComment: product.priceComment || '',
      weight: product.weight || 0,
      sizeLength: product.sizeLength || 0,
      sizeWidth: product.sizeWidth || 0,
      length: product.length || 0,
      baseProductId: product.baseProductId || '',
      defaultPriceGroupId: product.defaultPriceGroupId || '',
      imageLinks: product.imageLinks || [],
      imageBase64s: product.imageBase64s || [],
      parameters: product.parameters || [],
    };

    const uploadedImages = product.images
      .map((img: { imageFile?: { filepath: string } }) => img.imageFile?.filepath)
      .filter((p: string | undefined): p is string => Boolean(p));
    const rawExternalImages = product.imageLinks || [];
    const externalImages = rawExternalImages.filter((url: string) => url && url.trim().length > 0);
    const uploadedSet = new Set(uploadedImages);
    const uniqueExternalImages = externalImages.filter((url: string) => !uploadedSet.has(url));
    allImageUrls = [...uploadedImages, ...uniqueExternalImages];
  }

  const result = await generateProductDescription({
    productData,
    imageUrls: allImageUrls,
    visionOutputEnabled: payload.visionOutputEnabled,
    generationOutputEnabled: payload.generationOutputEnabled
  });

  if (!payload.isTest) {
    const productRepository = await getProductRepository();
    await productRepository.updateProduct(productId, {
      description_en: result.description,
    });
  }

  return result;
}

export async function processTranslation(job: Job): Promise<Record<string, unknown>> {
  const { productId } = job;

  const productRepository = await getProductRepository();
  const product = await productRepository.getProductById(productId);

  if (!product) {
    void ErrorSystem.logWarning(`Product not found for ID: "${productId}"`, {
      service: 'product-ai-queue-translation',
      productId
    });
    throw notFoundError('Product not found', { productId });
  }

  const sourceLanguage = 'English';
  const sourceName = product.name_en || '';
  const sourceDescription = product.description_en || '';

  if (!sourceName && !sourceDescription) {
    throw badRequestError('Product has no English name or description to translate from', {
      productId,
    });
  }

  let targetLanguages: string[] = [];

  if (product.catalogs && product.catalogs.length > 0) {
    const firstCatalog = product.catalogs[0] as unknown as { catalog?: { id: string; name: string; languageIds?: string[] } };
    const hasEmbeddedCatalog = firstCatalog?.catalog && typeof firstCatalog.catalog === 'object';

    if (hasEmbeddedCatalog) {
      const languageSet = new Set<string>();
      for (const catalogAssignment of (product.catalogs as unknown as { catalog: { id: string; name: string; languageIds?: string[] } }[])) {
        const catalog = catalogAssignment.catalog;
        if (catalog.languageIds && Array.isArray(catalog.languageIds)) {
          const languages = await fetchLanguagesByIds(catalog.languageIds);
          languages.forEach((lang: LanguageRecord) => {
            if (lang.code.toUpperCase() !== 'EN') {
              languageSet.add(lang.name);
            }
          });
        }
      }
      targetLanguages = Array.from(languageSet);
    } else {
      let catalogIds: string[] = [];
      if (Array.isArray(product.catalogs)) {
        catalogIds = product.catalogs.map((c: { catalogId?: string; catalog?: { id: string } }) => {
          return c.catalogId || c.catalog?.id;
        }).filter((id: string | undefined): id is string => Boolean(id));
      }

      if (catalogIds.length === 0) {
        throw badRequestError('Product has catalog assignments but no valid catalog IDs found', {
          productId,
        });
      }

      const catalogs = await prisma.catalog.findMany({
        where: { id: { in: catalogIds } },
        include: {
          languages: {
            include: {
              language: true
            }
          }
        }
      });

      const languageSet = new Set<string>();
      catalogs.forEach((catalog: { languages: { language: { name: string; code: string } }[] }) => {
        catalog.languages.forEach((cl: { language: { name: string; code: string } }) => {
          if (cl.language.code.toUpperCase() !== 'EN') {
            languageSet.add(cl.language.name);
          }
        });
      });
      targetLanguages = Array.from(languageSet);
    }
  } else {
    targetLanguages = await resolveFallbackLanguages();
  }

  if (targetLanguages.length === 0) {
    targetLanguages = await resolveFallbackLanguages();
  }

  if (targetLanguages.length === 0) {
    throw badRequestError(
      'No target languages to translate to. Either assign the product to a catalog with languages, or add languages to the Product Settings.',
      { productId }
    );
  }

  const result = await translateProduct({
    productId,
    sourceLanguage,
    targetLanguages,
    productName: sourceName,
    productDescription: sourceDescription,
  });

  const updateData: Record<string, string> = {};
  for (const [langName, translation] of Object.entries(result.translations)) {
    const nameLower = langName.toLowerCase();
    if (nameLower === 'polish' || nameLower === 'pl' || nameLower.includes('polsk')) {
      updateData['name_pl'] = translation.name;
      updateData['description_pl'] = translation.description;
    } else if (nameLower === 'german' || nameLower === 'de' || nameLower.includes('deutsch')) {
      updateData['name_de'] = translation.name;
      updateData['description_de'] = translation.description;
    } else if (nameLower === 'english' || nameLower === 'en') {
      updateData['name_en'] = translation.name;
      updateData['description_en'] = translation.description;
    }
  }

  if (updateData && Object.keys(updateData).length > 0) {
    await productRepository.updateProduct(productId, updateData);
  }

  return result as unknown as Record<string, unknown>;
}

export async function dispatchProductAiJob(job: Job): Promise<unknown> {
  switch (job.type) {
    case 'description_generation':
      return processDescriptionGeneration(job);
    case 'translation':
      return processTranslation(job);
    case 'graph_model':
      return processGraphModel(job);
    case 'db_sync':
      return processDatabaseSync(job);
    case 'base64_all':
      return processBase64ConvertAll(job);
    case 'base_images_sync_all':
      return processBaseImageSyncAll(job);
    default:
      throw operationFailedError(`Unknown job type: ${job.type}`, undefined, {
        jobId: job.id,
        type: job.type,
      });
  }
}
