import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import type {
  ChatCompletionContentPart,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";
import prisma from "@/lib/prisma";
import { getImageFileRepository } from "@/lib/services/image-file-repository";
import type { ImageFileRecord, ProductFormData } from "@/types";
import fs from "fs/promises";
import path from "path";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

const getSettingValue = async (key: string): Promise<string | null> => {
  if (!process.env.DATABASE_URL) return null;
  if (!("setting" in prisma)) return null;
  try {
    const setting = await prisma.setting.findUnique({
      where: { key },
      select: { value: true },
    });
    return setting?.value ?? null;
  } catch {
    return null;
  }
};

const getClient = (modelName: string, apiKey: string | null) => {
  if (modelName.startsWith("gpt-") || modelName.startsWith("ft:gpt-")) {
    if (!apiKey) {
      throw new Error("OpenAI API key is missing for GPT model.");
    }
    return new OpenAI({ apiKey });
  } else {
    // Assume Ollama or other local/open-source model
    return new OpenAI({
      baseURL: `${OLLAMA_BASE_URL}/v1`,
      apiKey: "ollama", // Required by SDK but ignored by Ollama
    });
  }
};

/**
 * POST /api/generate-description
 * Generates a product description using the OpenAI API with a configurable 2-step signal path.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    productData?: ProductFormData;
    imageUrls?: string[];
  };
  const productData = body.productData;
  const imageUrls = Array.isArray(body.imageUrls)
    ? body.imageUrls.filter((item): item is string => typeof item === "string")
    : [];

  if (!productData?.name_en) {
    return NextResponse.json(
      { error: "Product name is required" },
      { status: 400 }
    );
  }

  try {
    // 1. Retrieve Settings
    const [
      apiKeySetting,
      visionModelSetting,
      visionPromptSetting,
      generationModelSetting,
      generationPromptSetting,
    ] = await Promise.all([
      getSettingValue("openai_api_key"),
      getSettingValue("ai_vision_model"),
      getSettingValue("ai_vision_prompt"),
      getSettingValue("openai_model"),
      getSettingValue("description_generation_prompt"),
    ]);

    const apiKey = apiKeySetting ?? process.env.OPENAI_API_KEY ?? null;

    // Configuration Defaults
    const visionModel = visionModelSetting?.trim() || "gpt-4o";
    const visionPrompt = visionPromptSetting?.trim() || "Analyze these product images and describe their visual features, colors, materials, and key design elements.";
    const generationModel = generationModelSetting?.trim() || "gpt-3.5-turbo";
    let generationPrompt = generationPromptSetting?.trim() || "You are a helpful assistant that generates compelling product descriptions.";

    // 2. Prepare Images
    let processedImages: ChatCompletionContentPart[] = [];
    if (imageUrls && imageUrls.length > 0) {
      const imageFileRepository = await getImageFileRepository();
      const imageFiles = await imageFileRepository.listImageFiles();
      const imageFileMap = new Map(
        imageFiles.map((file) => [file.filepath, file])
      );
      const matchedFiles = imageUrls
        .map((filepath) => imageFileMap.get(filepath))
        .filter((file): file is ImageFileRecord => Boolean(file));

      const imagePromises = matchedFiles.map(async (file) => {
        const imagePath = path.join(process.cwd(), "public", file.filepath);
        const imageBuffer = await fs.readFile(imagePath);
        const base64Image = imageBuffer.toString("base64");
        return {
          type: "image_url" as const,
          image_url: {
            url: `data:${file.mimetype};base64,${base64Image}`,
          },
        };
      });

      processedImages = await Promise.all(imagePromises);
    }

    // 3. Step 1: Vision Analysis (Signal Path 1)
    let imageAnalysisResult = "";
    const needsVisionAnalysis = generationPrompt.includes("[imageAnalysis]");

    if (needsVisionAnalysis && processedImages.length > 0) {
        try {
            const visionClient = getClient(visionModel, apiKey);
            const visionMessages: ChatCompletionMessageParam[] = [
                {
                    role: "system",
                    content: visionPrompt
                },
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Here are the product images:" },
                        ...processedImages
                    ]
                }
            ];

            const visionCompletion = await visionClient.chat.completions.create({
                model: visionModel,
                messages: visionMessages,
                max_tokens: 500,
            });

            imageAnalysisResult = visionCompletion.choices[0].message.content?.trim() || "";
        } catch (visionError) {
            console.error("Vision Analysis Failed:", visionError);
            imageAnalysisResult = "(Image analysis failed)";
        }
    }

    // 4. Step 2: Description Generation (Signal Path 2)
    
    // Inject Analysis
    generationPrompt = generationPrompt.replace("[imageAnalysis]", imageAnalysisResult);

    // Handle Legacy [images] placeholder
    const needsDirectImages = generationPrompt.includes("[images]");
    if (needsDirectImages) {
        generationPrompt = generationPrompt.replace("[images]", "").trim();
    }

    // Replace Product Placeholders
    for (const key in productData) {
      if (Object.prototype.hasOwnProperty.call(productData, key)) {
        const value = productData[key as keyof ProductFormData];
        if (value !== null && value !== undefined) {
          generationPrompt = generationPrompt.replace(`[${key}]`, String(value));
        }
      }
    }

    // Prepare Messages for Generation
    const generationUserContent: ChatCompletionContentPart[] = [
        {
            type: "text",
            text: "Generate the product description."
        }
    ];

    if (needsDirectImages && processedImages.length > 0) {
        generationUserContent.push(...processedImages);
    }

    const generationMessages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: generationPrompt,
      },
      {
        role: "user",
        content: generationUserContent,
      },
    ];

    const generationClient = getClient(generationModel, apiKey);
    const completion = await generationClient.chat.completions.create({
      model: generationModel,
      messages: generationMessages,
      max_tokens: 1000,
    });

    const description = completion.choices[0].message.content?.trim();

    if (!description) {
      return NextResponse.json(
        { error: "Failed to generate description" },
        { status: 500 }
      );
    }

    return NextResponse.json({ description });
  } catch (error) {
    console.error("Generate Description Error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate description";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
