export const runtime = "nodejs";

import { NextRequest } from "next/server";
import path from "path";
import fs from "fs/promises";
import { z } from "zod";

import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { badRequestError, notFoundError } from "@/shared/errors/app-error";
import { getImageFileRepository } from "@/features/files/server";

const uploadsRoot = path.join(process.cwd(), "public", "uploads");

const sanitizeProjectId = (value: string): string =>
  value.trim().replace(/[^a-zA-Z0-9-_]/g, "_");

function normalizePublicPath(filepath: string | null | undefined): string | null {
  const raw = typeof filepath === "string" ? filepath.trim() : "";
  if (!raw) return null;
  let normalized = raw.replace(/\\/g, "/");
  if (/^https?:\/\//i.test(normalized)) {
    try {
      const url = new URL(normalized);
      normalized = url.pathname;
    } catch {
      return raw;
    }
  }
  if (normalized.startsWith("public/")) {
    normalized = `/${normalized}`;
  }
  const publicIndex = normalized.indexOf("/public/");
  if (publicIndex >= 0) {
    normalized = normalized.slice(publicIndex + "/public".length);
  }
  const uploadsIndex = normalized.indexOf("/uploads/");
  if (uploadsIndex >= 0) {
    normalized = normalized.slice(uploadsIndex);
  } else if (normalized.startsWith("uploads/")) {
    normalized = `/${normalized}`;
  }
  if (!normalized.startsWith("/")) normalized = `/${normalized}`;
  return normalized;
}

function resolveDiskPathFromPublicUploadPath(filepath: string): string | null {
  const normalized = normalizePublicPath(filepath);
  if (!normalized || !normalized.startsWith("/uploads/")) return null;
  const resolved = path.resolve(process.cwd(), "public", normalized.replace(/^\/+/, ""));
  const uploadsResolved = path.resolve(uploadsRoot);
  if (!resolved.startsWith(`${uploadsResolved}${path.sep}`)) return null;
  return resolved;
}

const deleteSchema = z.object({
  id: z.string().optional(),
  filepath: z.string().optional(),
});

async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { projectId: string }
): Promise<Response> {
  const projectId = sanitizeProjectId(params.projectId);
  if (!projectId) throw badRequestError("Project id is required");

  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequestError("Invalid payload", { errors: parsed.error.format() });
  }

  const assetId = parsed.data.id?.trim() ?? "";
  const isDiskOnly = assetId.startsWith("disk:");
  let filepath = parsed.data.filepath?.trim() ?? "";

  if (assetId && !isDiskOnly) {
    const repo = await getImageFileRepository();
    const record = await repo.getImageFileById(assetId);
    if (!record) {
      throw notFoundError("Asset not found");
    }
    filepath = record.filepath;
    const normalized = normalizePublicPath(filepath);
    if (!normalized || !normalized.startsWith(`/uploads/studio/${projectId}/`)) {
      throw badRequestError("Asset not in this project");
    }
    const diskPath = resolveDiskPathFromPublicUploadPath(normalized);
    if (diskPath) {
      await fs.unlink(diskPath).catch((error: unknown) => {
        if (error instanceof Error && (error as NodeJS.ErrnoException).code !== "ENOENT") {
          throw error;
        }
      });
    }
    await repo.deleteImageFile(assetId);
    return new Response(null, { status: 204 });
  }

  if (isDiskOnly && !filepath) {
    filepath = assetId.replace(/^disk:/, "");
  }

  const normalized = normalizePublicPath(filepath);
  if (!normalized || !normalized.startsWith(`/uploads/studio/${projectId}/`)) {
    throw notFoundError("Asset not found");
  }
  const diskPath = resolveDiskPathFromPublicUploadPath(normalized);
  if (!diskPath) {
    throw notFoundError("Asset not found");
  }
  await fs.unlink(diskPath).catch((error: unknown) => {
    if (error instanceof Error && (error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  });

  return new Response(null, { status: 204 });
}

export const POST = apiHandlerWithParams<{ projectId: string }>(
  async (req: NextRequest, ctx: ApiHandlerContext, params: { projectId: string }): Promise<Response> =>
    POST_handler(req, ctx, params),
  { source: "image-studio.projects.[projectId].assets.delete.POST" }
);
