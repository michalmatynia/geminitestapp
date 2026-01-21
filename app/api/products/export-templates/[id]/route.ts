import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import {
  deleteExportTemplate,
  getExportTemplate,
  updateExportTemplate,
} from "@/lib/services/export-template-repository";

const mappingSchema = z.object({
  sourceKey: z.string().trim().min(1),
  targetField: z.string().trim().min(1),
});

const templateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  mappings: z.array(mappingSchema).optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const template = await getExportTemplate(id);
    if (!template) {
      return NextResponse.json(
        { error: "Template not found." },
        { status: 404 }
      );
    }
    return NextResponse.json(template);
  } catch (error) {
    const errorId = randomUUID();
    console.error("[export-templates][GET] Failed to fetch template", {
      errorId,
      error,
    });
    return NextResponse.json(
      { error: "Failed to fetch template.", errorId },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = templateSchema.parse(body);
    const template = await updateExportTemplate(id, {
      name: data.name,
      description: data.description,
      mappings: data.mappings,
    });
    if (!template) {
      return NextResponse.json(
        { error: "Template not found." },
        { status: 404 }
      );
    }
    return NextResponse.json(template);
  } catch (error: unknown) {
    const errorId = randomUUID();
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid payload.", details: error.flatten(), errorId },
        { status: 400 }
      );
    }
    console.error("[export-templates][PUT] Failed to update template", {
      errorId,
      error,
    });
    return NextResponse.json(
      { error: "Failed to update template.", errorId },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await deleteExportTemplate(id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Template not found." },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const errorId = randomUUID();
    console.error("[export-templates][DELETE] Failed to delete template", {
      errorId,
      error,
    });
    return NextResponse.json(
      { error: "Failed to delete template.", errorId },
      { status: 500 }
    );
  }
}
