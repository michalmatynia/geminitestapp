export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";

import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { badRequestError } from "@/shared/errors/app-error";

import { getImageFileRepository } from "@/features/files/server";
import type { ImageFileRecord } from "@/shared/types/files";

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

type UploadedFileLike = {
  arrayBuffer: () => Promise<ArrayBuffer>;
  size: number;
  type?: string | undefined;
  name?: string | undefined;
};

function isUploadedFileLike(value: unknown): value is UploadedFileLike {
  if (!value || typeof value !== "object") return false;
  const maybe = value as Record<string, unknown>;
  return typeof maybe.arrayBuffer === "function" && typeof maybe.size === "number";
}

function extractUploadedFiles(formData: FormData): UploadedFileLike[] {
  const candidates = [
    ...formData.getAll("files"),
    ...formData.getAll("files[]"),
    ...formData.getAll("file"),
  ] as UploadedFileLike[];

  return candidates.filter(isUploadedFileLike);
}

async function uploadStudioFile(params: {
  projectId: string;
  file: UploadedFileLike;
  folderPath?: string | null | undefined;
}): Promise<ImageFileRecord> {
  const buffer = Buffer.from(await params.file.arrayBuffer());
  const rawName =
    typeof params.file.name === "string" && params.file.name.trim().length > 0
      ? params.file.name
      : "upload.bin";
  const filename = `${Date.now()}-${path.basename(rawName)}`;

  const safeFolder =
    params.folderPath && params.folderPath.trim()
      ? sanitizeFolderPath(params.folderPath)
      : "";

  const diskDir = safeFolder
    ? path.join(projectsRoot, params.projectId, safeFolder)
    : path.join(projectsRoot, params.projectId);

  const publicDir = safeFolder
    ? `/uploads/studio/${params.projectId}/${safeFolder}`
    : `/uploads/studio/${params.projectId}`;

  await fs.mkdir(diskDir, { recursive: true });
  await fs.writeFile(path.join(diskDir, filename), buffer);

  const recordInput = {
    filename,
    filepath: `${publicDir}/${filename}`,
    mimetype: params.file.type || "application/octet-stream",
    size: params.file.size,
    tags: [],
  };

  try {
    const imageFileRepository = await getImageFileRepository();
    return await imageFileRepository.createImageFile(recordInput);
  } catch {
    const now = new Date();
    return {
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
    };
  }
}

async function listStudioAssetsFromDisk(projectId: string): Promise<ImageFileRecord[]> {
  const projectDir = path.join(projectsRoot, projectId);
  const publicPrefix = `/uploads/studio/${projectId}`;
  const results: ImageFileRecord[] = [];

  const stack: Array<{ diskDir: string; relDir: string }> = [{ diskDir: projectDir, relDir: "" }];

  while (stack.length > 0) {
    const { diskDir, relDir } = stack.pop()!;
    const entries = await fs.readdir(diskDir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      const diskPath = path.join(diskDir, entry.name);
      const relPath = relDir ? `${relDir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        stack.push({ diskDir: diskPath, relDir: relPath });
        continue;
      }
      if (!entry.isFile()) continue;
      const stats = await fs.stat(diskPath).catch(() => null);
      if (!stats) continue;
      const filepath = `${publicPrefix}/${relPath}`.replace(/\\/g, "/");
      const createdAt = (stats.birthtime ?? stats.ctime).toISOString();
      const updatedAt = (stats.mtime ?? stats.ctime).toISOString();
      results.push({
        id: `disk:${filepath}`,
        filename: entry.name,
        filepath,
        mimetype: "application/octet-stream",
        size: stats.size,
        width: null,
        height: null,
        tags: [],
        createdAt,
        updatedAt,
      });
    }
  }

  return results;
}

async function GET_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { projectId: string }
): Promise<Response> {
  try {
    const projectId = sanitizeProjectId(params.projectId);
    if (!projectId) throw badRequestError("Project id is required");

    const prefix = `/uploads/studio/${projectId}/`;
    let repoAssets: ImageFileRecord[] = [];
    try {
      const imageFileRepository = await getImageFileRepository();
      const files = await imageFileRepository.listImageFiles();
      repoAssets = files
        .filter((file: ImageFileRecord) => typeof file.filepath === "string" && file.filepath.startsWith(prefix));
    } catch {
      // If repository/DB is down, we still want to show disk assets.
      repoAssets = [];
    }

    let diskAssets: ImageFileRecord[] = [];
    try {
      diskAssets = await listStudioAssetsFromDisk(projectId);
    } catch {
      diskAssets = [];
    }

    const byFilepath = new Map<string, ImageFileRecord>();
    repoAssets.forEach((asset) => {
      if (typeof asset.filepath === "string" && asset.filepath.startsWith(prefix)) {
        byFilepath.set(asset.filepath, asset);
      }
    });
    diskAssets.forEach((asset) => {
      if (!byFilepath.has(asset.filepath)) {
        byFilepath.set(asset.filepath, asset);
      }
    });

    const result = Array.from(byFilepath.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return NextResponse.json({ assets: result });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "image-studio.projects.[projectId].assets.GET",
      fallbackMessage: "Failed to load project assets",
      extra: { projectId: params.projectId },
    });
  }
}

async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { projectId: string }
): Promise<Response> {
  try {
    const projectId = sanitizeProjectId(params.projectId);
    if (!projectId) throw badRequestError("Project id is required");

    const formData = await req.formData();
    const folder = formData.get("folder");
    const files = extractUploadedFiles(formData);

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const uploaded: ImageFileRecord[] = [];
    for (const file of files) {
      uploaded.push(
        await uploadStudioFile({
          projectId,
          file,
          folderPath: typeof folder === "string" ? folder : null,
        })
      );
    }

    return NextResponse.json({ uploaded }, { status: 201 });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "image-studio.projects.[projectId].assets.POST",
      fallbackMessage: "Failed to upload assets",
      extra: { projectId: params.projectId },
    });
  }
}

export const GET = apiHandlerWithParams<{ projectId: string }>(
  async (req: NextRequest, ctx: ApiHandlerContext, params: { projectId: string }): Promise<Response> =>
    GET_handler(req, ctx, params),
  { source: "image-studio.projects.[projectId].assets.GET" }
);

export const POST = apiHandlerWithParams<{ projectId: string }>(
  async (req: NextRequest, ctx: ApiHandlerContext, params: { projectId: string }): Promise<Response> =>
    POST_handler(req, ctx, params),
  { source: "image-studio.projects.[projectId].assets.POST" }
);
