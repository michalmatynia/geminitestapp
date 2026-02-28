import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import {
  type ImageStudioSlotRecord,
  createImageStudioSlots,
} from '@/features/ai/image-studio/server/slot-repository';
import {
  upscaleImageWithSharp,
  validateUpscaleSourceDimensions,
} from '@/features/ai/image-studio/server/upscale-utils';
import { getDiskPathFromPublicPath, getImageFileRepository } from '@/shared/lib/files/services/image-file-service';
import { 
  type ImageStudioSequenceCropStep, 
  type ImageStudioSequenceUpscaleStep 
} from '@/features/ai/image-studio/utils/studio-settings';
import type { ImageStudioSequenceRunRecord } from '../sequence-run-repository';
import {
  STUDIO_UPLOADS_ROOT,
  sanitizeSegment,
  sanitizeFilename,
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

  await sharp(diskPath)
    .extract({
      left: Math.round((step.config.x / 100) * (metadata.width ?? 0)),
      top: Math.round((step.config.y / 100) * (metadata.height ?? 0)),
      width: Math.round((step.config.width / 100) * (metadata.width ?? 0)),
      height: Math.round((step.config.height / 100) * (metadata.height ?? 0)),
    })
    .toFile(outputPath);

  const imageRepo = getImageFileRepository();
  const imageFile = await imageRepo.createImageFile({
    filepath: normalizePublicPath(path.join('uploads/studio', relativeDir, outputFilename)),
    filename: outputFilename,
    mime: 'image/png',
    size: (await fs.stat(outputPath)).size,
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
  });

  const [newSlot] = await createImageStudioSlots(run.projectId, [
    {
      imageFileId: imageFile.id,
      label: `Cropped (${step.config.kind})`,
      metadata: { sourceSlotId: currentSlot.id, stepId: step.id },
    },
  ]);

  return { nextSlotId: newSlot!.id, producedSlotIds: [newSlot!.id] };
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

  const upscaleResult = await upscaleImageWithSharp(diskPath, {
    mode: 'scale',
    scale: step.config.scale,
    strategy: step.config.strategy,
  });

  const outputFilename = `upscale_${Date.now()}${guessExtensionFromMime(upscaleResult.mime)}`;
  const relativeDir = path.join(sanitizeSegment(run.projectId), 'sequences', run.id);
  const outputDir = path.join(STUDIO_UPLOADS_ROOT, relativeDir);
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, outputFilename);
  await fs.writeFile(outputPath, upscaleResult.buffer);

  const imageRepo = getImageFileRepository();
  const imageFile = await imageRepo.createImageFile({
    filepath: normalizePublicPath(path.join('uploads/studio', relativeDir, outputFilename)),
    filename: outputFilename,
    mime: upscaleResult.mime,
    size: upscaleResult.buffer.length,
    width: upscaleResult.width,
    height: upscaleResult.height,
  });

  const [newSlot] = await createImageStudioSlots(run.projectId, [
    {
      imageFileId: imageFile.id,
      label: `Upscaled (x${step.config.scale})`,
      metadata: { sourceSlotId: currentSlot.id, stepId: step.id },
    },
  ]);

  return { nextSlotId: newSlot!.id, producedSlotIds: [newSlot!.id] };
}
