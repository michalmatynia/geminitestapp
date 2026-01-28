import { OpenAI from "openai";
import type, ChatCompletionContentPart } from "openai/resources/chat/completions";
import prisma from "@/shared/lib/db/prisma";
import { generateProductDescription, getSettingValue } from "@/features/products";
import { translateProduct } from "@/features/products";
import type { ProductFormData } from "@/features/products";
import { getProductRepository } from "@/features/products";
import { defaultLanguages } from "@/features/internationalization";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import { ObjectId } from "mongodb";
import { getProductDataProvider } from "@/features/products";
import { getProductAiJobRepository } from "@/features/jobs/services/product-ai-job-repository";
import type { ProductAiJobRecord } from "@/features/jobs/types/product-ai-job-repository";
import { getImageFileRepository } from "@/features/files";
import { fs from "fs/promises";
import path from "path";
import, badRequestError, configurationError, notFoundError, operationFailedError, } from "@/shared/errors/app-error";
import { ErrorSystem } from "@/features/observability";

type LanguageRecord = {
  id: string;
  code: string;
  name: string;
};

type JobPayload = {
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
  [key: string]: unknown;
};

type Job = ProductAiJobRecord & {
  payload: JobPayload;
};

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

const getClient = (modelName: string, apiKey: string | null) => {
  const modelLower = modelName.toLowerCase();
  const isOpenAI =
    (modelLower.startsWith("gpt-") && !modelLower.includes("oss")) ||
    modelLower.startsWith("ft:gpt-") ||
    modelLower.startsWith("o1-");

  if (isOpenAI) {
    if (!apiKey) {
      throw configurationError("OpenAI API key is missing for GPT model.");
    }
    return new OpenAI({ apiKey });
  }

  return new OpenAI({
    baseURL: `${OLLAMA_BASE_URL}/v1`,
    apiKey: "ollama",
  });
};

const buildImageParts = async (imageUrls: string[]) => {
  if (!imageUrls.length) return [] as ChatCompletionContentPart[];
  const imageFileRepository = await getImageFileRepository();
  const imageFiles = await imageFileRepository.listImageFiles();
  const imageFileMap = new Map(imageFiles.map((file) => [file.filepath, file]));

  const imagePromises = imageUrls.map(async (item) => {
    try {
      let base64Image: string;
      let mimetype = "image/jpeg";
      if (item.startsWith("http")) {
        const res = await fetch(item);
        if (!res.ok) return null;
        const buffer = Buffer.from(await res.arrayBuffer());
        base64Image = buffer.toString("base64");
        mimetype = res.headers.get("content-type") || "image/jpeg";
      } else {
        const normalized = item.startsWith("/") ? item.slice(1) : item;
        const imagePath = path.join(process.cwd(), "public", normalized);
        const buffer = await fs.readFile(imagePath);
        base64Image = buffer.toString("base64");
        const record = imageFileMap.get(item);
        if (record) mimetype = record.mimetype;
      }
      return {
        type: "image_url" as const,
        image_url: { url: `data:${mimetype};base64,${base64Image}` },
      };
    } catch {
      return null;
    }
  });

  return (await Promise.all(imagePromises)).filter(
    (img): img is Extract<ChatCompletionContentPart, { type: "image_url" }> => Boolean(img)
  );
};

async function processGraphModel(job: Job) {
  const { payload, productId } = job;
  const prompt = typeof payload.prompt === "string" ? payload.prompt.trim() : "";
  if (!prompt) {
    throw badRequestError("Graph model job missing prompt", { jobId: job.id });
  }
  const requestedModelId =
    typeof payload.modelId === "string" ? payload.modelId.trim() : "";
  const visionFallback = (await getSettingValue("ai_vision_model"))?.trim() || "";
  const textFallback = (await getSettingValue("openai_model"))?.trim() || "";
  let modelId =
    requestedModelId ||
    (payload.vision ? visionFallback : textFallback) ||
    (payload.vision ? "gemma3:27b" : "gpt-4o");
  const temperature =
    typeof payload.temperature === "number" ? payload.temperature : 0.7;
  const maxTokens =
    typeof payload.maxTokens === "number" ? payload.maxTokens : 800;
  const imageUrls = Array.isArray(payload.imageUrls)
    ? payload.imageUrls.filter((url): url is string => typeof url === "string" && url.trim() !== "")
    : [];
  const attachImages = Boolean(payload.vision) && imageUrls.length > 0;
  const apiKey = (await getSettingValue("openai_api_key")) ?? process.env.OPENAI_API_KEY ?? null;
  const modelLower = modelId.toLowerCase();
  const isOpenAIModel =
    (modelLower.startsWith("gpt-") && !modelLower.includes("oss")) ||
    modelLower.startsWith("ft:gpt-") ||
    modelLower.startsWith("o1-");
  if (isOpenAIModel && !apiKey) {
    const fallback = visionFallback || "gemma3:27b";
    modelId = fallback;
  }
  const client = getClient(modelId, apiKey);
  const content: ChatCompletionContentPart[] = [{ type: "text", text: prompt }];
  if (attachImages) {
    const imageParts = await buildImageParts(imageUrls);
    content.push(...imageParts);
  }

  const completion = await client.chat.completions.create({
    model: modelId,
    messages: [
      { role: "system", content: "You are an AI assistant." },
      { role: "user", content },
    ],
    temperature,
    max_tokens: maxTokens,
  });
  const resultText = completion.choices[0]?.message.content?.trim() || "";
  return {
    result: resultText,
    modelId,
    prompt,
    imageUrls,
    temperature,
    maxTokens,
    source: payload.source ?? "ai_paths",
    graph: payload.graph ?? undefined,
    productId,
  };
}

const normalizeLanguageDoc = (doc: Record<string, unknown>): LanguageRecord | null => {
  const rawId = doc.id ?? doc._id;
  const rawCode = doc.code ?? doc.languageCode ?? doc.isoCode;
  const rawName = doc.name ?? doc.languageName;
  
  const id = typeof rawId === "string" ? rawId : (typeof rawId === "number" ? String(rawId) : "");
  const code = typeof rawCode === "string" ? rawCode.trim() : (typeof rawCode === "number" ? String(rawCode) : "");
  const name = typeof rawName === "string" ? rawName.trim() : (typeof rawName === "number" ? String(rawName) : "");
  
  if (!id || !code || !name) return null;
  return { id, code, name };
};

const normalizeIdValue = (value: unknown): string => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (value instanceof ObjectId) return value.toString();
  return "";
};

const fetchLanguagesByIds = async (ids: string[]): Promise<LanguageRecord[]> => {
  const normalizedIds = ids.map((id) => normalizeIdValue(id)).filter(Boolean);
  if (!normalizedIds.length) return [];
  const provider = await getProductDataProvider();
  if (provider === "mongodb") {
    const mongo = await getMongoDb();
    const objectIds = normalizedIds
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id));
    const docs = await mongo
      .collection<Record<string, unknown>>("languages")
      .find({
        $or: [
          ...(objectIds.length ? [{ _id: { $in: objectIds } }] : []),
          { id: { $in: normalizedIds } },
          { code: { $in: normalizedIds } },
        ],
      })
      .toArray();
    return docs.map(normalizeLanguageDoc).filter(Boolean) as LanguageRecord[];
  }
  const languages = await prisma.language.findMany({
    where: { id: { in: normalizedIds } },
  });
  return languages.map((lang) => ({
    id: lang.id,
    code: lang.code,
    name: lang.name,
  }));
};

const fetchAllLanguages = async (): Promise<LanguageRecord[]> => {
  const provider = await getProductDataProvider();
  if (provider === "mongodb") {
    const mongo = await getMongoDb();
    const docs = await mongo
      .collection<Record<string, unknown>>("languages")
      .find({})
      .toArray();
    return docs.map(normalizeLanguageDoc).filter(Boolean) as LanguageRecord[];
  }
  const languages = await prisma.language.findMany();
  return languages.map((lang) => ({
    id: lang.id,
    code: lang.code,
    name: lang.name,
  }));
};

const resolveFallbackLanguages = async (): Promise<string[]> => {
  const allLanguages = await fetchAllLanguages();
  console.log(`[processTranslation] Found ${allLanguages.length} available languages`);
  const filtered = allLanguages.filter((lang) => lang.code.toUpperCase() !== "EN");
  if (filtered.length > 0) {
    return filtered.map((lang) => lang.name);
  }
  const defaults = defaultLanguages
    .filter((lang) => lang.code !== "EN")
    .map((lang) => lang.name);
  console.log(`[processTranslation] Using default languages fallback:`, defaults);
  return defaults;
};

let intervalId: NodeJS.Timeout | null = null;
let isProcessing = false;
let lastPollTime = 0;
const STALE_RUNNING_TTL_MS = 1000 * 60 * 10;

// Health check to ensure the queue is actually running
function isQueueHealthy(): boolean {
  // If no intervalId, queue is definitely not running
  if (!intervalId) return false;

  // If we haven't polled in the last 10 seconds, the queue might be stuck
  const now = Date.now();
  const timeSinceLastPoll = now - lastPollTime;
  return timeSinceLastPoll < 10000;
}

const stopProductAiJobQueue = (reason?: string) => {
  if (!intervalId) return;
  clearInterval(intervalId);
  intervalId = null;
  const suffix = reason ? `: ${reason}` : "";
  console.log(`[productAiQueue] Queue worker stopped${suffix}`);
};

async function processDescriptionGeneration(job: Job) {
  const { productId, payload } = job;

  console.log(`[processDescriptionGeneration] Starting for productId: ${productId}`);
  console.log(`[processDescriptionGeneration] ProductId type: ${typeof productId}, value: "${productId}"`);
  console.log(`[processDescriptionGeneration] Payload keys:`, Object.keys(payload));
  console.log(`[processDescriptionGeneration] payload.isTest:`, payload.isTest);
  console.log(`[processDescriptionGeneration] payload.productData exists:`, !!payload.productData);

  let productData: ProductFormData;
  let allImageUrls: string[];

  // Check if product data is already in the payload (from test mode)
  if (payload.productData && payload.isTest) {
    console.log(`[processDescriptionGeneration] Using product data from payload (test mode)`);
    const rawData = payload.productData;

    // Extract only the fields we need
    productData = {
      name_en: rawData.name_en || "",
      name_pl: rawData.name_pl || "",
      name_de: rawData.name_de || "",
      description_en: rawData.description_en || "",
      description_pl: rawData.description_pl || "",
      description_de: rawData.description_de || "",
      sku: rawData.sku || "",
      price: rawData.price || 0,
      stock: rawData.stock || 0,
      ean: rawData.ean || "",
      gtin: rawData.gtin || "",
      asin: rawData.asin || "",
      supplierName: rawData.supplierName || "",
      weight: rawData.weight || 0,
      sizeLength: rawData.sizeLength || 0,
      sizeWidth: rawData.sizeWidth || 0,
      length: rawData.length || 0,
    };

    allImageUrls = payload.imageUrls || [];
    console.log(`[processDescriptionGeneration] Extracted product data: ${productData.name_en}`);
  } else {
    // Fetch fresh product data for non-test jobs using repository
    const productRepository = await getProductRepository();
    const product = await productRepository.getProductById(productId);

    if (!product) {
      console.error(`[processDescriptionGeneration] Product not found for ID: "${productId}"`);
      console.error(`[processDescriptionGeneration] This might be a SKU instead of a product ID`);
      throw notFoundError("Product not found", { productId });
    }

    console.log(`[processDescriptionGeneration] Found product: ${product.name_en}`);

    productData = {
      name_en: product.name_en || "",
      name_pl: product.name_pl || "",
      name_de: product.name_de || "",
      description_en: product.description_en || "",
      description_pl: product.description_pl || "",
      description_de: product.description_de || "",
      sku: product.sku || "",
      price: product.price || 0,
      stock: product.stock || 0,
      ean: product.ean || "",
      gtin: product.gtin || "",
      asin: product.asin || "",
      supplierName: product.supplierName || "",
      weight: product.weight || 0,
      sizeLength: product.sizeLength || 0,
      sizeWidth: product.sizeWidth || 0,
      length: product.length || 0,
    };

    const uploadedImages = product.images
      .map((img) => img.imageFile?.filepath)
      .filter((p): p is string => Boolean(p));
    const rawExternalImages = product.imageLinks || [];

    // Filter out empty strings and invalid URLs from imageLinks
    const externalImages = rawExternalImages.filter((url: string) => url && url.trim().length > 0);

    console.log(`[processDescriptionGeneration] Image breakdown:`, {
      uploadedImages: uploadedImages.length,
      uploadedImagesPaths: uploadedImages.slice(0, 3),
      rawExternalImages: rawExternalImages.length,
      externalImages: externalImages.length,
      externalImagesPaths: externalImages.slice(0, 3),
      emptyImageLinksRemoved: rawExternalImages.length - externalImages.length
    });

    // Remove duplicates between uploaded and external images
    const uploadedSet = new Set(uploadedImages);
    const uniqueExternalImages = externalImages.filter((url: string) => !uploadedSet.has(url));

    allImageUrls = [...uploadedImages, ...uniqueExternalImages];

    if (uniqueExternalImages.length < externalImages.length) {
      console.log(`[processDescriptionGeneration] Removed ${externalImages.length - uniqueExternalImages.length} duplicate images from imageLinks`);
    }
  }

  console.log(`[processDescriptionGeneration] Processing with ${allImageUrls.length} images`);

  const result = await generateProductDescription({
    productData,
    imageUrls: allImageUrls,
    visionOutputEnabled: payload.visionOutputEnabled,
    generationOutputEnabled: payload.generationOutputEnabled
  });

  console.log(`[processDescriptionGeneration] Description generated successfully`);

  // Update product with the generated description (only if not a test)
  if (!payload.isTest) {
    const productRepository = await getProductRepository();
    await productRepository.updateProduct(productId, {
      description_en: result.description,
    });
    console.log(`[processDescriptionGeneration] Product updated with new description`);
  } else {
    console.log(`[processDescriptionGeneration] Test mode - skipping product update`);
  }

  return result;
}

async function processTranslation(job: Job) {
  const { productId } = job;

  console.log(`[processTranslation] Starting for productId: ${productId}`);

  // Fetch product data
  const productRepository = await getProductRepository();
  const product = await productRepository.getProductById(productId);

  if (!product) {
    console.error(`[processTranslation] Product not found for ID: "${productId}"`);
    throw notFoundError("Product not found", { productId });
  }

  console.log(`[processTranslation] Found product: ${product.name_en}`);

  // Determine source and target languages
  const sourceLanguage = "English"; // Always translate from English
  const sourceName = product.name_en || "";
  const sourceDescription = product.description_en || "";

  if (!sourceName && !sourceDescription) {
    throw badRequestError("Product has no English name or description to translate from", {
      productId,
    });
  }

  // Determine target languages based on product's catalogs
  let targetLanguages: string[] = [];

  console.log(`[processTranslation] Product has ${product.catalogs?.length || 0} catalog assignments`);
  console.log(`[processTranslation] Product catalogs:`, JSON.stringify(product.catalogs, null, 2));

  if (product.catalogs && product.catalogs.length > 0) {
    // Check if catalog data is already embedded (MongoDB format)
    const firstCatalog = product.catalogs[0] as unknown as { catalog?: { id: string; name: string; languageIds?: string[] } };
    const hasEmbeddedCatalog = firstCatalog?.catalog && typeof firstCatalog.catalog === 'object';

    if (hasEmbeddedCatalog) {
      // MongoDB format: catalog data is already embedded with languageIds array
      console.log(`[processTranslation] Using embedded catalog data (MongoDB format)`);

      const languageSet = new Set<string>();

      for (const catalogAssignment of (product.catalogs as unknown as { catalog: { id: string; name: string; languageIds?: string[] } }[])) {
        const catalog = catalogAssignment.catalog;
        console.log(`[processTranslation] Processing catalog "${catalog.name}" (${catalog.id})`);

        if (catalog.languageIds && Array.isArray(catalog.languageIds)) {
          console.log(`[processTranslation] Found ${catalog.languageIds.length} language IDs in catalog`);

          // Fetch language details for these IDs
          const languages = await fetchLanguagesByIds(catalog.languageIds);

          console.log(`[processTranslation] Fetched ${languages.length} languages from database`);

          languages.forEach((lang) => {
            console.log(`[processTranslation] Checking language: ${lang.name} (${lang.code})`);
            if (lang.code.toUpperCase() !== "EN") {
              languageSet.add(lang.name);
              console.log(`[processTranslation] Added ${lang.name} to target languages`);
            } else {
              console.log(`[processTranslation] Skipped English (source language)`);
            }
          });
        }
      }

      targetLanguages = Array.from(languageSet);
      console.log(`[processTranslation] Final target languages:`, targetLanguages);
    } else {
      // Prisma/PostgreSQL format: need to fetch catalog data
      console.log(`[processTranslation] Fetching catalog data from database (Prisma format)`);

      let catalogIds: string[] = [];
      if (Array.isArray(product.catalogs)) {
        catalogIds = product.catalogs.map((c) => {
          return c.catalogId || c.catalog?.id;
        }).filter((id): id is string => Boolean(id));
      }

      console.log(`[processTranslation] Looking up catalog IDs:`, catalogIds);

      if (catalogIds.length === 0) {
        console.log(`[processTranslation] No valid catalog IDs found`);
        throw badRequestError("Product has catalog assignments but no valid catalog IDs found", {
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

      console.log(`[processTranslation] Found ${catalogs.length} catalogs from IDs: ${catalogIds.join(", ")}`);

      if (catalogs.length === 0) {
        console.log(`[processTranslation] WARNING: Catalogs not found in database for IDs: ${catalogIds.join(", ")}`);
      }

      catalogs.forEach(catalog => {
        console.log(`[processTranslation] Catalog "${catalog.name}" (${catalog.id}) has ${catalog.languages.length} languages:`,
          catalog.languages.map(cl => `${cl.language.name} (${cl.language.code})`).join(", "));
      });

      const languageSet = new Set<string>();
      catalogs.forEach((catalog) => {
        catalog.languages.forEach((cl) => {
          console.log(`[processTranslation] Checking language: ${cl.language.name} (${cl.language.code})`);
          if (cl.language.code !== "EN") {
            languageSet.add(cl.language.name);
            console.log(`[processTranslation] Added ${cl.language.name} to target languages`);
          } else {
            console.log(`[processTranslation] Skipped English (source language)`);
          }
        });
      });
      targetLanguages = Array.from(languageSet);
      console.log(`[processTranslation] Final target languages:`, targetLanguages);
    }
  } else {
    // No catalogs - translate to all available languages except English
    console.log(`[processTranslation] No catalogs assigned, getting all languages`);
    targetLanguages = await resolveFallbackLanguages();
  }

  if (targetLanguages.length === 0) {
    console.log(`[processTranslation] No catalog languages resolved, falling back to defaults`);
    targetLanguages = await resolveFallbackLanguages();
  }

  if (targetLanguages.length === 0) {
    console.log(`[processTranslation] No target languages found for product ${productId}`);
    throw badRequestError(
      "No target languages to translate to. Either assign the product to a catalog with languages, or add languages to the Product Settings.",
      { productId }
    );
  }

  console.log(`[processTranslation] Translating to: ${targetLanguages.join(", ")}`);

  // Perform translation
  const result = await translateProduct({
    productId,
    sourceLanguage,
    targetLanguages,
    productName: sourceName,
    productDescription: sourceDescription,
  });

  // Update product with translations
  const updateData: Record<string, string> = {};

  for (const [lang, translation] of Object.entries(result.translations)) {
    const langCode = lang.toLowerCase();
    if (langCode === "polish" || langCode.includes("pol") || langCode === "pl") {
      updateData.name_pl = translation.name;
      updateData.description_pl = translation.description;
    } else if (langCode === "german" || langCode.includes("german") || langCode === "de") {
      updateData.name_de = translation.name;
      updateData.description_de = translation.description;
    }
    // Add more language mappings as needed
  }

  if (Object.keys(updateData).length > 0) {
    await productRepository.updateProduct(productId, updateData);
    console.log(`[processTranslation] Product updated with translations:`, Object.keys(updateData));
  }

  return result;
}

const pollQueue = async () => {
  if (isProcessing) {
    console.log("[productAiQueue] Already processing a job, skipping poll");
    return;
  }
  isProcessing = true;
  lastPollTime = Date.now();
  try {
    console.log("[productAiQueue] Polling for pending jobs...");
    const jobRepository = await getProductAiJobRepository();
    const staleResult = await jobRepository.markStaleRunningJobs(STALE_RUNNING_TTL_MS);
    if (staleResult.count > 0) {
      console.log(`[productAiQueue] Marked ${staleResult.count} stale running jobs as failed`);
    }
    const nextJob = await jobRepository.claimNextPendingJob();

    if (!nextJob) {
      console.log("[productAiQueue] No pending jobs found");
      stopProductAiJobQueue("no pending jobs");
      return;
    }

    console.log(`[productAiQueue] Found job ${nextJob.id} of type "${nextJob.type}", processing...`);

          try {

            let result = null;

            const typedJob = nextJob as unknown as Job;

            if (nextJob.type === "description_generation") {

              console.log(`[productAiQueue] Processing description generation for job ${typedJob.id}`);

              result = await processDescriptionGeneration(typedJob);

              console.log(`[productAiQueue] Description generation completed for job ${typedJob.id}`);

            } else if (nextJob.type === "translation") {

              console.log(`[productAiQueue] Processing translation for job ${typedJob.id}`);

              result = await processTranslation(typedJob);

              console.log(`[productAiQueue] Translation completed for job ${typedJob.id}`);

            } else if (nextJob.type === "graph_model") {

              console.log(`[productAiQueue] Processing graph model for job ${typedJob.id}`);

              result = await processGraphModel(typedJob);

              console.log(`[productAiQueue] Graph model completed for job ${typedJob.id}`);

            } else {
        throw operationFailedError(`Unknown job type: ${nextJob.type}`, undefined, {
          jobId: nextJob.id,
          type: nextJob.type,
        });
      }

    await jobRepository.updateJob(nextJob.id, {
      status: "completed",
      finishedAt: new Date(),
      result,
      productId: nextJob.productId,
      type: nextJob.type,
      payload: nextJob.payload,
      createdAt: nextJob.createdAt,
    });
      console.log(`[productAiQueue] Job ${nextJob.id} marked as completed`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Job failed.";
      
      await ErrorSystem.captureException(error, {
        service: "product-ai-queue",
        jobId: nextJob.id,
        productId: nextJob.productId,
        jobType: nextJob.type
      });

      await jobRepository.updateJob(nextJob.id, {
        status: "failed",
        finishedAt: new Date(),
        errorMessage: message,
        productId: nextJob.productId,
        type: nextJob.type,
        payload: nextJob.payload,
        createdAt: nextJob.createdAt,
      });
    }

    const remainingJob = await jobRepository.findAnyPendingJob();
    if (!remainingJob) {
      stopProductAiJobQueue("queue drained");
    }
  } finally {
    isProcessing = false;
  }
};

export const startProductAiJobQueue = () => {
  // Check if queue is healthy
  if (intervalId && isQueueHealthy()) {
    console.log("[productAiQueue] Queue worker already running and healthy");
    return;
  }

  // Stop existing interval if it's unhealthy
  if (intervalId) {
    console.log("[productAiQueue] Restarting unhealthy queue worker");
    clearInterval(intervalId);
  }

  // Start new interval
  intervalId = setInterval(() => {
    void pollQueue();
  }, 3000);

  // Initialize lastPollTime
  lastPollTime = Date.now();

  console.log("[productAiQueue] ====================================");
  console.log("[productAiQueue] Queue worker started successfully");
  console.log("[productAiQueue] Polling every 3 seconds for pending jobs");
  console.log("[productAiQueue] ====================================");

  // Immediately trigger first poll
  void pollQueue();
};

export const getQueueStatus = () => {
  return {
    running: !!intervalId,
    healthy: isQueueHealthy(),
    processing: isProcessing,
    lastPollTime,
    timeSinceLastPoll: Date.now() - lastPollTime,
  };
};

// Export function to process a single job by ID (for serverless environments)
export const processSingleJob = async (jobId: string) => {
  console.log(`[processSingleJob] Processing job ${jobId}`);

  const jobRepository = await getProductAiJobRepository();
  const job = await jobRepository.findJobById(jobId);

  if (!job) {
    console.error(`[processSingleJob] Job ${jobId} not found`);
    throw notFoundError("Job not found", { jobId });
  }

  if (job.status !== "pending") {
    console.log(`[processSingleJob] Job ${jobId} is not pending (status: ${job.status}), skipping`);
    return;
  }

  console.log(`[processSingleJob] Found job ${job.id} of type "${job.type}", processing...`);

  await jobRepository.updateJob(job.id, {
    status: "running",
    startedAt: new Date(),
    productId: job.productId,
    type: job.type,
    payload: job.payload,
    createdAt: job.createdAt,
  });

  try {
    let result = null;
    const typedJob = job as unknown as Job;
    if (job.type === "description_generation") {
      console.log(`[processSingleJob] Processing description generation for job ${job.id}`);
      result = await processDescriptionGeneration(typedJob);
      console.log(`[processSingleJob] Description generation completed for job ${job.id}`);
    } else if (job.type === "translation") {
      console.log(`[processSingleJob] Processing translation for job ${job.id}`);
      result = await processTranslation(typedJob);
      console.log(`[processSingleJob] Translation completed for job ${job.id}`);
    } else if (job.type === "graph_model") {
      console.log(`[processSingleJob] Processing graph model for job ${job.id}`);
      result = await processGraphModel(typedJob);
      console.log(`[processSingleJob] Graph model completed for job ${job.id}`);
    } else {
      throw operationFailedError(`Unknown job type: ${job.type}`, undefined, {
        jobId: job.id,
        type: job.type,
      });
    }

    await jobRepository.updateJob(job.id, {
      status: "completed",
      finishedAt: new Date(),
      result,
      productId: job.productId,
      type: job.type,
      payload: job.payload,
      createdAt: job.createdAt,
    });
    console.log(`[processSingleJob] Job ${job.id} marked as completed`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Job failed.";
    
    await ErrorSystem.captureException(error, {
        service: "product-ai-queue-single",
        jobId: job.id,
        productId: job.productId,
        jobType: job.type
    });

    await jobRepository.updateJob(job.id, {
      status: "failed",
      finishedAt: new Date(),
      errorMessage: message,
      productId: job.productId,
      type: job.type,
      payload: job.payload,
      createdAt: job.createdAt,
    });
    throw error;
  }
};
