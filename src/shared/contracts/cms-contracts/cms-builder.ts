import { z } from 'zod';

/**
 * CMS Inspector Settings DTO
 */
export const cmsInspectorSettingsSchema = z.object({
  showTooltip: z.boolean(),
  showStyleSettings: z.boolean(),
  showStructureInfo: z.boolean(),
  showIdentifiers: z.boolean(),
  showVisibilityInfo: z.boolean(),
  showConnectionInfo: z.boolean(),
  showEditorChrome: z.boolean(),
  showLayoutGuides: z.boolean().optional(),
  pauseAnimations: z.boolean().optional(),
});

export type CmsInspectorSettingsDto = z.infer<typeof cmsInspectorSettingsSchema>;
export type InspectorSettings = CmsInspectorSettingsDto;

export const DEFAULT_INSPECTOR_SETTINGS: InspectorSettings = {
  showTooltip: true,
  showStyleSettings: true,
  showStructureInfo: true,
  showIdentifiers: true,
  showVisibilityInfo: true,
  showConnectionInfo: true,
  showEditorChrome: true,
  showLayoutGuides: true,
  pauseAnimations: false,
};

/**
 * CMS Page Builder Contracts
 */
export type BlockInstance = {
  id: string;
  type: string;
  settings: Record<string, unknown>;
  blocks?: BlockInstance[] | undefined;
};

export const cmsBlockInstanceSchema: z.ZodType<BlockInstance> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: z.string(),
    settings: z.record(z.string(), z.unknown()),
    blocks: z.array(cmsBlockInstanceSchema).optional(),
  })
);

export const pageZoneSchema = z.enum(['header', 'template', 'footer']);
export type PageZoneDto = z.infer<typeof pageZoneSchema>;
export type PageZone = PageZoneDto;

export type SectionInstance = {
  id: string;
  type: string;
  zone: PageZoneDto;
  parentSectionId?: string | null;
  settings: Record<string, unknown>;
  blocks: BlockInstance[];
};

export const cmsSectionInstanceSchema: z.ZodType<SectionInstance> = z.object({
  id: z.string(),
  type: z.string(),
  zone: pageZoneSchema,
  parentSectionId: z.string().nullable().optional(),
  settings: z.record(z.string(), z.unknown()),
  blocks: z.array(cmsBlockInstanceSchema),
});

export const sectionHierarchyClipboardDataSchema = z.object({
  rootSectionId: z.string(),
  sections: z.array(cmsSectionInstanceSchema),
});

export const clipboardDataSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('section'),
    data: cmsSectionInstanceSchema,
  }),
  z.object({
    type: z.literal('block'),
    data: cmsBlockInstanceSchema,
  }),
  z.object({
    type: z.literal('section_hierarchy'),
    data: sectionHierarchyClipboardDataSchema,
  }),
]);

export type ClipboardDataDto = z.infer<typeof clipboardDataSchema>;
export type ClipboardData = ClipboardDataDto;
