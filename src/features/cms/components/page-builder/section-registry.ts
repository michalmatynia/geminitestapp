import type { SectionDefinition, BlockDefinition, SettingsField, PageZone } from "../../types/page-builder";

// Re-export everything from sub-modules so existing imports keep working
export {
  COLOR_SCHEME_OPTIONS,
  OVERFLOW_OPTIONS,
  JUSTIFY_OPTIONS,
  ALIGN_OPTIONS,
  WRAP_OPTIONS,
  colorSchemeField,
  colorSchemeFieldWithNone,
  paddingFields,
  marginFields,
  layoutFields,
  sectionStyleFields,
} from "./registry/shared-field-helpers";

export {
  COLUMN_ALLOWED_BLOCK_TYPES,
  BLOCK_SECTION_ALLOWED_BLOCK_TYPES,
  ROW_ALLOWED_BLOCK_TYPES,
  CAROUSEL_FRAME_ALLOWED_BLOCK_TYPES,
  SLIDESHOW_FRAME_ALLOWED_BLOCK_TYPES,
  BLOCK_DEFINITIONS,
} from "./registry/block-definitions";

export { SECTION_DEFINITIONS } from "./registry/section-definitions";

// Local imports for use in the helpers below
import { BLOCK_DEFINITIONS } from "./registry/block-definitions";
import { SECTION_DEFINITIONS } from "./registry/section-definitions";
import { COLUMN_ALLOWED_BLOCK_TYPES, ROW_ALLOWED_BLOCK_TYPES } from "./registry/block-definitions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getSectionDefinition(type: string): SectionDefinition | undefined {
  return SECTION_DEFINITIONS[type];
}

export function getBlockDefinition(type: string): BlockDefinition | undefined {
  return BLOCK_DEFINITIONS[type];
}

export function getAllSectionTypes(): SectionDefinition[] {
  return Object.values(SECTION_DEFINITIONS);
}

const SECTION_TYPES_BY_ZONE: Record<PageZone, string[]> = {
  header: ["AnnouncementBar", "Block", "TextElement", "TextAtom", "ImageElement", "Model3DElement", "ButtonElement", "Hero", "ImageWithText", "RichText", "Grid", "Slideshow"],
  template: Object.keys(SECTION_DEFINITIONS).filter((type: string) => type !== "AnnouncementBar"),
  footer: ["Block", "TextElement", "TextAtom", "ImageElement", "Model3DElement", "ButtonElement", "RichText", "Grid", "Newsletter", "ContactForm"],
};

export function getSectionTypesForZone(zone: PageZone): SectionDefinition[] {
  const types = SECTION_TYPES_BY_ZONE[zone] ?? Object.keys(SECTION_DEFINITIONS);
  return types
    .map((type: string) => SECTION_DEFINITIONS[type])
    .filter((def: SectionDefinition | undefined): def is SectionDefinition => def !== undefined);
}

export function getAllowedBlockTypes(sectionType: string): BlockDefinition[] {
  const def = getSectionDefinition(sectionType);
  if (!def) return [];
  return def.allowedBlockTypes
    .map((bt: string) => BLOCK_DEFINITIONS[bt])
    .filter((b: BlockDefinition | undefined): b is BlockDefinition => b !== undefined);
}

export function getColumnAllowedBlockTypes(): BlockDefinition[] {
  return COLUMN_ALLOWED_BLOCK_TYPES
    .map((bt: string) => BLOCK_DEFINITIONS[bt])
    .filter((b: BlockDefinition | undefined): b is BlockDefinition => b !== undefined);
}

export function getRowAllowedBlockTypes(): BlockDefinition[] {
  return ROW_ALLOWED_BLOCK_TYPES
    .map((bt: string) => BLOCK_DEFINITIONS[bt])
    .filter((b: BlockDefinition | undefined): b is BlockDefinition => b !== undefined);
}

export function isBlockTypeAllowedInRow(blockType: string): boolean {
  return ROW_ALLOWED_BLOCK_TYPES.includes(blockType);
}

// ---------------------------------------------------------------------------
// ImageElement Background Mode Settings
// ---------------------------------------------------------------------------
// When an ImageElement is in background mode, show these settings instead of regular image settings

export const IMAGE_ELEMENT_BACKGROUND_MODE_SETTINGS: SettingsField[] = [
  { key: "src", label: "Image", type: "image" },
  { key: "alt", label: "Alt text", type: "text", defaultValue: "" },
  {
    key: "objectFit",
    label: "Fit mode",
    type: "select",
    options: [
      { label: "Cover (fill container)", value: "cover" },
      { label: "Contain (fit inside)", value: "contain" },
      { label: "Fill (stretch)", value: "fill" },
      { label: "None", value: "none" },
    ],
    defaultValue: "cover",
  },
  {
    key: "objectPosition",
    label: "Position",
    type: "select",
    options: [
      { label: "Center", value: "center" },
      { label: "Top", value: "top" },
      { label: "Bottom", value: "bottom" },
      { label: "Left", value: "left" },
      { label: "Right", value: "right" },
      { label: "Top left", value: "top-left" },
      { label: "Top right", value: "top-right" },
      { label: "Bottom left", value: "bottom-left" },
      { label: "Bottom right", value: "bottom-right" },
    ],
    defaultValue: "center",
  },
  { key: "opacity", label: "Opacity", type: "range", defaultValue: 100, min: 0, max: 100 },
  { key: "blur", label: "Blur (px)", type: "range", defaultValue: 0, min: 0, max: 20 },
  { key: "grayscale", label: "Grayscale (%)", type: "range", defaultValue: 0, min: 0, max: 100 },
  { key: "brightness", label: "Brightness (%)", type: "range", defaultValue: 100, min: 0, max: 200 },
  { key: "contrast", label: "Contrast (%)", type: "range", defaultValue: 100, min: 0, max: 200 },
  { key: "scale", label: "Scale (%)", type: "range", defaultValue: 100, min: 50, max: 200 },
  {
    key: "overlayType",
    label: "Overlay",
    type: "select",
    options: [
      { label: "None", value: "none" },
      { label: "Solid", value: "solid" },
      { label: "Gradient", value: "gradient" },
    ],
    defaultValue: "none",
  },
  { key: "overlayColor", label: "Overlay color", type: "color", defaultValue: "#000000" },
  { key: "overlayOpacity", label: "Overlay opacity (%)", type: "range", defaultValue: 0, min: 0, max: 100 },
  { key: "overlayGradientFrom", label: "Gradient from", type: "color", defaultValue: "#000000" },
  { key: "overlayGradientTo", label: "Gradient to", type: "color", defaultValue: "#ffffff" },
  {
    key: "overlayGradientDirection",
    label: "Gradient direction",
    type: "select",
    options: [
      { label: "Top", value: "to-top" },
      { label: "Bottom", value: "to-bottom" },
      { label: "Left", value: "to-left" },
      { label: "Right", value: "to-right" },
      { label: "Top left", value: "to-top-left" },
      { label: "Top right", value: "to-top-right" },
      { label: "Bottom left", value: "to-bottom-left" },
      { label: "Bottom right", value: "to-bottom-right" },
    ],
    defaultValue: "to-bottom",
  },
  {
    key: "transparencyMode",
    label: "Transparency",
    type: "select",
    options: [
      { label: "None", value: "none" },
      { label: "Gradient", value: "gradient" },
    ],
    defaultValue: "none",
  },
  {
    key: "transparencyDirection",
    label: "Transparency direction",
    type: "select",
    options: [
      { label: "Top", value: "top" },
      { label: "Bottom", value: "bottom" },
      { label: "Left", value: "left" },
      { label: "Right", value: "right" },
      { label: "Top left", value: "top-left" },
      { label: "Top right", value: "top-right" },
      { label: "Bottom left", value: "bottom-left" },
      { label: "Bottom right", value: "bottom-right" },
    ],
    defaultValue: "bottom",
  },
  { key: "transparencyStrength", label: "Transparency strength (%)", type: "range", defaultValue: 0, min: 0, max: 100 },
];

export type ImageBackgroundTarget = "none" | "grid" | "row" | "column";

export function getImageBackgroundTargetOptions(
  hasGrid: boolean,
  hasRow: boolean,
  hasColumn: boolean
): { label: string; value: ImageBackgroundTarget }[] {
  const options: { label: string; value: ImageBackgroundTarget }[] = [
    { label: "None (regular image)", value: "none" },
  ];
  if (hasColumn) options.push({ label: "Column background", value: "column" });
  if (hasRow) options.push({ label: "Row background", value: "row" });
  if (hasGrid) options.push({ label: "Grid background", value: "grid" });
  return options;
}
