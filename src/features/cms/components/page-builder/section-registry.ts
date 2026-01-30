import type { SectionDefinition, BlockDefinition, SettingsField } from "../../types/page-builder";

// ---------------------------------------------------------------------------
// Shared field helpers
// ---------------------------------------------------------------------------

const COLOR_SCHEME_OPTIONS = [
  { label: "Scheme 1", value: "scheme-1" },
  { label: "Scheme 2", value: "scheme-2" },
  { label: "Scheme 3", value: "scheme-3" },
  { label: "Scheme 4", value: "scheme-4" },
  { label: "Scheme 5", value: "scheme-5" },
];

function colorSchemeField(key: string, label: string, defaultValue: string = "scheme-1"): SettingsField {
  return { key, label, type: "color-scheme", options: COLOR_SCHEME_OPTIONS, defaultValue };
}

function paddingFields(): SettingsField[] {
  return [
    { key: "paddingTop", label: "Top padding", type: "number", defaultValue: 36 },
    { key: "paddingBottom", label: "Bottom padding", type: "number", defaultValue: 36 },
  ];
}

function marginFields(): SettingsField[] {
  return [
    { key: "marginTop", label: "Top margin", type: "number", defaultValue: 0 },
    { key: "marginBottom", label: "Bottom margin", type: "number", defaultValue: 0 },
  ];
}

// ---------------------------------------------------------------------------
// Block definitions
// ---------------------------------------------------------------------------

export const COLUMN_ALLOWED_BLOCK_TYPES = ["Heading", "Text", "Button", "ImageWithText", "RichText", "Hero"];

export const BLOCK_DEFINITIONS: Record<string, BlockDefinition> = {
  Column: {
    type: "Column",
    label: "Column",
    icon: "Columns",
    defaultSettings: {
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
      marginTop: 0,
      marginBottom: 0,
      colorScheme: "scheme-1",
      verticalAlignment: "top",
    },
    settingsSchema: [
      { key: "paddingTop", label: "Top padding", type: "number", defaultValue: 0 },
      { key: "paddingBottom", label: "Bottom padding", type: "number", defaultValue: 0 },
      { key: "paddingLeft", label: "Left padding", type: "number", defaultValue: 0 },
      { key: "paddingRight", label: "Right padding", type: "number", defaultValue: 0 },
      { key: "marginTop", label: "Top margin", type: "number", defaultValue: 0 },
      { key: "marginBottom", label: "Bottom margin", type: "number", defaultValue: 0 },
      colorSchemeField("colorScheme", "Color scheme"),
      {
        key: "verticalAlignment",
        label: "Vertical alignment",
        type: "select",
        options: [
          { label: "Top", value: "top" },
          { label: "Center", value: "center" },
          { label: "Bottom", value: "bottom" },
        ],
        defaultValue: "top",
      },
    ],
  },
  Heading: {
    type: "Heading",
    label: "Heading",
    icon: "Heading",
    defaultSettings: { headingText: "Heading", headingSize: "medium" },
    settingsSchema: [
      { key: "headingText", label: "Heading text", type: "text", defaultValue: "Heading" },
      {
        key: "headingSize",
        label: "Heading size",
        type: "select",
        options: [
          { label: "Small", value: "small" },
          { label: "Medium", value: "medium" },
          { label: "Large", value: "large" },
        ],
        defaultValue: "medium",
      },
    ],
  },
  Text: {
    type: "Text",
    label: "Text",
    icon: "AlignLeft",
    defaultSettings: { textContent: "" },
    settingsSchema: [
      { key: "textContent", label: "Text", type: "text", defaultValue: "" },
    ],
  },
  Button: {
    type: "Button",
    label: "Button",
    icon: "MousePointerClick",
    defaultSettings: { buttonLabel: "Button", buttonLink: "", buttonStyle: "solid" },
    settingsSchema: [
      { key: "buttonLabel", label: "Button label", type: "text", defaultValue: "Button" },
      { key: "buttonLink", label: "Button link", type: "text", defaultValue: "" },
      {
        key: "buttonStyle",
        label: "Button style",
        type: "select",
        options: [
          { label: "Solid", value: "solid" },
          { label: "Outline", value: "outline" },
        ],
        defaultValue: "solid",
      },
    ],
  },
  ImageWithText: {
    type: "ImageWithText",
    label: "Image with text",
    icon: "Layers",
    defaultSettings: {
      imageHeight: "medium",
      desktopImageWidth: "medium",
      desktopImagePlacement: "image-first",
      desktopContentPosition: "middle",
      desktopContentAlignment: "left",
      contentLayout: "no-overlap",
      colorScheme: "scheme-3",
      containerColorScheme: "scheme-1",
      imageBehavior: "none",
      paddingTop: 36,
      paddingBottom: 36,
    },
    settingsSchema: [
      { key: "image", label: "Image", type: "image" },
      {
        key: "imageHeight",
        label: "Image height",
        type: "select",
        options: [
          { label: "Small", value: "small" },
          { label: "Medium", value: "medium" },
          { label: "Large", value: "large" },
          { label: "Adapt to image", value: "adapt" },
        ],
        defaultValue: "medium",
      },
      {
        key: "desktopImagePlacement",
        label: "Desktop image placement",
        type: "radio",
        options: [
          { label: "Image first", value: "image-first" },
          { label: "Image second", value: "image-second" },
        ],
        defaultValue: "image-first",
      },
      colorSchemeField("colorScheme", "Color scheme", "scheme-3"),
      ...paddingFields(),
    ],
  },
  RichText: {
    type: "RichText",
    label: "Rich text",
    icon: "FileText",
    defaultSettings: {
      colorScheme: "scheme-1",
      paddingTop: 36,
      paddingBottom: 36,
    },
    settingsSchema: [
      colorSchemeField("colorScheme", "Color scheme"),
      ...paddingFields(),
    ],
  },
  Hero: {
    type: "Hero",
    label: "Hero banner",
    icon: "LayoutTemplate",
    defaultSettings: {
      imageHeight: "large",
      colorScheme: "scheme-1",
      paddingTop: 36,
      paddingBottom: 36,
    },
    settingsSchema: [
      { key: "image", label: "Image", type: "image" },
      {
        key: "imageHeight",
        label: "Image height",
        type: "select",
        options: [
          { label: "Small", value: "small" },
          { label: "Medium", value: "medium" },
          { label: "Large", value: "large" },
          { label: "Adapt to image", value: "adapt" },
        ],
        defaultValue: "large",
      },
      colorSchemeField("colorScheme", "Color scheme"),
      ...paddingFields(),
    ],
  },
};

// ---------------------------------------------------------------------------
// Section definitions
// ---------------------------------------------------------------------------

export const SECTION_DEFINITIONS: Record<string, SectionDefinition> = {
  ImageWithText: {
    type: "ImageWithText",
    label: "Image with text",
    icon: "ImageIcon",
    allowedBlockTypes: ["Heading", "Text", "Button"],
    defaultSettings: {
      imageHeight: "medium",
      desktopImageWidth: "medium",
      desktopImagePlacement: "image-first",
      desktopContentPosition: "middle",
      desktopContentAlignment: "left",
      contentLayout: "no-overlap",
      colorScheme: "scheme-3",
      containerColorScheme: "scheme-1",
      imageBehavior: "none",
      paddingTop: 36,
      paddingBottom: 36,
    },
    settingsSchema: [
      { key: "image", label: "Image", type: "image" },
      {
        key: "imageHeight",
        label: "Image height",
        type: "select",
        options: [
          { label: "Small", value: "small" },
          { label: "Medium", value: "medium" },
          { label: "Large", value: "large" },
          { label: "Adapt to image", value: "adapt" },
        ],
        defaultValue: "medium",
      },
      {
        key: "desktopImageWidth",
        label: "Desktop image width",
        type: "select",
        options: [
          { label: "Small", value: "small" },
          { label: "Medium", value: "medium" },
          { label: "Large", value: "large" },
        ],
        defaultValue: "medium",
      },
      {
        key: "desktopImagePlacement",
        label: "Desktop image placement",
        type: "radio",
        options: [
          { label: "Image first", value: "image-first" },
          { label: "Image second", value: "image-second" },
        ],
        defaultValue: "image-first",
      },
      {
        key: "desktopContentPosition",
        label: "Desktop content position",
        type: "select",
        options: [
          { label: "Top", value: "top" },
          { label: "Middle", value: "middle" },
          { label: "Bottom", value: "bottom" },
        ],
        defaultValue: "middle",
      },
      {
        key: "desktopContentAlignment",
        label: "Desktop content alignment",
        type: "select",
        options: [
          { label: "Left", value: "left" },
          { label: "Center", value: "center" },
          { label: "Right", value: "right" },
        ],
        defaultValue: "left",
      },
      {
        key: "contentLayout",
        label: "Content layout",
        type: "radio",
        options: [
          { label: "No overlap", value: "no-overlap" },
          { label: "Overlap", value: "overlap" },
        ],
        defaultValue: "no-overlap",
      },
      colorSchemeField("colorScheme", "Color scheme", "scheme-3"),
      colorSchemeField("containerColorScheme", "Container color scheme", "scheme-1"),
      {
        key: "imageBehavior",
        label: "Image behavior",
        type: "select",
        options: [
          { label: "None", value: "none" },
          { label: "Ambient movement", value: "ambient" },
          { label: "Zoom in on scroll", value: "zoom-scroll" },
        ],
        defaultValue: "none",
      },
      ...paddingFields(),
    ],
  },

  RichText: {
    type: "RichText",
    label: "Rich text",
    icon: "FileText",
    allowedBlockTypes: ["Heading", "Text", "Button"],
    defaultSettings: {
      colorScheme: "scheme-1",
      paddingTop: 36,
      paddingBottom: 36,
    },
    settingsSchema: [
      colorSchemeField("colorScheme", "Color scheme"),
      ...paddingFields(),
    ],
  },

  Grid: {
    type: "Grid",
    label: "Grid",
    icon: "LayoutGrid",
    allowedBlockTypes: ["Column"],
    defaultSettings: {
      columns: 2,
      gap: "medium",
      paddingTop: 36,
      paddingBottom: 36,
      marginTop: 0,
      marginBottom: 0,
      colorScheme: "scheme-1",
    },
    settingsSchema: [
      { key: "columns", label: "Columns", type: "range", defaultValue: 2, min: 1, max: 12 },
      {
        key: "gap",
        label: "Gap",
        type: "select",
        options: [
          { label: "None", value: "none" },
          { label: "Small", value: "small" },
          { label: "Medium", value: "medium" },
          { label: "Large", value: "large" },
        ],
        defaultValue: "medium",
      },
      ...paddingFields(),
      ...marginFields(),
      colorSchemeField("colorScheme", "Color scheme"),
    ],
  },

  Hero: {
    type: "Hero",
    label: "Hero banner",
    icon: "LayoutTemplate",
    allowedBlockTypes: ["Heading", "Text", "Button"],
    defaultSettings: {
      imageHeight: "large",
      colorScheme: "scheme-1",
      paddingTop: 36,
      paddingBottom: 36,
    },
    settingsSchema: [
      { key: "image", label: "Image", type: "image" },
      {
        key: "imageHeight",
        label: "Image height",
        type: "select",
        options: [
          { label: "Small", value: "small" },
          { label: "Medium", value: "medium" },
          { label: "Large", value: "large" },
          { label: "Adapt to image", value: "adapt" },
        ],
        defaultValue: "large",
      },
      colorSchemeField("colorScheme", "Color scheme"),
      ...paddingFields(),
    ],
  },
};

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
