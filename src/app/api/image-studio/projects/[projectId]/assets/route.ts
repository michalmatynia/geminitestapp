export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

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

async function uploadStudioFile(params: {
  projectId: string;
  file: File;
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

  const imageFileRepository = await getImageFileRepository();
  return imageFileRepository.createImageFile({
    filename,
    filepath: `${publicDir}/${filename}`,
    mimetype: params.file.type || "application/octet-stream",
    size: params.file.size,
    tags: [],
  });
}

async function GET_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { projectId: string }
): Promise<Response> {
  try {
    const projectId = sanitizeProjectId(params.projectId);
    if (!projectId) throw badRequestError("Project id is required");

    const imageFileRepository = await getImageFileRepository();
    const files = await imageFileRepository.listImageFiles();
    const prefix = `/uploads/studio/${projectId}/`;
    const result = files
      .filter((file: ImageFileRecord) => typeof file.filepath === "string" && file.filepath.startsWith(prefix))
      .sort((a: ImageFileRecord, b: ImageFileRecord) => b.createdAt.localeCompare(a.createdAt));

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
    const files = formData.getAll("files").filter((item): item is File => item instanceof File);

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

