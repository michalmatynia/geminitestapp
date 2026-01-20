import prisma from "@/lib/prisma";
import { ProductAiJobStatus } from "@prisma/client";
import { generateProductDescription } from "./aiDescriptionService";
import { translateProduct } from "./aiTranslationService";
import type { ProductFormData } from "@/types";
import { getProductRepository } from "@/lib/services/product-repository";

let intervalId: NodeJS.Timeout | null = null;
let isProcessing = false;
let lastPollTime = 0;

// Health check to ensure the queue is actually running
function isQueueHealthy(): boolean {
  // If no intervalId, queue is definitely not running
  if (!intervalId) return false;

  // If we haven't polled in the last 10 seconds, the queue might be stuck
  const now = Date.now();
  const timeSinceLastPoll = now - lastPollTime;
  return timeSinceLastPoll < 10000;
}

async function processDescriptionGeneration(job: any) {
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
      throw new Error("Product not found");
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

    const uploadedImages = product.images?.map((img: any) => img.imageFile?.filepath).filter(Boolean) || [];
    const externalImages = product.imageLinks || [];
    allImageUrls = [...externalImages, ...uploadedImages];
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

async function processTranslation(job: any) {
  const { productId } = job;

  console.log(`[processTranslation] Starting for productId: ${productId}`);

  // Fetch product data
  const productRepository = await getProductRepository();
  const product = await productRepository.getProductById(productId);

  if (!product) {
    console.error(`[processTranslation] Product not found for ID: "${productId}"`);
    throw new Error("Product not found");
  }

  console.log(`[processTranslation] Found product: ${product.name_en}`);

  // Determine source and target languages
  const sourceLanguage = "English"; // Always translate from English
  const sourceName = product.name_en || "";
  const sourceDescription = product.description_en || "";

  if (!sourceName && !sourceDescription) {
    throw new Error("Product has no English name or description to translate from");
  }

  // Determine target languages based on product's catalogs
  let targetLanguages: string[] = [];

  console.log(`[processTranslation] Product has ${product.catalogs?.length || 0} catalog assignments`);
  console.log(`[processTranslation] Product catalogs:`, JSON.stringify(product.catalogs, null, 2));

  if (product.catalogs && product.catalogs.length > 0) {
    // Check if catalog data is already embedded (MongoDB format)
    const firstCatalog = product.catalogs[0] as any;
    const hasEmbeddedCatalog = firstCatalog?.catalog && typeof firstCatalog.catalog === 'object';

    if (hasEmbeddedCatalog) {
      // MongoDB format: catalog data is already embedded with languageIds array
      console.log(`[processTranslation] Using embedded catalog data (MongoDB format)`);

      const languageSet = new Set<string>();

      for (const catalogAssignment of product.catalogs) {
        const catalog = (catalogAssignment as any).catalog;
        console.log(`[processTranslation] Processing catalog "${catalog.name}" (${catalog.id})`);

        if (catalog.languageIds && Array.isArray(catalog.languageIds)) {
          console.log(`[processTranslation] Found ${catalog.languageIds.length} language IDs in catalog`);

          // Fetch language details for these IDs
          const languages = await prisma.language.findMany({
            where: { id: { in: catalog.languageIds } }
          });

          console.log(`[processTranslation] Fetched ${languages.length} languages from database`);

          languages.forEach((lang) => {
            console.log(`[processTranslation] Checking language: ${lang.name} (${lang.code})`);
            if (lang.code !== "EN") {
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
        catalogIds = product.catalogs.map((c: any) => {
          return c.catalogId || c.id || c;
        }).filter(Boolean);
      }

      console.log(`[processTranslation] Looking up catalog IDs:`, catalogIds);

      if (catalogIds.length === 0) {
        console.log(`[processTranslation] No valid catalog IDs found`);
        throw new Error("Product has catalog assignments but no valid catalog IDs found");
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
    const allLanguages = await prisma.language.findMany({
      where: { code: { not: "EN" } }
    });
    console.log(`[processTranslation] Found ${allLanguages.length} available languages`);
    targetLanguages = allLanguages.map((l) => l.name);
  }

  if (targetLanguages.length === 0) {
    console.log(`[processTranslation] No target languages found for product ${productId}`);
    throw new Error("No target languages to translate to. Either assign the product to a catalog with languages, or add languages to the Product Settings.");
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
  const updateData: any = {};

  for (const [lang, translation] of Object.entries(result.translations)) {
    const langCode = lang.toLowerCase();
    if (langCode === "polish" || langCode.includes("pol")) {
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
    const nextJob = await prisma.productAiJob.findFirst({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
    });

    if (!nextJob) {
      console.log("[productAiQueue] No pending jobs found");
      return;
    }

    console.log(`[productAiQueue] Found job ${nextJob.id} of type "${nextJob.type}", processing...`);

    await prisma.productAiJob.update({
      where: { id: nextJob.id },
      data: { status: "running", startedAt: new Date() },
    });

    try {
      let result = null;
      if (nextJob.type === "description_generation") {
        console.log(`[productAiQueue] Processing description generation for job ${nextJob.id}`);
        result = await processDescriptionGeneration(nextJob);
        console.log(`[productAiQueue] Description generation completed for job ${nextJob.id}`);
      } else if (nextJob.type === "translation") {
        console.log(`[productAiQueue] Processing translation for job ${nextJob.id}`);
        result = await processTranslation(nextJob);
        console.log(`[productAiQueue] Translation completed for job ${nextJob.id}`);
      } else {
        throw new Error(`Unknown job type: ${nextJob.type}`);
      }

      await prisma.productAiJob.update({
        where: { id: nextJob.id },
        data: {
          status: "completed",
          finishedAt: new Date(),
          result: result as any,
        },
      });
      console.log(`[productAiQueue] Job ${nextJob.id} marked as completed`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Job failed.";
      console.error(`[productAiQueue] Job ${nextJob.id} failed:`, message);
      await prisma.productAiJob.update({
        where: { id: nextJob.id },
        data: {
          status: "failed",
          finishedAt: new Date(),
          errorMessage: message,
        },
      });
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

  const job = await prisma.productAiJob.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    console.error(`[processSingleJob] Job ${jobId} not found`);
    throw new Error("Job not found");
  }

  if (job.status !== "pending") {
    console.log(`[processSingleJob] Job ${jobId} is not pending (status: ${job.status}), skipping`);
    return;
  }

  console.log(`[processSingleJob] Found job ${job.id} of type "${job.type}", processing...`);

  await prisma.productAiJob.update({
    where: { id: job.id },
    data: { status: "running", startedAt: new Date() },
  });

  try {
    let result = null;
    if (job.type === "description_generation") {
      console.log(`[processSingleJob] Processing description generation for job ${job.id}`);
      result = await processDescriptionGeneration(job);
      console.log(`[processSingleJob] Description generation completed for job ${job.id}`);
    } else if (job.type === "translation") {
      console.log(`[processSingleJob] Processing translation for job ${job.id}`);
      result = await processTranslation(job);
      console.log(`[processSingleJob] Translation completed for job ${job.id}`);
    } else {
      throw new Error(`Unknown job type: ${job.type}`);
    }

    await prisma.productAiJob.update({
      where: { id: job.id },
      data: {
        status: "completed",
        finishedAt: new Date(),
        result: result as any,
      },
    });
    console.log(`[processSingleJob] Job ${job.id} marked as completed`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Job failed.";
    console.error(`[processSingleJob] Job ${job.id} failed:`, message);
    await prisma.productAiJob.update({
      where: { id: job.id },
      data: {
        status: "failed",
        finishedAt: new Date(),
        errorMessage: message,
      },
    });
    throw error;
  }
};
