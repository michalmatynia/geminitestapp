export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { createReadStream } from "fs";
import { randomUUID } from "crypto";
import { z } from "zod";
import OpenAI, { toFile } from "openai";
import sharp from "sharp";

import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { badRequestError, configurationError, operationFailedError } from "@/shared/errors/app-error";

import { getImageFileRepository } from "@/features/files/server";
import type { ImageFileRecord } from "@/shared/types/files";
import { parseImageStudioSettings } from "@/features/ai/image-studio/utils/studio-settings";
import { getSettingValue } from "@/features/products/services/aiDescriptionService";

const projectsRoot = path.join(process.cwd(), "public", "uploads", "studio");
const publicRoot = path.join(process.cwd(), "public");

const pointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

const maskSchema = z.object({
  type: z.literal("polygon"),
  points: z.array(pointSchema).min(3),
  closed: z.boolean(),
});

const runSchema = z.object({
  projectId: z.string().min(1).max(120),
  asset: z.object({
    filepath: z.string().min(1),
    id: z.string().optional(),
  }),
  prompt: z.string().min(1),
  mask: maskSchema.nullable().optional(),
  studioSettings: z.unknown().optional(),
});

const sanitizeProjectId = (value: string): string =>
  value.trim().replace(/[^a-zA-Z0-9-_]/g, "_");

const resolveAssetPath = (filepath: string): string => {
  const normalized = filepath.replace(/^\/+/, "");
  return path.resolve(publicRoot, normalized);
};

const ensureWithinProject = (diskPath: string, projectId: string): void => {
  const projectRoot = path.resolve(projectsRoot, projectId);
  if (!diskPath.startsWith(`${projectRoot}${path.sep}`)) {
    throw badRequestError("Asset path is outside the project.");
  }
};

const toOutputFolder = (projectId: string): string =>
  path.join(projectsRoot, projectId, "outputs");

const mapBackground = (value: string | null | undefined): "transparent" | "opaque" | "auto" | null => {
  if (!value) return null;
  if (value === "transparent") return "transparent";
  if (value === "white") return "opaque";
  return "auto";
};

const coerceImageSize = (value: string | null | undefined): OpenAI.Images.ImageEditParams["size"] => {
  if (!value) return undefined;
  const allowed = new Set([
    "auto",
    "256x256",
    "512x512",
    "1024x1024",
    "1536x1024",
    "1024x1536",
  ]);
  return allowed.has(value) ? (value as OpenAI.Images.ImageEditParams["size"]) : undefined;
};

async function buildMaskBuffer(params: {
  imagePath: string;
  points: Array<{ x: number; y: number }>;
}): Promise<Buffer | null> {
  const metadata = await sharp(params.imagePath).metadata();
  const width = metadata.width ?? null;
  const height = metadata.height ?? null;
  if (!width || !height) return null;

  const points = params.points
    .map((p) => `${Math.round(p.x * width)},${Math.round(p.y * height)}`)
    .join(" ");

  const svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="white" />
  <polygon points="${points}" fill="black" fill-opacity="0" />
</svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function createImageRecord(params: {
  projectId: string;
  buffer: Buffer;
  extension: string;
}): Promise<ImageFileRecord> {
  const folder = toOutputFolder(params.projectId);
  await fs.mkdir(folder, { recursive: true });

  const filename = `edit-${Date.now()}-${randomUUID().slice(0, 6)}.${params.extension}`;
  const diskPath = path.join(folder, filename);
  await fs.writeFile(diskPath, params.buffer);

  const filepath = `/uploads/studio/${params.projectId}/outputs/${filename}`;
  const mimetype = params.extension === "jpeg" ? "image/jpeg" : "image/png";
  const now = new Date();

  try {
    const repo = await getImageFileRepository();
    return await repo.createImageFile({
      filename,
      filepath,
      mimetype,
      size: params.buffer.length,
      tags: ["image-studio", "output"],
    });
  } catch {
    return {
      id: randomUUID(),
      filename,
      filepath,
      mimetype,
      size: params.buffer.length,
      width: null,
      height: null,
      tags: ["image-studio", "output"],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
  }
}

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    const body = (await req.json().catch(() => null)) as unknown;
    const parsed = runSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const projectId = sanitizeProjectId(parsed.data.projectId);
    if (!projectId) throw badRequestError("Project id is required.");

    const assetPath = parsed.data.asset.filepath;
    if (!assetPath.startsWith(`/uploads/studio/${projectId}/`)) {
      throw badRequestError("Asset must belong to the current project.");
    }

    const diskPath = resolveAssetPath(assetPath);
    ensureWithinProject(diskPath, projectId);

    await fs.stat(diskPath).catch(() => {
      throw badRequestError("Asset file not found.");
    });

    const settings = parseImageStudioSettings(
      parsed.data.studioSettings ? JSON.stringify(parsed.data.studioSettings) : null
    );

    if (settings.targetAi.openai.api !== "images") {
      throw badRequestError("Image Studio run currently supports the Images API only.");
    }

    const apiKey =
      (await getSettingValue("openai_api_key")) ?? process.env.OPENAI_API_KEY ?? null;
    if (!apiKey) {
      throw configurationError("OpenAI API key is missing. Set it in /admin/settings/ai.");
    }

    const client = new OpenAI({ apiKey });

    const format = settings.targetAi.openai.image.format ?? "png";
    const overrides =
      settings.targetAi.openai.advanced_overrides && typeof settings.targetAi.openai.advanced_overrides === "object"
        ? settings.targetAi.openai.advanced_overrides
        : null;

    const mask =
      parsed.data.mask && parsed.data.mask.closed && parsed.data.mask.points.length >= 3
        ? await buildMaskBuffer({ imagePath: diskPath, points: parsed.data.mask.points })
        : null;

    const payload: OpenAI.Images.ImageEditParamsNonStreaming = {
      model: settings.targetAi.openai.model,
      prompt: parsed.data.prompt,
      image: createReadStream(diskPath),
      output_format: format,
      response_format: "b64_json",
    };

    if (typeof settings.targetAi.openai.image.n === "number") {
      payload.n = settings.targetAi.openai.image.n;
    }
    const size = coerceImageSize(settings.targetAi.openai.image.size ?? null);
    if (size) {
      payload.size = size;
    }
    if (settings.targetAi.openai.image.quality) {
      payload.quality = settings.targetAi.openai.image.quality;
    }
    const background = mapBackground(settings.targetAi.openai.image.background);
    if (background) {
      payload.background = background;
    }
    if (settings.targetAi.openai.user) {
      payload.user = settings.targetAi.openai.user;
    }

    if (mask) {
      payload.mask = await toFile(mask, "mask.png");
    }

    if (overrides) {
      const { image, mask: overrideMask, prompt, ...rest } =
        overrides as Partial<OpenAI.Images.ImageEditParamsNonStreaming>;
      void image;
      void overrideMask;
      void prompt;
      const target = payload as unknown as Record<string, unknown>;
      Object.entries(rest).forEach(([key, value]) => {
        if (value !== undefined) {
          target[key] = value as unknown;
        }
      });
    }

    const response = await client.images.edit(payload);
    const images = response.data ?? [];
    if (images.length === 0) {
      throw operationFailedError("Image API returned no images.");
    }

    const outputs: ImageFileRecord[] = [];
    for (const img of images) {
      if (!img.b64_json) {
        throw operationFailedError("Image API did not return base64 data.");
      }
      const buffer = Buffer.from(img.b64_json, "base64");
      const record = await createImageRecord({
        projectId,
        buffer,
        extension: format === "jpeg" ? "jpeg" : "png",
      });
      outputs.push(record);
    }

    return NextResponse.json({ outputs });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "image-studio.run.POST",
      fallbackMessage: "Failed to run Image Studio",
    });
  }
}

export const POST = apiHandler(async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx), {
  source: "image-studio.run.POST",
});
