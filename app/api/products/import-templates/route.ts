import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import {
  createImportTemplate,
  listImportTemplates,
} from "@/lib/services/import-template-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mappingSchema = z.object({
  sourceKey: z.string().trim().min(1),
  targetField: z.string().trim().min(1),
});

const templateSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  mappings: z.array(mappingSchema).default([]),
});

export async function GET() {
  try {
    const templates = await listImportTemplates();
    return NextResponse.json(templates);
  } catch (error) {
    const errorId = randomUUID();
    console.error("[import-templates][GET] Failed to list templates", {
      errorId,
      error,
    });
    return NextResponse.json(
      { error: "Failed to fetch templates.", errorId },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = templateSchema.parse(body);
    const template = await createImportTemplate({
      name: data.name,
      description: data.description ?? null,
      mappings: data.mappings,
    });
    return NextResponse.json(template);
  } catch (error: unknown) {
    const errorId = randomUUID();
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid payload.", details: error.flatten(), errorId },
        { status: 400 }
      );
    }
    console.error("[import-templates][POST] Failed to create template", {
      errorId,
      error,
    });
    return NextResponse.json(
      { error: "Failed to create template.", errorId },
      { status: 500 }
    );
  }
}
