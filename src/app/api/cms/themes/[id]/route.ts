export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/features/products/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { notFoundError } from "@/shared/errors/app-error";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { getCmsRepository } from "@/features/cms/services/cms-repository";

const colorsSchema = z.object({
  primary: z.string(),
  secondary: z.string(),
  accent: z.string(),
  background: z.string(),
  surface: z.string(),
  text: z.string(),
  muted: z.string(),
});

const typographySchema = z.object({
  headingFont: z.string(),
  bodyFont: z.string(),
  baseSize: z.number(),
  headingWeight: z.number(),
  bodyWeight: z.number(),
});

const spacingSchema = z.object({
  sectionPadding: z.string(),
  containerMaxWidth: z.string(),
});

const themeUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  colors: colorsSchema.optional(),
  typography: typographySchema.optional(),
  spacing: spacingSchema.optional(),
  customCss: z.string().nullable().optional(),
});

async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  try {
    const id = params.id;
    const cmsRepository = await getCmsRepository();
    const theme = await cmsRepository.getThemeById(id);

    if (!theme) {
      throw notFoundError("Theme not found");
    }

    return NextResponse.json(theme);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "cms.themes.[id].GET",
      fallbackMessage: "Failed to fetch theme",
    });
  }
}

async function PUT_handler(req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  try {
    const id = params.id;

    const parsed = await parseJsonBody(req, themeUpdateSchema, {
      logPrefix: "cms-themes",
    });
    if (!parsed.ok) {
      return parsed.response;
    }

    const cmsRepository = await getCmsRepository();
    const updated = await cmsRepository.updateTheme(id, parsed.data);

    if (!updated) {
      throw notFoundError("Theme not found");
    }

    return NextResponse.json(updated);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "cms.themes.[id].PUT",
      fallbackMessage: "Failed to update theme",
    });
  }
}

async function DELETE_handler(req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  try {
    const id = params.id;
    const cmsRepository = await getCmsRepository();
    await cmsRepository.deleteTheme(id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "cms.themes.[id].DELETE",
      fallbackMessage: "Failed to delete theme",
    });
  }
}

export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, { source: "cms.themes.[id].GET" });
export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, { source: "cms.themes.[id].PUT" });
export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, { source: "cms.themes.[id].DELETE" });
