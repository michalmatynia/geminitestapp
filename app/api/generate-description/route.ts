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

/**
 * POST /api/generate-description
 * Generates a product description using the OpenAI API.
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
    const [apiKeySetting, promptSetting, modelSetting] = await Promise.all([
      getSettingValue("openai_api_key"),
      getSettingValue("description_generation_prompt"),
      getSettingValue("openai_model"),
    ]);

    const apiKey = apiKeySetting ?? process.env.OPENAI_API_KEY ?? null;
    const model = modelSetting?.trim() || "gpt-3.5-turbo";
    let systemPrompt =
      promptSetting?.trim() ||
      "You are a helpful assistant that generates compelling product descriptions.";

    const useImages = systemPrompt.includes("[images]");
    if (useImages) {
      systemPrompt = systemPrompt.replace("[images]", "").trim();
    }

    // Replace placeholders
    for (const key in productData) {
      if (Object.prototype.hasOwnProperty.call(productData, key)) {
        const value = productData[key as keyof ProductFormData];
        if (value !== null && value !== undefined) {
          systemPrompt = systemPrompt.replace(`[${key}]`, String(value));
        }
      }
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const openai = new OpenAI({
      apiKey: apiKey,
    });

    const userContent: ChatCompletionContentPart[] = [
      {
        type: "text",
        text: "Generate a product description based on the details provided in the system prompt.",
      },
    ];

    if (useImages && imageUrls && imageUrls.length > 0) {
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

      const processedImages = await Promise.all(imagePromises);
      userContent.push(...processedImages);
    }

    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userContent,
      },
    ];

    const completion = await openai.chat.completions.create({
      model: model,
      messages: messages,
      max_tokens: 500,
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
    return NextResponse.json(
      { error: "Failed to generate description" },
      { status: 500 }
    );
  }
}
