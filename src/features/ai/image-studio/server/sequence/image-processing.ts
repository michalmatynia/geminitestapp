import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import {
  createImageStudioSlots,
} from '@/features/ai/image-studio/server/slot-repository';
import type {
  ImageStudioSlotRecord,
  ImageStudioSequenceRunRecord,
} from '@/shared/contracts/image-studio';
import {
  STUDIO_UPLOADS_ROOT,
  sanitizeSegment,
  guessExtensionFromMime,
  normalizePublicPath,
  resolveSlotImagePath,
} from './utils';

export async function executeCropStep(params: {
  run: ImageStudioSequenceRunRecord;
  step: ImageStudioSequenceCropStep;
  currentSlot: ImageStudioSlotRecord;
}): Promise<{ nextSlotId: string; producedSlotIds: string[] }> {
  const { run, step, currentSlot } = params;
  const sourcePath = resolveSlotImagePath(currentSlot);
  if (!sourcePath) throw new Error('Crop: Input slot has no image.');

  const diskPath = getDiskPathFromPublicPath(sourcePath);
  const metadata = await sharp(diskPath).metadata();

  const outputFilename = `crop_${Date.now()}.png`;
  const relativeDir = path.join(sanitizeSegment(run.projectId), 'sequences', run.id);
  const outputDir = path.join(STUDIO_UPLOADS_ROOT, relativeDir);
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, outputFilename);

  const config = step.config as Record<string, unknown>;
  const bbox = (config['bbox'] || {}) as Record<string, number>;

  await sharp(diskPath)
    .extract({
      left: Math.round(((bbox['x'] ?? 0) / 100) * (metadata.width ?? 0)),
      top: Math.round(((bbox['y'] ?? 0) / 100) * (metadata.height ?? 0)),
      width: Math.round(((bbox['width'] ?? 100) / 100) * (metadata.width ?? 0)),
      height: Math.round(((bbox['height'] ?? 100) / 100) * (metadata.height ?? 0)),
    })
    .toFile(outputPath);

  const imageRepo = await getImageFileRepository();
  const imageFile = await imageRepo.createImageFile({
    filepath: normalizePublicPath(path.join('uploads/studio', relativeDir, outputFilename)) || '',
    filename: outputFilename,
    mimetype: 'image/png',
    size: (await fs.stat(outputPath)).size,
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
  });

  const [newSlot] = await createImageStudioSlots(run.projectId, [
    {
      imageFileId: imageFile.id,
      name: `Cropped (${step.config.kind})`,
      metadata: { sourceSlotId: currentSlot.id, stepId: step.id },
    },
  ]);

  if (!newSlot) throw new Error('Failed to create cropped slot.');

  return { nextSlotId: newSlot.id, producedSlotIds: [newSlot.id] };
}

export async function executeUpscaleStep(params: {
  run: ImageStudioSequenceRunRecord;
  step: ImageStudioSequenceUpscaleStep;
  currentSlot: ImageStudioSlotRecord;
}): Promise<{ nextSlotId: string; producedSlotIds: string[] }> {
  const { run, step, currentSlot } = params;
  const sourcePath = resolveSlotImagePath(currentSlot);
  if (!sourcePath) throw new Error('Upscale: Input slot has no image.');

  const diskPath = getDiskPathFromPublicPath(sourcePath);
  const metadata = await sharp(diskPath).metadata();
  validateUpscaleSourceDimensions(metadata.width ?? 0, metadata.height ?? 0);

  const sourceBuffer = await fs.readFile(diskPath);
  const upscaleResult = await upscaleImageWithSharp({
    sourceBuffer,
    sourceWidth: metadata.width ?? 0,
    sourceHeight: metadata.height ?? 0,
    scale: step.config.scale,
    strategy: step.config.strategy,
  });

  const outputFilename = `upscale_${Date.now()}${guessExtensionFromMime(upscaleResult.outputMime)}`;
  const relativeDir = path.join(sanitizeSegment(run.projectId), 'sequences', run.id);
  const outputDir = path.join(STUDIO_UPLOADS_ROOT, relativeDir);
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, outputFilename);
  await fs.writeFile(outputPath, upscaleResult.outputBuffer);

  const imageRepo = await getImageFileRepository();
  const imageFile = await imageRepo.createImageFile({
    filepath: normalizePublicPath(path.join('uploads/studio', relativeDir, outputFilename)) || '',
    filename: outputFilename,
    mimetype: upscaleResult.outputMime,
    size: upscaleResult.outputBuffer.length,
    width: upscaleResult.outputWidth,
    height: upscaleResult.outputHeight,
  });

  const [newSlot] = await createImageStudioSlots(run.projectId, [
    {
      imageFileId: imageFile.id,
      name: `Upscaled (x${step.config.scale})`,
      metadata: { sourceSlotId: currentSlot.id, stepId: step.id },
    },
  ]);

  if (!newSlot) throw new Error('Failed to create upscaled slot.');

  return { nextSlotId: newSlot.id, producedSlotIds: [newSlot.id] };
}
