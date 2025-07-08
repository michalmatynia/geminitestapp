import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  console.log("Received POST request to /api/generate-description");
  const { name } = (await req.json()) as { name: string };

  if (!name) {
    console.error("Product name is required");
    return NextResponse.json(
      { error: "Product name is required" },
      { status: 400 }
    );
  }

  try {
    console.log("Fetching OpenAI API key from database...");
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error("OpenAI API key not configured");
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }
    console.log("OpenAI API key fetched successfully.");

    const openai = new OpenAI({
      apiKey: apiKey,
    });

    console.log("Generating description with OpenAI...");
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that generates compelling product descriptions.",
        },
        {
          role: "user",
          content: `Generate a product description for: ${name}`,
        },
      ],
      max_tokens: 100,
    });
    console.log("Description generated successfully:", completion);

    const description = completion.choices[0].message.content?.trim();

    if (!description) {
      console.error("Failed to generate description");
      return NextResponse.json(
        { error: "Failed to generate description" },
        { status: 500 }
      );
    }

    return NextResponse.json({ description });
  } catch (error) {
    console.error("Error generating description:", error);
    return NextResponse.json(
      { error: "Failed to generate description" },
      { status: 500 }
    );
  }
}
