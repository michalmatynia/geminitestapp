import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import {
  getImportActiveTemplateId,
  setImportActiveTemplateId,
} from "@/lib/services/import-template-repository";

const requestSchema = z.object({
  templateId: z.string().trim().min(1).nullable().optional(),
});

export async function GET() {
  try {
    const templateId = await getImportActiveTemplateId();
    return NextResponse.json({ templateId });
  } catch (error) {
    const errorId = randomUUID();
    console.error("[base-import-active-template][GET] Failed to fetch template", {
      errorId,
      error,
    });
    return NextResponse.json(
      { error: "Failed to fetch template.", errorId },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const errorId = randomUUID();
  try {
    const body = await req.json();
    const data = requestSchema.parse(body);
    await setImportActiveTemplateId(data.templateId ?? null);
    return NextResponse.json({ templateId: data.templateId ?? null });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(
      "[base-import-active-template][POST] Failed to save template",
      {
        errorId,
        message,
      }
    );
    return NextResponse.json(
      { error: message, errorId },
      { status: 500 }
    );
  }
}
