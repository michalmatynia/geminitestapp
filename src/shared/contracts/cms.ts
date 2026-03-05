import { z } from 'zod';

import { dtoBaseSchema, namedDtoSchema } from './base';
import { chatMessageSchema } from './chatbot';

export const cmsPageStatusSchema = z.enum(['draft', 'published', 'scheduled']);
export type CmsPageStatusDto = z.infer<typeof cmsPageStatusSchema>;
export type PageStatus = CmsPageStatusDto;

export const cmsPageSlugLinkSchema = z.object({
  slug: z.object({
    id: z.string(),
    slug: z.string(),
  }),
});

export type CmsPageSlugLinkDto = z.infer<typeof cmsPageSlugLinkSchema>;
export type PageSlugLink = CmsPageSlugLinkDto;

export const cmsPageSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  status: cmsPageStatusSchema,
  slugs: z.array(cmsPageSlugLinkSchema),
});

export type CmsPageSummaryDto = z.infer<typeof cmsPageSummarySchema>;
export type PageSummary = CmsPageSummaryDto;

/**
 * CMS Theme Contract
 */
export const cmsThemeColorsSchema = z.object({
  primary: z.string(),
  secondary: z.string(),
  accent: z.string(),
  background: z.string(),
  surface: z.string(),
  text: z.string(),
  muted: z.string(),
});
export type CmsThemeColors = z.infer<typeof cmsThemeColorsSchema>;

export const cmsThemeTypographySchema = z.object({
  headingFont: z.string(),
  bodyFont: z.string(),
  baseSize: z.number(),
  headingWeight: z.number(),
  bodyWeight: z.number(),
});
export type CmsThemeTypography = z.infer<typeof cmsThemeTypographySchema>;

export const cmsThemeSpacingSchema = z.object({
  sectionPadding: z.string(),
  containerMaxWidth: z.string(),
});
export type CmsThemeSpacing = z.infer<typeof cmsThemeSpacingSchema>;

export const cmsThemeSchema = namedDtoSchema.extend({
  colors: cmsThemeColorsSchema,
  typography: cmsThemeTypographySchema,
  spacing: cmsThemeSpacingSchema,
  customCss: z.string().optional(),
  isDefault: z.boolean(),
});

export type CmsThemeDto = z.infer<typeof cmsThemeSchema>;
export type CmsTheme = CmsThemeDto;

export const createCmsThemeSchema = cmsThemeSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateCmsThemeDto = z.infer<typeof createCmsThemeSchema>;
export type CmsThemeCreateInput = CreateCmsThemeDto;
export type UpdateCmsThemeDto = Partial<CreateCmsThemeDto>;
export type CmsThemeUpdateInput = UpdateCmsThemeDto;

/**
 * CMS Component Contract
 */
export const cmsPageBuilderComponentContentSchema = z
  .object({
    zone: z.lazy(() => pageZoneSchema),
    settings: z.record(z.string(), z.unknown()),
    blocks: z.array(z.lazy(() => cmsBlockInstanceSchema)),
    sectionId: z.string(),
    parentSectionId: z.string().nullable(),
  })
  .strict();

export type CmsPageBuilderComponentContentDto = z.infer<
  typeof cmsPageBuilderComponentContentSchema
>;

export const cmsPageComponentSchema = dtoBaseSchema.extend({
  type: z.string(),
  order: z.number(),
  content: cmsPageBuilderComponentContentSchema,
  pageId: z.string(),
});

export type CmsPageComponentDto = z.infer<typeof cmsPageComponentSchema>;
export type PageComponent = CmsPageComponentDto;

export const createCmsPageComponentSchema = cmsPageComponentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateCmsPageComponentDto = z.infer<typeof createCmsPageComponentSchema>;
export type UpdateCmsPageComponentDto = Partial<CreateCmsPageComponentDto>;

export const cmsPageComponentInputSchema = z.object({
  type: z.string(),
  order: z.number(),
  content: cmsPageBuilderComponentContentSchema,
}).strict();

export type CmsPageComponentInputDto = z.infer<typeof cmsPageComponentInputSchema>;
export type PageComponentInput = CmsPageComponentInputDto;

/**
 * CMS Slug Contract
 */
export const cmsSlugSchema = dtoBaseSchema.extend({
  slug: z.string(),
  pageId: z.string().nullable(),
  isDefault: z.boolean(),
});

export type CmsSlugDto = z.infer<typeof cmsSlugSchema>;
export type Slug = CmsSlugDto;

export const createCmsSlugSchema = cmsSlugSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateCmsSlugDto = z.infer<typeof createCmsSlugSchema>;
export type UpdateCmsSlugDto = Partial<CreateCmsSlugDto>;

/**
 * CMS Domain Contract
 */
export const cmsDomainSchema = namedDtoSchema.extend({
  domain: z.string(),
  aliasOf: z.string().nullable().optional(),
});

export type CmsDomainDto = z.infer<typeof cmsDomainSchema>;
export type CmsDomain = CmsDomainDto;

export const createCmsDomainSchema = cmsDomainSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateCmsDomainDto = z.infer<typeof createCmsDomainSchema>;
export type UpdateCmsDomainDto = Partial<CreateCmsDomainDto>;

/**
 * CMS Page SEO Contract
 */
export const cmsPageSeoSchema = z.object({
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoOgImage: z.string().optional(),
  seoCanonical: z.string().optional(),
  robotsMeta: z.string().optional(),
});

export type CmsPageSeoDto = z.infer<typeof cmsPageSeoSchema>;
export type PageSeoData = CmsPageSeoDto;

/**
 * CMS Page Builder Contracts
 */
export type BlockInstance = {
  id: string;
  type: string;
  settings: Record<string, unknown>;
  blocks?: BlockInstance[] | undefined;
};

export interface PreviewBlockItemProps {
  block: BlockInstance;
}

export interface PreviewBlockProps {
  block: BlockInstance;
  stretch?: boolean;
  mediaStyles?: React.CSSProperties;
}

export interface PreviewSectionBlockProps {
  section: SectionInstance;
  colorSchemes?: Record<string, unknown>;
  mediaStyles?: React.CSSProperties;
}

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
  zone: PageZone;
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

export interface BulkOperationResult {
  ok: boolean;
  count?: number;
  message?: string;
  error?: string;
}

export interface MasterTreePasteResult {
  ok: boolean;
  nextId?: string;
  error?: string;
}

export interface SectionDragData {
  sectionId: string;
  zone: PageZone;
}

export interface BlockDragData {
  blockId: string;
  sectionId: string;
  columnId?: string;
  parentBlockId?: string;
}

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

export const pageBuilderSnapshotSchema = z.object({
  currentPage: z.lazy(() => cmsPageSchema).nullable(),
  sections: z.array(cmsSectionInstanceSchema),
});

export type PageBuilderSnapshotDto = z.infer<typeof pageBuilderSnapshotSchema>;
export type PageBuilderSnapshot = PageBuilderSnapshotDto;

export const pageBuilderHistoryDtoSchema = z.object({
  past: z.array(pageBuilderSnapshotSchema),
  future: z.array(pageBuilderSnapshotSchema),
});

export type PageBuilderHistoryDto = z.infer<typeof pageBuilderHistoryDtoSchema>;
export type PageBuilderHistory = PageBuilderHistoryDto;

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

export const pageBuilderStateSchema = z.object({
  pages: z.array(cmsPageSummarySchema),
  currentPage: z.lazy(() => cmsPageSchema).nullable(),
  sections: z.array(cmsSectionInstanceSchema),
  selectedNodeId: z.string().nullable(),
  inspectorEnabled: z.boolean(),
  inspectorSettings: cmsInspectorSettingsSchema,
  previewMode: z.enum(['desktop', 'mobile']),
  leftPanelCollapsed: z.boolean(),
  rightPanelCollapsed: z.boolean(),
  clipboard: clipboardDataSchema.nullable(),
  history: pageBuilderHistoryDtoSchema,
});

export type PageBuilderStateDto = z.infer<typeof pageBuilderStateSchema>;
export type PageBuilderState = PageBuilderStateDto;

export const pageBuilderActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('UNDO') }),
  z.object({ type: z.literal('REDO') }),
  z.object({ type: z.literal('SET_PAGES'), pages: z.array(cmsPageSummarySchema) }),
  z.object({ type: z.literal('SET_CURRENT_PAGE'), page: z.lazy(() => cmsPageSchema) }),
  z.object({ type: z.literal('CLEAR_CURRENT_PAGE') }),
  z.object({ type: z.literal('SELECT_NODE'), nodeId: z.string().nullable() }),
  z.object({
    type: z.literal('ADD_SECTION'),
    sectionType: z.string(),
    zone: pageZoneSchema,
    initialSettings: z.record(z.string(), z.unknown()).optional(),
  }),
  z.object({ type: z.literal('REMOVE_SECTION'), sectionId: z.string() }),
  z.object({ type: z.literal('ADD_BLOCK'), sectionId: z.string(), blockType: z.string() }),
  z.object({ type: z.literal('REMOVE_BLOCK'), sectionId: z.string(), blockId: z.string() }),
  z.object({
    type: z.literal('UPDATE_SECTION_SETTINGS'),
    sectionId: z.string(),
    settings: z.record(z.string(), z.unknown()),
  }),
  z.object({
    type: z.literal('UPDATE_BLOCK_SETTINGS'),
    sectionId: z.string(),
    blockId: z.string(),
    settings: z.record(z.string(), z.unknown()),
  }),
  z.object({
    type: z.literal('MOVE_BLOCK'),
    blockId: z.string(),
    fromSectionId: z.string(),
    toSectionId: z.string(),
    toIndex: z.number(),
  }),
  z.object({
    type: z.literal('REORDER_BLOCKS'),
    sectionId: z.string(),
    fromIndex: z.number(),
    toIndex: z.number(),
  }),
  z.object({ type: z.literal('SET_GRID_COLUMNS'), sectionId: z.string(), columnCount: z.number() }),
  z.object({ type: z.literal('SET_GRID_ROWS'), sectionId: z.string(), rowCount: z.number() }),
  z.object({ type: z.literal('ADD_GRID_ROW'), sectionId: z.string() }),
  z.object({ type: z.literal('REMOVE_GRID_ROW'), sectionId: z.string(), rowId: z.string() }),
  z.object({ type: z.literal('ADD_COLUMN_TO_ROW'), sectionId: z.string(), rowId: z.string() }),
  z.object({
    type: z.literal('REMOVE_COLUMN_FROM_ROW'),
    sectionId: z.string(),
    columnId: z.string(),
    rowId: z.string().optional(),
  }),
  z.object({
    type: z.literal('ADD_BLOCK_TO_COLUMN'),
    sectionId: z.string(),
    columnId: z.string(),
    blockType: z.string(),
  }),
  z.object({
    type: z.literal('REMOVE_BLOCK_FROM_COLUMN'),
    sectionId: z.string(),
    columnId: z.string(),
    blockId: z.string(),
  }),
  z.object({
    type: z.literal('UPDATE_COLUMN_SETTINGS'),
    sectionId: z.string(),
    columnId: z.string(),
    settings: z.record(z.string(), z.unknown()),
  }),
  z.object({
    type: z.literal('UPDATE_BLOCK_IN_COLUMN'),
    sectionId: z.string(),
    columnId: z.string(),
    blockId: z.string(),
    settings: z.record(z.string(), z.unknown()),
  }),
  z.object({
    type: z.literal('MOVE_BLOCK_TO_COLUMN'),
    blockId: z.string(),
    fromSectionId: z.string(),
    fromColumnId: z.string().optional(),
    fromParentBlockId: z.string().optional(),
    toSectionId: z.string(),
    toColumnId: z.string(),
    toParentBlockId: z.string().optional(),
    toIndex: z.number(),
  }),
  z.object({
    type: z.literal('MOVE_BLOCK_TO_ROW'),
    blockId: z.string(),
    fromSectionId: z.string(),
    fromColumnId: z.string().optional(),
    fromParentBlockId: z.string().optional(),
    toSectionId: z.string(),
    toRowId: z.string(),
    toParentBlockId: z.string().optional(),
    toIndex: z.number(),
  }),
  z.object({
    type: z.literal('MOVE_BLOCK_TO_SECTION'),
    blockId: z.string(),
    fromSectionId: z.string(),
    fromColumnId: z.string().optional(),
    fromParentBlockId: z.string().optional(),
    toSectionId: z.string(),
    toParentBlockId: z.string().optional(),
    toIndex: z.number(),
  }),
  z.object({
    type: z.literal('CONVERT_BLOCK_TO_SECTION'),
    blockId: z.string(),
    fromSectionId: z.string(),
    fromColumnId: z.string().optional(),
    fromParentBlockId: z.string().optional(),
    toZone: pageZoneSchema,
    toIndex: z.number(),
  }),
  z.object({
    type: z.literal('CONVERT_SECTION_TO_BLOCK'),
    sectionId: z.string(),
    toSectionId: z.string(),
    toIndex: z.number(),
  }),
  z.object({
    type: z.literal('MOVE_SECTION_TO_COLUMN'),
    sectionId: z.string(),
    toSectionId: z.string(),
    toColumnId: z.string(),
    toParentBlockId: z.string().optional(),
    toIndex: z.number(),
  }),
  z.object({
    type: z.literal('ADD_ELEMENT_TO_NESTED_BLOCK'),
    sectionId: z.string(),
    columnId: z.string(),
    parentBlockId: z.string(),
    elementType: z.string(),
  }),
  z.object({
    type: z.literal('REMOVE_ELEMENT_FROM_NESTED_BLOCK'),
    sectionId: z.string(),
    columnId: z.string(),
    parentBlockId: z.string(),
    elementId: z.string(),
  }),
  z.object({
    type: z.literal('UPDATE_NESTED_BLOCK_SETTINGS'),
    sectionId: z.string(),
    columnId: z.string(),
    parentBlockId: z.string(),
    blockId: z.string(),
    settings: z.record(z.string(), z.unknown()),
  }),
  z.object({
    type: z.literal('ADD_ELEMENT_TO_SECTION_BLOCK'),
    sectionId: z.string(),
    parentBlockId: z.string(),
    elementType: z.string(),
  }),
  z.object({
    type: z.literal('REMOVE_ELEMENT_FROM_SECTION_BLOCK'),
    sectionId: z.string(),
    parentBlockId: z.string(),
    elementId: z.string(),
  }),
  z.object({
    type: z.literal('UPDATE_SECTION_BLOCK_SETTINGS'),
    sectionId: z.string(),
    parentBlockId: z.string(),
    blockId: z.string(),
    settings: z.record(z.string(), z.unknown()),
  }),
  z.object({
    type: z.literal('REORDER_SECTIONS'),
    zone: pageZoneSchema,
    fromIndex: z.number(),
    toIndex: z.number(),
  }),
  z.object({
    type: z.literal('MOVE_SECTION_TO_ZONE'),
    sectionId: z.string(),
    toZone: pageZoneSchema,
    toIndex: z.number(),
  }),
  z.object({
    type: z.literal('MOVE_SECTION_IN_TREE'),
    sectionId: z.string(),
    toZone: pageZoneSchema,
    toParentSectionId: z.string().nullable().optional(),
    toIndex: z.number(),
  }),
  z.object({ type: z.literal('SET_PAGE_STATUS'), status: cmsPageStatusSchema }),
  z.object({ type: z.literal('SET_PAGE_NAME'), name: z.string() }),
  z.object({ type: z.literal('UPDATE_SEO'), seo: cmsPageSeoSchema.partial() }),
  z.object({
    type: z.literal('UPDATE_PAGE_SLUGS'),
    slugIds: z.array(z.string()),
    slugValues: z.array(z.string()),
  }),
  z.object({ type: z.literal('SET_PAGE_MENU_VISIBILITY'), showMenu: z.boolean() }),
  z.object({ type: z.literal('TOGGLE_INSPECTOR') }),
  z.object({
    type: z.literal('UPDATE_INSPECTOR_SETTINGS'),
    settings: cmsInspectorSettingsSchema.partial(),
  }),
  z.object({ type: z.literal('SET_PREVIEW_MODE'), mode: z.enum(['desktop', 'mobile']) }),
  z.object({ type: z.literal('TOGGLE_LEFT_PANEL') }),
  z.object({ type: z.literal('TOGGLE_RIGHT_PANEL') }),
  z.object({ type: z.literal('COPY_SECTION'), sectionId: z.string() }),
  z.object({ type: z.literal('PASTE_SECTION'), zone: pageZoneSchema }),
  z.object({
    type: z.literal('COPY_BLOCK'),
    sectionId: z.string(),
    blockId: z.string(),
    columnId: z.string().optional(),
    parentBlockId: z.string().optional(),
  }),
  z.object({
    type: z.literal('PASTE_BLOCK'),
    sectionId: z.string(),
    columnId: z.string().optional(),
    parentBlockId: z.string().optional(),
  }),
  z.object({ type: z.literal('DUPLICATE_SECTION'), sectionId: z.string() }),
  z.object({ type: z.literal('INSERT_TEMPLATE_SECTION'), section: cmsSectionInstanceSchema }),
  z.object({ type: z.literal('SET_PAGE_THEME'), themeId: z.string().nullable() }),
  z.object({
    type: z.literal('ADD_CAROUSEL_FRAME'),
    sectionId: z.string(),
    columnId: z.string(),
    carouselId: z.string(),
  }),
  z.object({
    type: z.literal('REMOVE_CAROUSEL_FRAME'),
    sectionId: z.string(),
    columnId: z.string(),
    carouselId: z.string(),
    frameId: z.string(),
  }),
  z.object({
    type: z.literal('ADD_ELEMENT_TO_CAROUSEL_FRAME'),
    sectionId: z.string(),
    columnId: z.string(),
    carouselId: z.string(),
    frameId: z.string(),
    elementType: z.string(),
  }),
  z.object({
    type: z.literal('MOVE_BLOCK_TO_SLIDESHOW_FRAME'),
    blockId: z.string(),
    fromSectionId: z.string(),
    fromColumnId: z.string().optional(),
    fromParentBlockId: z.string().optional(),
    toSectionId: z.string(),
    toFrameId: z.string(),
    toIndex: z.number(),
  }),
  z.object({
    type: z.literal('MOVE_SECTION_TO_SLIDESHOW_FRAME'),
    sectionId: z.string(),
    toSectionId: z.string(),
    toFrameId: z.string(),
    toIndex: z.number(),
  }),
]);

export type PageBuilderActionDto = z.infer<typeof pageBuilderActionSchema>;
export type PageBuilderAction = PageBuilderActionDto;

/**
 * CMS Page Contract
 */

export const cmsPageSchema = dtoBaseSchema
  .extend({
    name: z.string(),
    status: z.enum(['draft', 'published', 'scheduled']),
    publishedAt: z.string().optional(),
    themeId: z.string().nullable(),
    showMenu: z.boolean(),
    components: z.array(cmsPageComponentInputSchema),
    slugs: z.array(cmsSlugSchema),
  })
  .merge(cmsPageSeoSchema);

export type CmsPageDto = z.infer<typeof cmsPageSchema>;
export type Page = CmsPageDto;

export const createCmsPageSchema = cmsPageSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateCmsPageDto = z.infer<typeof createCmsPageSchema>;
export type UpdateCmsPageDto = Partial<CreateCmsPageDto>;

/**
 * CMS AI Config Contract
 */
export const cmsCssAiProviderSchema = z.enum(['model', 'agent']);
export type CmsCssAiProviderDto = z.infer<typeof cmsCssAiProviderSchema>;
export type CustomCssAiProvider = CmsCssAiProviderDto;

export const cmsCssAiConfigSchema = z.object({
  provider: cmsCssAiProviderSchema.optional(),
  modelId: z.string().optional(),
  agentId: z.string().optional(),
  prompt: z.string().optional(),
});

export type CmsCssAiConfigDto = z.infer<typeof cmsCssAiConfigSchema>;
export type CustomCssAiConfig = CmsCssAiConfigDto;

export const DEFAULT_CUSTOM_CSS_AI_CONFIG: CustomCssAiConfig = {
  provider: 'model',
  modelId: '',
  agentId: '',
  prompt: '',
};

/**
 * CMS AI Request Contract
 */
export const cmsCssAiRequestSchema = z.object({
  provider: cmsCssAiProviderSchema.optional(),
  modelId: z.string().optional(),
  agentId: z.string().optional(),
  messages: z.array(chatMessageSchema).optional(),
});

export type CmsCssAiRequest = z.infer<typeof cmsCssAiRequestSchema>;

/**
 * CMS Domain Settings Contract
 */
export const cmsDomainSettingsSchema = z.object({
  zoningEnabled: z.boolean(),
});

export type CmsDomainSettingsDto = z.infer<typeof cmsDomainSettingsSchema>;
export type CmsDomainSettings = CmsDomainSettingsDto;

export const CMS_DOMAIN_SETTINGS_KEY = 'cms_domain_settings.v1';

export const DEFAULT_CMS_DOMAIN_SETTINGS: CmsDomainSettings = {
  zoningEnabled: true,
};

export function normalizeCmsDomainSettings(
  input?: Partial<CmsDomainSettings> | null
): CmsDomainSettings {
  const exact = cmsDomainSettingsSchema.safeParse(input);
  if (exact.success) {
    return exact.data;
  }

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return DEFAULT_CMS_DOMAIN_SETTINGS;
  }

  const merged = {
    ...DEFAULT_CMS_DOMAIN_SETTINGS,
    ...input,
  };
  const mergedResult = cmsDomainSettingsSchema.safeParse(merged);
  if (mergedResult.success) return mergedResult.data;

  return DEFAULT_CMS_DOMAIN_SETTINGS;
}

/**
 * CMS Event Effects Contract
 */
export const cmsHoverEffectSchema = z.enum(['none', 'lift', 'lift-3d', 'scale', 'glow']);
export type CmsHoverEffectDto = z.infer<typeof cmsHoverEffectSchema>;
export type CmsHoverEffect = CmsHoverEffectDto;

export const cmsClickActionSchema = z.enum(['none', 'navigate', 'scroll']);
export type CmsClickActionDto = z.infer<typeof cmsClickActionSchema>;
export type CmsClickAction = CmsClickActionDto;

export const cmsClickTargetSchema = z.enum(['_self', '_blank']);
export type CmsClickTargetDto = z.infer<typeof cmsClickTargetSchema>;
export type CmsClickTarget = CmsClickTargetDto;

export const cmsScrollBehaviorSchema = z.enum(['smooth', 'auto']);
export type CmsScrollBehaviorDto = z.infer<typeof cmsScrollBehaviorSchema>;
export type CmsScrollBehavior = CmsScrollBehaviorDto;

export const cmsEventEffectsConfigSchema = z.object({
  hoverEffect: cmsHoverEffectSchema,
  hoverScale: z.number(),
  clickAction: cmsClickActionSchema,
  clickUrl: z.string(),
  clickTarget: cmsClickTargetSchema,
  clickScrollTarget: z.string(),
  clickScrollBehavior: cmsScrollBehaviorSchema,
});

export type CmsEventEffectsConfigDto = z.infer<typeof cmsEventEffectsConfigSchema>;
export type CmsEventEffectsConfig = CmsEventEffectsConfigDto;

/**
 * CMS CSS Animation Contract
 */
export {
  CSS_ANIMATION_DIRECTIONS,
  CSS_ANIMATION_EFFECTS,
  CSS_ANIMATION_FILL_MODES,
  CSS_ANIMATION_TRIGGERS,
  CSS_EASINGS,
  cssAnimationConfigSchema,
  cssAnimationDirectionSchema,
  cssAnimationEffectSchema,
  cssAnimationFillModeSchema,
  cssAnimationTriggerSchema,
  DEFAULT_CSS_ANIMATION_CONFIG,
  type CssAnimationConfig,
  type CssAnimationDirection,
  type CssAnimationEffect,
  type CssAnimationFillMode,
  type CssAnimationTrigger,
} from './cms-animation';

export const settingsFieldOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
});

export type SettingsFieldOptionDto = z.infer<typeof settingsFieldOptionSchema>;
export type SettingsFieldOption = SettingsFieldOptionDto;

export const settingsFieldTypeSchema = z.enum([
  'text',
  'select',
  'radio',
  'number',
  'image',
  'asset3d',
  'color-scheme',
  'range',
  'color',
  'font-family',
  'font-weight',
  'spacing',
  'border',
  'shadow',
  'background',
  'typography',
  'link',
  'alignment',
]);

export type SettingsFieldTypeDto = z.infer<typeof settingsFieldTypeSchema>;

export const settingsFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: settingsFieldTypeSchema,
  options: z.array(settingsFieldOptionSchema).optional(),
  defaultValue: z.unknown().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  disabled: z.boolean().optional(),
});

export type SettingsFieldDto = z.infer<typeof settingsFieldSchema>;
export type SettingsField = SettingsFieldDto;

export const sectionDefinitionSchema = z.object({
  type: z.string(),
  label: z.string(),
  icon: z.string(),
  defaultSettings: z.record(z.string(), z.unknown()),
  settingsSchema: z.array(settingsFieldSchema),
  allowedBlockTypes: z.array(z.string()),
});

export type SectionDefinitionDto = z.infer<typeof sectionDefinitionSchema>;
export type SectionDefinition = SectionDefinitionDto;

export const blockDefinitionSchema = z.object({
  type: z.string(),
  label: z.string(),
  icon: z.string(),
  defaultSettings: z.record(z.string(), z.unknown()),
  settingsSchema: z.array(settingsFieldSchema),
  allowedBlockTypes: z.array(z.string()).optional(),
});

export type BlockDefinitionDto = z.infer<typeof blockDefinitionSchema>;
export type BlockDefinition = BlockDefinitionDto;

/**
 * CMS Repository Interfaces
 */

export type PageUpdateData = Partial<Omit<CmsPageDto, 'id' | 'createdAt' | 'updatedAt'>> & {
  components?: PageComponentInput[];
};

export type CmsRepository = {
  // Pages
  getPages(): Promise<Page[]>;
  getPageById(id: string): Promise<Page | null>;
  getPageBySlug(slug: string): Promise<Page | null>;
  createPage(data: { name: string; themeId?: string | null | undefined }): Promise<Page>;
  updatePage(id: string, data: PageUpdateData): Promise<Page | null>;
  deletePage(id: string): Promise<Page | null>;
  addSlugToPage(pageId: string, slugId: string): Promise<void>;
  removeSlugFromPage(pageId: string, slugId: string): Promise<void>;
  replacePageSlugs(pageId: string, slugIds: string[]): Promise<void>;
  replacePageComponents(
    pageId: string,
    components: PageComponentInput[]
  ): Promise<void>;

  // Slugs
  getSlugs(): Promise<Slug[]>;
  getSlugsByIds(ids: string[]): Promise<Slug[]>;
  getSlugById(id: string): Promise<Slug | null>;
  getSlugByValue(slug: string): Promise<Slug | null>;
  createSlug(data: { slug: string; pageId?: string | null; isDefault?: boolean }): Promise<Slug>;
  updateSlug(
    id: string,
    data: Partial<{ slug: string; pageId: string | null; isDefault: boolean }>
  ): Promise<Slug | null>;
  deleteSlug(id: string): Promise<Slug | null>;

  // Themes
  getThemes(): Promise<CmsTheme[]>;
  getThemeById(id: string): Promise<CmsTheme | null>;
  createTheme(data: CreateCmsThemeDto): Promise<CmsTheme>;
  updateTheme(id: string, data: UpdateCmsThemeDto): Promise<CmsTheme | null>;
  deleteTheme(id: string): Promise<CmsTheme | null>;
  getDefaultTheme(): Promise<CmsTheme | null>;
  setDefaultTheme(id: string): Promise<void>;

  // Domains
  getDomains(): Promise<CmsDomainDto[]>;
  getDomainById(id: string): Promise<CmsDomainDto | null>;
  createDomain(data: CreateCmsDomainDto): Promise<CmsDomainDto>;
  updateDomain(id: string, data: UpdateCmsDomainDto): Promise<CmsDomainDto>;
  deleteDomain(id: string): Promise<void>;
};
