export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";
import { z } from "zod";

import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { badRequestError } from "@/shared/errors/app-error";

import { getImageFileRepository } from "@/features/files/server";
import type { ImageFileRecord } from "@/shared/types/files";

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

function resolveDiskPathFromPublicUploadPath(filepath: string): string | null {
  const clean = filepath.trim();
  if (!clean.startsWith("/uploads/")) return null;
  const resolved = path.resolve(process.cwd(), "public", clean.replace(/^\/+/, ""));
  const uploadsResolved = path.resolve(uploadsRoot);
  if (!resolved.startsWith(`${uploadsResolved}${path.sep}`)) return null;
  return resolved;
}

function sanitizeFilename(filename: string): string {
  const base = path.basename(filename);
  const sanitized = base.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^_+/, "");
  return sanitized || "import.bin";
}

const importSchema = z.object({
  files: z
    .array(
      z.object({
        id: z.string().min(1).optional(),
        filepath: z.string().min(1),
        filename: z.string().min(1).optional(),
        mimetype: z.string().min(1).optional(),
      })
    )
    .min(1),
  folder: z.string().optional(),
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
    const parsed = importSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const safeFolder =
      parsed.data.folder && parsed.data.folder.trim()
        ? sanitizeFolderPath(parsed.data.folder)
        : "";

    const diskDir = safeFolder
      ? path.join(projectsRoot, projectId, safeFolder)
      : path.join(projectsRoot, projectId);

    const publicDir = safeFolder
      ? `/uploads/studio/${projectId}/${safeFolder}`
      : `/uploads/studio/${projectId}`;

    await fs.mkdir(diskDir, { recursive: true });

    const ids = parsed.data.files.map((item) => item.id).filter(Boolean) as string[];
    let sourceById = new Map<string, ImageFileRecord>();
    let repo: Awaited<ReturnType<typeof getImageFileRepository>> | null = null;
    try {
      repo = await getImageFileRepository();
      if (ids.length > 0) {
        const records = await repo.findImageFilesByIds(ids);
        sourceById = new Map(records.map((record) => [record.id, record]));
      }
    } catch {
      repo = null;
      sourceById = new Map();
    }

    const uploaded: ImageFileRecord[] = [];
    const failures: Array<{ filepath: string; error: string }> = [];

    for (const item of parsed.data.files) {
      const diskSource = resolveDiskPathFromPublicUploadPath(item.filepath);
      if (!diskSource) {
        failures.push({ filepath: item.filepath, error: "Unsupported file path (must be under /uploads/)" });
        continue;
      }

      const stats = await fs.stat(diskSource).catch(() => null);
      if (!stats || !stats.isFile()) {
        failures.push({ filepath: item.filepath, error: "File not found on disk" });
        continue;
      }

      const sourceRecord = item.id ? sourceById.get(item.id) ?? null : null;
      const sourceName = sourceRecord?.filename || item.filename || path.basename(item.filepath);
      const safeName = sanitizeFilename(sourceName);
      const filename = `${Date.now()}-${randomUUID().slice(0, 8)}-${safeName}`;

      const destDiskPath = path.join(diskDir, filename);
      await fs.copyFile(diskSource, destDiskPath);

      const recordInput = {
        filename,
        filepath: `${publicDir}/${filename}`,
        mimetype: sourceRecord?.mimetype || item.mimetype || "application/octet-stream",
        size: stats.size,
        tags: [],
      };

      if (repo) {
        try {
          uploaded.push(await repo.createImageFile(recordInput));
          continue;
        } catch {
          // fall through to orphan record
        }
      }

      const now = new Date();
      uploaded.push({
        id: randomUUID(),
        filename: recordInput.filename,
        filepath: recordInput.filepath,
        mimetype: recordInput.mimetype,
        size: recordInput.size,
        width: null,
        height: null,
        tags: [],
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
    }

    if (uploaded.length === 0) {
      return NextResponse.json({ error: "No files imported", failures }, { status: 400 });
    }

    return NextResponse.json({ uploaded, failures }, { status: 201 });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "image-studio.projects.[projectId].assets.import.POST",
      fallbackMessage: "Failed to import assets",
      extra: { projectId: params.projectId },
    });
  }
}

export const POST = apiHandlerWithParams<{ projectId: string }>(
  async (req: NextRequest, ctx: ApiHandlerContext, params: { projectId: string }): Promise<Response> =>
    POST_handler(req, ctx, params),
  { source: "image-studio.projects.[projectId].assets.import.POST" }
);

