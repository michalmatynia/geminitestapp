export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { z } from "zod";

import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { badRequestError } from "@/shared/errors/app-error";

const projectsRoot = path.join(process.cwd(), "public", "uploads", "studio");

const sanitizeProjectId = (value: string): string =>
  value.trim().replace(/[^a-zA-Z0-9-_]/g, "_");

const sanitizeFolderPath = (value: string): string => {
  const normalized = value.replace(/\\/g, "/").trim();
  const parts = normalized
    .split("/")
    .map((part) => part.trim())
    .filter((part) => part && part !== "." && part !== "..")
    .map((part) => part.replace(/[^a-zA-Z0-9-_]/g, "_"))
    .filter(Boolean);

  return parts.join("/");
};

const createFolderSchema = z.object({
  folder: z.string().min(1),
});

async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { projectId: string }
): Promise<Response> {
  try {
    const projectId = sanitizeProjectId(params.projectId);
    if (!projectId) throw badRequestError("Project id is required");

    const body = (await req.json().catch(() => null)) as unknown;
    const parsed = createFolderSchema.safeParse(body);
    if (!parsed.success) {
      throw badRequestError("Invalid payload", { errors: parsed.error.format() });
    }

    const safeFolder = sanitizeFolderPath(parsed.data.folder);
    if (!safeFolder) {
      throw badRequestError("Folder name is required");
    }

    const folderPath = path.join(projectsRoot, projectId, safeFolder);
    await fs.mkdir(folderPath, { recursive: true });

    return NextResponse.json({ folder: safeFolder }, { status: 201 });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "image-studio.projects.[projectId].folders.POST",
      fallbackMessage: "Failed to create folder",
      extra: { projectId: params.projectId },
    });
  }
}

export const POST = apiHandlerWithParams<{ projectId: string }>(
  async (req: NextRequest, ctx: ApiHandlerContext, params: { projectId: string }): Promise<Response> =>
    POST_handler(req, ctx, params),
  { source: "image-studio.projects.[projectId].folders.POST" }
);
