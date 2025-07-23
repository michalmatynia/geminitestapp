import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import prisma from "@/lib/prisma";
import { ProductFormData } from "@/lib/types";
import fs from "fs/promises";
import path from "path";

/**
 * POST /api/generate-description
 * Generates a product description using the OpenAI API.
 */
export async function POST(req: NextRequest) {
  const { productData, imageUrls } = (await req.json()) as {
    productData: ProductFormData;
    imageUrls: string[];
  };

  if (!productData.name) {
    return NextResponse.json(
      { error: "Product name is required" },
      { status: 400 }
    );
  }

  try {
    const apiKeySetting = await prisma.setting.findUnique({
      where: { key: "openai_api_key" },
    });
    const promptSetting = await prisma.setting.findUnique({
      where: { key: "description_generation_prompt" },
    });
    const modelSetting = await prisma.setting.findUnique({
      where: { key: "openai_model" },
    });

    const apiKey = apiKeySetting?.value;
    const model = modelSetting?.value || "gpt-3.5-turbo";
    let systemPrompt =
      promptSetting?.value ||
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

    const userContent: any[] = [
      {
        type: "text",
        text: "Generate a product description based on the details provided in the system prompt.",
      },
    ];

    if (useImages && imageUrls && imageUrls.length > 0) {
      const imageFiles = await prisma.imageFile.findMany({
        where: { filepath: { in: imageUrls } },
      });

      const imagePromises = imageFiles.map(async (file) => {
        const imagePath = path.join(process.cwd(), "public", file.filepath);
        const imageBuffer = await fs.readFile(imagePath);
        const base64Image = imageBuffer.toString("base64");
        return {
          type: "image_url",
          image_url: {
            url: `data:${file.mimetype};base64,${base64Image}`,
          },
        };
      });

      const processedImages = await Promise.all(imagePromises);
      userContent.push(...processedImages);
    }

    const messages: any[] = [
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