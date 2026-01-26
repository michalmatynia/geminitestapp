import { NextResponse } from "next/server";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { badRequestError, configurationError } from "@/lib/errors/app-error";
import { apiHandler } from "@/lib/api/api-handler";

const chunkText = (text: string, maxChars: number) => {
  const chunks: string[] = [];
  let cursor = 0;
  const cleaned = text.replace(/\r/g, "").trim();
  if (!cleaned) return chunks;

  while (cursor < cleaned.length) {
    chunks.push(cleaned.slice(cursor, cursor + maxChars).trim());
    cursor += maxChars;
  }
  return chunks.filter(Boolean);
};

async function POST_handler(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return createErrorResponse(badRequestError("Missing PDF file."), {
        request: req,
        source: "chatbot.context.POST",
      });
    }

    if (file.type !== "application/pdf") {
      return createErrorResponse(badRequestError("Only PDF files are supported."), {
        request: req,
        source: "chatbot.context.POST",
      });
    }

    let pdfParse: ((buffer: Buffer) => Promise<{ text: string }>) | null = null;
    try {
      const pdfModule = await import("pdf-parse");
      pdfParse = pdfModule.default;
    } catch {
      return createErrorResponse(
        configurationError("PDF parser not installed. Run `npm install pdf-parse`."),
        {
          request: req,
          source: "chatbot.context.POST",
        }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await pdfParse(buffer);
    const rawText = result.text || "";
    const pages = rawText.split("\f").map((chunk) => chunk.trim());
    const segments: Array<{ title: string; content: string }> = [];

    const baseName = file.name.replace(/\.pdf$/i, "");
    if (pages.length > 1) {
      pages.forEach((pageText, index) => {
        if (!pageText) return;
        const chunks = chunkText(pageText, 2000);
        if (chunks.length <= 1) {
          segments.push({
            title: `${baseName} (page ${index + 1})`,
            content: pageText,
          });
        } else {
          chunks.forEach((chunk, chunkIndex) => {
            segments.push({
              title: `${baseName} (page ${index + 1}.${chunkIndex + 1})`,
              content: chunk,
            });
          });
        }
      });
    } else {
      const chunks = chunkText(rawText, 2000);
      chunks.forEach((chunk, index) => {
        segments.push({
          title: chunks.length === 1 ? baseName : `${baseName} (part ${index + 1})`,
          content: chunk,
        });
      });
    }

    return NextResponse.json({ segments });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "chatbot.context.POST",
      fallbackMessage: "Failed to parse PDF.",
    });
  }
}

export const POST = apiHandler(POST_handler, { source: "chatbot.context.POST" });
