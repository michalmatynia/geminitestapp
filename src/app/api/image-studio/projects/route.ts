export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { z } from "zod";

import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { badRequestError } from "@/shared/errors/app-error";

const projectsRoot = path.join(process.cwd(), "public", "uploads", "studio");

const sanitizeProjectId = (value: string): string =>
  value.trim().replace(/[^a-zA-Z0-9-_]/g, "_");

const createProjectSchema = z.object({
  projectId: z.string().min(1).max(120),
});

async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    const entries = await fs.readdir(projectsRoot, { withFileTypes: true }).catch(() => []);
    const projects = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

    return NextResponse.json({ projects });
  } catch (error) {
    return createErrorResponse(error, {
      request: _req,
      source: "image-studio.projects.GET",
      fallbackMessage: "Failed to list projects",
    });
  }
}

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    const body = (await req.json().catch(() => null)) as unknown;
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
      throw badRequestError("Invalid payload", { errors: parsed.error.format() });
    }

    const sanitized = sanitizeProjectId(parsed.data.projectId);
    if (!sanitized) {
      throw badRequestError("Project id is required");
    }

    const projectDir = path.join(projectsRoot, sanitized);
    await fs.mkdir(projectDir, { recursive: true });

    return NextResponse.json({ projectId: sanitized });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "image-studio.projects.POST",
      fallbackMessage: "Failed to create project",
    });
  }
}

export const GET = apiHandler(async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx), {
  source: "image-studio.projects.GET",
});

export const POST = apiHandler(async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx), {
  source: "image-studio.projects.POST",
});

