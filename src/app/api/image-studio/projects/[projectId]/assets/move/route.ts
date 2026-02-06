export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { z } from "zod";

import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { badRequestError, notFoundError } from "@/shared/errors/app-error";
import { getImageFileRepository } from "@/features/files/server";

const projectsRoot = path.join(process.cwd(), "public", "uploads", "studio");
const uploadsRoot = path.join(process.cwd(), "public", "uploads");

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

const moveSchema = z.object({
  id: z.string().optional(),
  filepath: z.string().optional(),
  targetFolder: z.string().optional(),
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
    const parsed = moveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const targetFolder = parsed.data.targetFolder ? sanitizeFolderPath(parsed.data.targetFolder) : "";
    const targetDiskDir = targetFolder
      ? path.join(projectsRoot, projectId, targetFolder)
      : path.join(projectsRoot, projectId);
    const targetPublicDir = targetFolder
      ? `/uploads/studio/${projectId}/${targetFolder}`
      : `/uploads/studio/${projectId}`;

    const assetId = parsed.data.id?.trim() ?? "";
    const isDiskOnly = assetId.startsWith("disk:");
    let sourceFilepath = parsed.data.filepath?.trim() ?? "";
    let repoRecord: Awaited<ReturnType<Awaited<ReturnType<typeof getImageFileRepository>>["getImageFileById"]>> | null = null;

    if (assetId && !isDiskOnly) {
      const repo = await getImageFileRepository();
      repoRecord = await repo.getImageFileById(assetId);
      if (!repoRecord) {
        throw notFoundError("Asset not found");
      }
      sourceFilepath = repoRecord.filepath;
    } else if (isDiskOnly && !sourceFilepath) {
      sourceFilepath = assetId.replace(/^disk:/, "");
    }

    const normalizedSource = normalizePublicPath(sourceFilepath);
    if (!normalizedSource) {
      return NextResponse.json({ error: "Source filepath is required" }, { status: 400 });
    }
    if (!normalizedSource.startsWith(`/uploads/studio/${projectId}/`)) {
      return NextResponse.json({ error: "Source file must be inside the project uploads folder" }, { status: 400 });
    }

    const sourceDiskPath = resolveDiskPathFromPublicUploadPath(normalizedSource);
    if (!sourceDiskPath) {
      return NextResponse.json({ error: "Source file not found" }, { status: 404 });
    }
    const sourceStat = await fs.stat(sourceDiskPath).catch(() => null);
    if (!sourceStat || !sourceStat.isFile()) {
      return NextResponse.json({ error: "Source file not found" }, { status: 404 });
    }

    await fs.mkdir(targetDiskDir, { recursive: true });
    let filename = path.basename(normalizedSource);
    const targetDiskPath = path.join(targetDiskDir, filename);
    const exists = await fs.stat(targetDiskPath).catch(() => null);
    if (exists) {
      filename = `${Date.now()}-${filename}`;
    }
    const finalDiskPath = path.join(targetDiskDir, filename);
    const finalPublicPath = `${targetPublicDir}/${filename}`.replace(/\\/g, "/");

    await fs.rename(sourceDiskPath, finalDiskPath);

    if (repoRecord) {
      const repo = await getImageFileRepository();
      const updated = await repo.updateImageFilePath(repoRecord.id, finalPublicPath);
      return NextResponse.json({ asset: updated ?? repoRecord, filepath: finalPublicPath });
    }

    return NextResponse.json({ asset: null, filepath: finalPublicPath });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "image-studio.projects.[projectId].assets.move.POST",
      fallbackMessage: "Failed to move asset",
      extra: { projectId: params.projectId },
    });
  }
}

export const POST = apiHandlerWithParams<{ projectId: string }>(
  async (req: NextRequest, ctx: ApiHandlerContext, params: { projectId: string }): Promise<Response> =>
    POST_handler(req, ctx, params),
  { source: "image-studio.projects.[projectId].assets.move.POST" }
);
