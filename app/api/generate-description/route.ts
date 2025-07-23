import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import prisma from "@/lib/prisma";
import { ProductFormData } from "@/lib/types";
import fs from "fs/promises";
import path from "path";

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
    console.log("--- [Debug] Fetching settings from database ---");
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

    console.log({
      apiKey: apiKey ? `Loaded (length: ${apiKey.length})` : "Not found",
      model: model,
      initialPrompt: systemPrompt,
    });
    console.log("--- [Debug] Finished fetching settings ---");

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
    console.log("--- [Debug] Final prompt after placeholder replacement ---");
    console.log(systemPrompt);
    console.log("--- [Debug] End of final prompt ---");

    if (!apiKey) {
      console.error("OpenAI API key not configured");
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
        text: `Generate a product description for: ${productData.name}`,
      },
    ];

    if (useImages && imageUrls && imageUrls.length > 0) {
      console.log("--- [Debug] Processing images for OpenAI ---");
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
      console.log(`--- [Debug] Added ${processedImages.length} images to the payload ---`);
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

    console.log("--- [Debug] Sending the following payload to OpenAI ---");
    // Avoid logging the full base64 string to keep logs clean
    console.log(JSON.stringify(messages.map((m: { content: string | any[]; }) => {
      if (Array.isArray(m.content)) {
        return { ...m, content: m.content.map((c: { type: string; }) => c.type === 'image_url' ? { ...c, image_url: { url: '...base64_data...' } } : c) };
      }
      return m;
    }), null, 2));
    console.log("--- [Debug] End of OpenAI payload ---");

    const completion = await openai.chat.completions.create({
      model: model,
      messages: messages,
      max_tokens: 500,
    });

    console.log("--- [Debug] Received response from OpenAI ---");
    console.log(JSON.stringify(completion, null, 2));
    console.log("--- [Debug] End of OpenAI response ---");

    const description = completion.choices[0].message.content?.trim();

    if (!description) {
      return NextResponse.json(
        { error: "Failed to generate description" },
        { status: 500 }
      );
    }

    return NextResponse.json({ description });
  } catch (error) {
    console.error("--- [Debug] An error occurred in the API route ---");
    console.error(error);
    console.error("--- [Debug] End of error ---");
    return NextResponse.json(
      { error: "Failed to generate description" },
      { status: 500 }
    );
  }
}
