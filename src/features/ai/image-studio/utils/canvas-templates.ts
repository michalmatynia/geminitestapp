import { z } from 'zod';

export const IMAGE_STUDIO_CANVAS_TEMPLATES_KEY = 'image_studio_canvas_templates';

export type ImageStudioCanvasTemplate = {
  id: string;
  width: number;
  height: number;
  label: string;
};

export const DEFAULT_IMAGE_STUDIO_CANVAS_TEMPLATES: ImageStudioCanvasTemplate[] = [
  { id: 'template_2000x2000', width: 2000, height: 2000, label: '2000 x 2000' },
  { id: 'template_2000x3000', width: 2000, height: 3000, label: '2000 x 3000' },
];

const canvasTemplateSchema = z.object({
  id: z.string().trim().min(1),
  width: z.number().int().min(64).max(32_768),
  height: z.number().int().min(64).max(32_768),
  label: z.string().trim().min(1),
});

const canvasTemplateListSchema = z.array(canvasTemplateSchema);

export function parseImageStudioCanvasTemplates(
  raw: string | null | undefined,
): ImageStudioCanvasTemplate[] {
  if (!raw?.trim()) {
    return [...DEFAULT_IMAGE_STUDIO_CANVAS_TEMPLATES];
  }

  try {
    const parsedJson = JSON.parse(raw) as unknown;
    const parsed = canvasTemplateListSchema.safeParse(parsedJson);
    if (!parsed.success) {
      return [...DEFAULT_IMAGE_STUDIO_CANVAS_TEMPLATES];
    }

    const deduped = new Set<string>();
    return parsed.data.filter((entry) => {
      if (deduped.has(entry.id)) return false;
      deduped.add(entry.id);
      return true;
    });
  } catch {
    return [...DEFAULT_IMAGE_STUDIO_CANVAS_TEMPLATES];
  }
}
