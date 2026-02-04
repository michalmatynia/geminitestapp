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
import { getBrainAssignmentForFeature } from "@/features/ai/brain/server";

const projectsRoot = path.join(process.cwd(), "public", "uploads", "studio");
const publicRoot = path.join(process.cwd(), "public");

const pointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

const polygonSchema = z.array(pointSchema).min(3);

const maskSchema = z.union([
  z.object({
    type: z.literal("polygon"),
    points: polygonSchema,
    closed: z.boolean(),
  }),
  z.object({
    type: z.literal("polygons"),
    polygons: z.array(polygonSchema).min(1),
    invert: z.boolean().optional(),
    feather: z.number().min(0).max(50).optional(),
  }),
]);

const runSchema = z.object({
  projectId: z.string().min(1).max(120),
  asset: z.object({
    filepath: z.string().min(1),
    id: z.string().optional(),
  }),
  referenceAssets: z
    .array(
      z.object({
        filepath: z.string().min(1),
        id: z.string().optional(),
      })
    )
    .optional(),
  prompt: z.string().min(1),
  mask: maskSchema.nullable().optional(),
  studioSettings: z.record(z.string(), z.unknown()).optional(),
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
  polygons: Array<Array<{ x: number; y: number }>>;
  invert?: boolean;
  feather?: number;
}): Promise<Buffer | null> {
  const metadata = await sharp(params.imagePath).metadata();
  const width = metadata.width ?? null;
  const height = metadata.height ?? null;
  if (!width || !height) return null;

  const polygons = params.polygons
    .map((poly) => poly.map((p) => `${Math.round(p.x * width)},${Math.round(p.y * height)}`).join(" "))
    .map((points) => `<polygon points="${points}" fill="${params.invert ? "white" : "black"}" fill-opacity="${params.invert ? 1 : 0}" />`)
    .join("\n");

  const svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${params.invert ? "black" : "white"}" fill-opacity="${params.invert ? 0 : 1}" />
  ${polygons}
</svg>`;

  let output = sharp(Buffer.from(svg));
  if (params.feather && params.feather > 0) {
    output = output.blur(Math.min(10, params.feather / 10));
  }
  return output.png().toBuffer();
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
    const brainAssignment = await getBrainAssignmentForFeature("image_studio");
    if (!brainAssignment.enabled) {
      throw configurationError("AI Brain is disabled for Image Studio.");
    }
    if (brainAssignment.provider === "agent") {
      throw configurationError("Image Studio runs do not support agent providers yet.");
    }

    const client = new OpenAI({ apiKey });

    const format = settings.targetAi.openai.image.format ?? "png";
    const overrides =
      settings.targetAi.openai.advanced_overrides && typeof settings.targetAi.openai.advanced_overrides === "object"
        ? settings.targetAi.openai.advanced_overrides
        : null;

    let polygons: Array<Array<{ x: number; y: number }>> = [];
    let invert = false;
    let feather = 0;
    if (parsed.data.mask) {
      if (parsed.data.mask.type === "polygon") {
        if (parsed.data.mask.closed && parsed.data.mask.points.length >= 3) {
          polygons = [parsed.data.mask.points];
        }
      } else {
        polygons = parsed.data.mask.polygons;
        invert = Boolean(parsed.data.mask.invert);
        feather = typeof parsed.data.mask.feather === "number" ? parsed.data.mask.feather : 0;
      }
    }
    const mask =
      polygons.length > 0
        ? await buildMaskBuffer({ imagePath: diskPath, polygons, invert, feather })
        : null;

    const referenceAssets = parsed.data.referenceAssets ?? [];
    const referencePaths: string[] = [];
    const seenPaths = new Set<string>();

    for (const ref of referenceAssets) {
      const refPath = ref.filepath;
      if (!refPath) continue;
      if (refPath === assetPath) continue;
      if (seenPaths.has(refPath)) continue;
      if (!refPath.startsWith(`/uploads/studio/${projectId}/`)) {
        throw badRequestError("Reference asset must belong to the current project.");
      }
      const refDiskPath = resolveAssetPath(refPath);
      ensureWithinProject(refDiskPath, projectId);
      await fs.stat(refDiskPath).catch(() => {
        throw badRequestError("Reference asset file not found.");
      });
      seenPaths.add(refPath);
      referencePaths.push(refDiskPath);
    }

    const maxImages = 16;
    if (referencePaths.length + 1 > maxImages) {
      throw badRequestError(`Too many input images. Limit is ${maxImages} total.`);
    }

    const resolvedModel = brainAssignment.modelId || settings.targetAi.openai.model;
    const modelName = (resolvedModel ?? "").toLowerCase();
    if (modelName.includes("dall-e-2") && referencePaths.length > 0) {
      throw badRequestError("Multiple input images are only supported for GPT image models.");
    }

    const inputImages = [createReadStream(diskPath), ...referencePaths.map((ref) => createReadStream(ref))];
    // This is a workaround due to OpenAI SDK not properly typing image/images in ImageEditParamsNonStreaming
    // when it expects either a single Uploadable or an array of Uploadable.
    // The specific error is "Namespace ... has no exported member 'Uploadable'".
    // Casting to any for now to bypass the build error.
    const imagePayload = inputImages.length === 1 ? inputImages[0]! : inputImages;

    const payload: OpenAI.Images.ImageEditParamsNonStreaming = {
      model: resolvedModel,
      prompt: parsed.data.prompt,
      image: imagePayload as unknown as OpenAI.Images.ImageEditParamsNonStreaming["image"],
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
