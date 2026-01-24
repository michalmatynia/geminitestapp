import OpenAI from "openai";
import type { ChatCompletionContentPart } from "openai/resources/chat/completions";
import prisma from "@/lib/prisma";
import { getMongoDb } from "@/lib/db/mongo-client";
import { getImageFileRepository } from "@/lib/services/image-file-repository";
import type { ProductFormData } from "@/types";
import fs from "fs/promises";
import path from "path";
import { badRequestError, configurationError } from "@/lib/errors/app-error";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

// AI-related settings that should be read from MongoDB when available
const AI_SETTINGS_KEYS = new Set([
  "ai_vision_model",
  "ai_vision_user_prompt",
  "ai_vision_prompt",
  "ai_vision_output_enabled",
  "openai_model",
  "openai_api_key",
  "description_generation_user_prompt",
  "description_generation_prompt",
  "ai_generation_output_enabled",
]);

export async function getSettingValue(key: string): Promise<string | null> {
  let value: string | null = null;

  // For AI settings, prefer MongoDB if available
  if (AI_SETTINGS_KEYS.has(key) && process.env.MONGODB_URI) {
    try {
      const mongo = await getMongoDb();
      const doc = await mongo.collection("settings").findOne({ _id: key } as any) as { value: string } | null;
      if (doc && typeof doc.value === "string") {
        value = doc.value;
        return value; // Return immediately if found in MongoDB
      }
    } catch (err) {
      console.warn(`Mongo setting fetch failed for ${key}:`, err);
    }
  }

  // Fall back to Prisma
  if (!value && process.env.DATABASE_URL) {
    try {
      const db = prisma as any;
      if (db.setting) {
        const setting = await db.setting.findUnique({
          where: { key },
          select: { value: true },
        }) as { value: string } | null;
        if (setting) value = setting.value;
      }
    } catch (err) {
      console.warn(`Prisma setting fetch failed for ${key}:`, err);
    }
  }

  // If still not found and not an AI setting, try MongoDB as fallback
  if (!value && !AI_SETTINGS_KEYS.has(key) && process.env.MONGODB_URI) {
    try {
      const mongo = await getMongoDb();
      const doc = await mongo.collection("settings").findOne({ _id: key } as any) as { value: string } | null;
      if (doc && typeof doc.value === "string") {
        value = doc.value;
      }
    } catch (err) {
      console.warn(`Mongo fallback setting fetch failed for ${key}:`, err);
    }
  }

  return value;
}

function getClient(modelName: string, apiKey: string | null) {
  // Check if it's a real OpenAI model (not gpt-oss or other Ollama variants)
  const isOpenAI = (modelName.startsWith("gpt-") && !modelName.includes("oss")) ||
                   modelName.startsWith("ft:gpt-") ||
                   modelName.startsWith("o1-");

  if (isOpenAI) {
    if (!apiKey) {
      throw configurationError("OpenAI API key is missing for GPT model.");
    }
    return new OpenAI({ apiKey });
  }

  // All other models use Ollama
  return new OpenAI({
    baseURL: `${OLLAMA_BASE_URL}/v1`,
    apiKey: "ollama",
  });
}

export async function generateProductDescription(params: {
  productData: ProductFormData;
  imageUrls?: string[] | undefined;
  visionOutputEnabled?: boolean | undefined;
  generationOutputEnabled?: boolean | undefined;
}) {
  const { productData, imageUrls = [], visionOutputEnabled, generationOutputEnabled } = params;

  if (!productData?.name_en) {
    throw badRequestError("Product name is required", { field: "name_en" });
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
    getSettingValue("openai_api_key"),
    getSettingValue("ai_vision_model"),
    getSettingValue("ai_vision_user_prompt"),
    getSettingValue("ai_vision_prompt"),
    getSettingValue("ai_vision_output_enabled"),
    getSettingValue("openai_model"),
    getSettingValue("description_generation_user_prompt"),
    getSettingValue("description_generation_prompt"),
    getSettingValue("ai_generation_output_enabled"),
  ]);

  const apiKey = apiKeySetting ?? process.env.OPENAI_API_KEY ?? null;
  const visionModel = visionModelSetting?.trim() || "gemma3:27b";
  const visionInputPrompt = visionInputPromptSetting?.trim() || "Analyze these product images...";
  const visionOutputPrompt = visionOutputPromptSetting?.trim() || "";
  const isVisionOutputEnabled = visionOutputEnabled !== undefined ? visionOutputEnabled : (visionOutputEnabledSetting === "true");

  const generationModel = generationModelSetting?.trim() || "qwen3-vl:30b";
  const generationInputPrompt = generationInputPromptSetting?.trim() || "Generate description for [name_en]";
  const generationOutputPrompt = generationOutputPromptSetting?.trim() || "";
  const isGenerationOutputEnabled = generationOutputEnabled !== undefined ? generationOutputEnabled : (generationOutputEnabledSetting === "true");

  const processPrompt = (text: string, currentResult: string = "", analysisResult: string = "", descriptionInitial: string = "") => {
    let processed = text;
    const hasImagesPlaceholder = processed.includes("[images]");
    processed = processed.replace(/\[analysis\]/g, analysisResult);
    processed = processed.replace(/\[imageAnalysis\]/g, analysisResult);
    processed = processed.replace(/\[description\]/g, descriptionInitial);
    processed = processed.replace(/\[result\]/g, currentResult);
    processed = processed.replace(/\[initialResult\]/g, currentResult);
    processed = processed.replace(/\[images\]/g, "");

    if (productData) {
      for (const key in productData) {
        if (Object.prototype.hasOwnProperty.call(productData, key)) {
          const value = productData[key as keyof ProductFormData];
          if (value !== null && value !== undefined) {
            processed = processed.replace(new RegExp(`\\[${key}\\]`, 'g'), String(value));
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
    const imageFileMap = new Map(imageFiles.map((file) => [file.filepath, file]));

    const imagePromises = imageUrls.map(async (item) => {
      try {
        let base64Image: string;
        let mimetype: string = "image/jpeg";
        if (item.startsWith("http")) {
          const res = await fetch(item);
          if (!res.ok) return null;
          const buffer = Buffer.from(await res.arrayBuffer());
          base64Image = buffer.toString("base64");
          mimetype = res.headers.get("content-type") || "image/jpeg";
        } else {
          const imagePath = path.join(process.cwd(), "public", item);
          const buffer = await fs.readFile(imagePath);
          base64Image = buffer.toString("base64");
          const record = imageFileMap.get(item);
          if (record) mimetype = record.mimetype;
        }
        return { type: "image_url" as const, image_url: { url: `data:${mimetype};base64,${base64Image}` } };
      } catch { return null; }
    });
    processedImages = (await Promise.all(imagePromises)).filter((img) => img !== null) as ChatCompletionContentPart[];
  }

  let analysisInitial = "";
  let analysisFinal = "";
  const visionClient = getClient(visionModel, apiKey);

  const prompt1_1 = processPrompt(visionInputPrompt);
  const content1_1: ChatCompletionContentPart[] = [{ type: "text", text: prompt1_1.text }];
  if (prompt1_1.attachImages) content1_1.push(...processedImages);

  const visionCompletion = await visionClient.chat.completions.create({
    model: visionModel,
    messages: [
      { role: "system", content: "You are an AI assistant." },
      { role: "user", content: content1_1 }
    ],
    max_tokens: 500,
  });
  analysisInitial = visionCompletion.choices[0]?.message.content?.trim() || "";

  if (isVisionOutputEnabled && visionOutputPrompt) {
    const prompt1_2 = processPrompt(visionOutputPrompt, analysisInitial, analysisInitial);
    const content1_2: ChatCompletionContentPart[] = [{ type: "text", text: prompt1_2.text }];
    if (prompt1_2.attachImages) content1_2.push(...processedImages);
    const refineCompletion = await visionClient.chat.completions.create({
      model: visionModel,
      messages: [
        { role: "system", content: "You are an AI assistant." },
        { role: "user", content: content1_2 }
      ],
      max_tokens: 500,
    });
    analysisFinal = refineCompletion.choices[0]?.message.content?.trim() || "";
  }

  const visionResultForNext = analysisFinal || analysisInitial;
  const generationClient = getClient(generationModel, apiKey);
  let descriptionInitial = "";
  let descriptionFinal = "";

  const prompt2_1 = processPrompt(generationInputPrompt, visionResultForNext, visionResultForNext);
  const content2_1: ChatCompletionContentPart[] = [{ type: "text", text: prompt2_1.text }];
  if (prompt2_1.attachImages) content2_1.push(...processedImages);
  const genCompletion = await generationClient.chat.completions.create({
    model: generationModel,
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: content2_1 }
    ],
    max_tokens: 1000,
  });
  descriptionInitial = genCompletion.choices[0]?.message.content?.trim() || "";

  if (isGenerationOutputEnabled && generationOutputPrompt) {
    const prompt2_2 = processPrompt(generationOutputPrompt, descriptionInitial, visionResultForNext, descriptionInitial);
    const content2_2: ChatCompletionContentPart[] = [{ type: "text", text: prompt2_2.text }];
    if (prompt2_2.attachImages) content2_2.push(...processedImages);
    const refineGenCompletion = await generationClient.chat.completions.create({
      model: generationModel,
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: content2_2 }
      ],
      max_tokens: 1000,
    });
    descriptionFinal = refineGenCompletion.choices[0]?.message.content?.trim() || "";
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
    generationOutputEnabled: isGenerationOutputEnabled
  };
}
