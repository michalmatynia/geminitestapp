import prisma from "@/lib/prisma";
import { ProductAiJobStatus } from "@prisma/client";
import { generateProductDescription } from "./aiDescriptionService";
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

    console.log(`[productAiQueue] Found job ${nextJob.id}, processing...`);

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

  console.log("[productAiQueue] Queue worker started");

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
