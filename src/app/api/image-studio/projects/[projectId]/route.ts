export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { badRequestError } from "@/shared/errors/app-error";

const projectsRoot = path.join(process.cwd(), "public", "uploads", "studio");

const sanitizeProjectId = (value: string): string =>
  value.trim().replace(/[^a-zA-Z0-9-_]/g, "_");

async function DELETE_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { projectId: string }
): Promise<Response> {
  try {
    const projectId = sanitizeProjectId(params.projectId);
    if (!projectId) throw badRequestError("Project id is required");

    const projectDir = path.join(projectsRoot, projectId);
    await fs.rm(projectDir, { recursive: true, force: true });

    return NextResponse.json({ projectId, deleted: true });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "image-studio.projects.DELETE",
      fallbackMessage: "Failed to delete project",
    });
  }
}

export const DELETE = apiHandlerWithParams(
  async (req: NextRequest, ctx: ApiHandlerContext, params: { projectId: string }): Promise<Response> =>
    DELETE_handler(req, ctx, params),
  { source: "image-studio.projects.DELETE" }
);
