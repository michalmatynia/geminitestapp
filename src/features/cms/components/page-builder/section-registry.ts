import type { SectionDefinition, BlockDefinition, SettingsField, PageZone } from "../../types/page-builder";

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

function colorSchemeFieldWithNone(key: string, label: string, defaultValue: string = "none"): SettingsField {
  return {
    key,
    label,
    type: "color-scheme",
    options: [{ label: "None", value: "none" }],
    defaultValue,
  };
}

function paddingFields(): SettingsField[] {
  return [
    { key: "paddingTop", label: "Top padding", type: "number", defaultValue: 36 },
    { key: "paddingRight", label: "Right padding", type: "number", defaultValue: 24 },
    { key: "paddingBottom", label: "Bottom padding", type: "number", defaultValue: 36 },
    { key: "paddingLeft", label: "Left padding", type: "number", defaultValue: 24 },
  ];
}

function marginFields(): SettingsField[] {
  return [
    { key: "marginTop", label: "Top margin", type: "number", defaultValue: 0 },
    { key: "marginRight", label: "Right margin", type: "number", defaultValue: 0 },
    { key: "marginBottom", label: "Bottom margin", type: "number", defaultValue: 0 },
    { key: "marginLeft", label: "Left margin", type: "number", defaultValue: 0 },
  ];
}

function sectionStyleFields(): SettingsField[] {
  return [
    { key: "backgroundColor", label: "Background color", type: "color", defaultValue: "" },
    { key: "sectionBorder", label: "Border", type: "border", defaultValue: { width: 0, style: "none", color: "#4b5563", radius: 0 } },
    { key: "sectionShadow", label: "Shadow", type: "shadow", defaultValue: { x: 0, y: 0, blur: 0, spread: 0, color: "#00000000" } },
  ];
}

// ---------------------------------------------------------------------------
// Block definitions
// ---------------------------------------------------------------------------

export const COLUMN_ALLOWED_BLOCK_TYPES = ["Heading", "Text", "TextElement", "ImageElement", "Button", "Image", "VideoEmbed", "Divider", "SocialLinks", "Icon", "AppEmbed", "ImageWithText", "RichText", "Hero"];
const BLOCK_SECTION_ALLOWED_BLOCK_TYPES = ["Announcement", ...COLUMN_ALLOWED_BLOCK_TYPES];

export const BLOCK_DEFINITIONS: Record<string, BlockDefinition> = {
  Row: {
    type: "Row",
    label: "Row",
    icon: "GripVertical",
    defaultSettings: {
      gap: "inherit",
      heightMode: "inherit",
      height: 0,
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
      marginTop: 0,
      marginBottom: 0,
      marginLeft: 0,
      marginRight: 0,
      backgroundColor: "",
    },
    settingsSchema: [
      {
        key: "gap",
        label: "Column gap",
        type: "select",
        options: [
          { label: "Inherit section gap", value: "inherit" },
          { label: "None", value: "none" },
          { label: "Small", value: "small" },
          { label: "Medium", value: "medium" },
          { label: "Large", value: "large" },
        ],
        defaultValue: "inherit",
      },
      {
        key: "heightMode",
        label: "Row height",
        type: "select",
        options: [
          { label: "Inherit from blocks", value: "inherit" },
          { label: "Fixed height", value: "fixed" },
        ],
        defaultValue: "inherit",
      },
      { key: "height", label: "Row height (px)", type: "range", defaultValue: 0, min: 0, max: 1000 },
      ...paddingFields(),
      ...marginFields(),
      { key: "backgroundColor", label: "Background color", type: "color", defaultValue: "" },
    ],
  },
  Announcement: {
    type: "Announcement",
    label: "Announcement",
    icon: "Megaphone",
    defaultSettings: { text: "Announcement", link: "" },
    settingsSchema: [
      { key: "text", label: "Text", type: "text", defaultValue: "Announcement" },
      { key: "link", label: "Link", type: "link", defaultValue: "" },
    ],
  },
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
      heightMode: "inherit",
      height: 0,
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
      {
        key: "heightMode",
        label: "Column height",
        type: "select",
        options: [
          { label: "Inherit from blocks", value: "inherit" },
          { label: "Fixed height", value: "fixed" },
        ],
        defaultValue: "inherit",
      },
      { key: "height", label: "Column height (px)", type: "range", defaultValue: 0, min: 0, max: 1000 },
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
  Block: {
    type: "Block",
    label: "Block",
    icon: "Box",
    defaultSettings: {
      colorScheme: "none",
      paddingTop: 24,
      paddingBottom: 24,
      paddingLeft: 24,
      paddingRight: 24,
      marginTop: 0,
      marginBottom: 0,
      marginLeft: 0,
      marginRight: 0,
      contentAlignment: "left",
    },
    settingsSchema: [
      colorSchemeFieldWithNone("colorScheme", "Color scheme", "none"),
      {
        key: "contentAlignment",
        label: "Content alignment",
        type: "select",
        options: [
          { label: "Left", value: "left" },
          { label: "Center", value: "center" },
          { label: "Right", value: "right" },
        ],
        defaultValue: "left",
      },
      ...paddingFields(),
      ...marginFields(),
      ...sectionStyleFields(),
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
      { key: "fontFamily", label: "Font family", type: "font-family", defaultValue: "" },
      { key: "fontWeight", label: "Font weight", type: "font-weight", defaultValue: "" },
      { key: "fontSize", label: "Font size (px)", type: "number", defaultValue: 0 },
      { key: "lineHeight", label: "Line height", type: "number", defaultValue: 0 },
      { key: "letterSpacing", label: "Letter spacing (px)", type: "number", defaultValue: 0 },
      { key: "textColor", label: "Text color", type: "color", defaultValue: "" },
    ],
  },
  Text: {
    type: "Text",
    label: "Text",
    icon: "AlignLeft",
    defaultSettings: { textContent: "" },
    settingsSchema: [
      { key: "textContent", label: "Text", type: "text", defaultValue: "" },
      { key: "fontFamily", label: "Font family", type: "font-family", defaultValue: "" },
      { key: "fontSize", label: "Font size (px)", type: "number", defaultValue: 0 },
      { key: "lineHeight", label: "Line height", type: "number", defaultValue: 0 },
      { key: "textColor", label: "Text color", type: "color", defaultValue: "" },
    ],
  },
  TextElement: {
    type: "TextElement",
    label: "Text element",
    icon: "FileText",
    defaultSettings: {
      textContent: "Text element",
      fontFamily: "Inter, sans-serif",
      fontSize: 0,
      fontWeight: "400",
      fontStyle: "normal",
      lineHeight: 0,
      letterSpacing: 0,
      textColor: "",
    },
    settingsSchema: [
      { key: "textContent", label: "Text", type: "text", defaultValue: "Text element" },
      { key: "fontFamily", label: "Font family", type: "font-family", defaultValue: "Inter, sans-serif" },
      { key: "fontSize", label: "Font size (px)", type: "number", defaultValue: 0 },
      { key: "fontWeight", label: "Font weight", type: "font-weight", defaultValue: "400" },
      {
        key: "fontStyle",
        label: "Font style",
        type: "select",
        options: [
          { label: "Normal", value: "normal" },
          { label: "Italic", value: "italic" },
        ],
        defaultValue: "normal",
      },
      { key: "lineHeight", label: "Line height", type: "number", defaultValue: 0 },
      { key: "letterSpacing", label: "Letter spacing (px)", type: "number", defaultValue: 0 },
      { key: "textColor", label: "Text color", type: "color", defaultValue: "" },
    ],
  },
  ImageElement: {
    type: "ImageElement",
    label: "Image element",
    icon: "ImageIcon",
    defaultSettings: {
      src: "",
      alt: "",
      width: 100,
      height: 0,
      aspectRatio: "auto",
      objectFit: "cover",
      objectPosition: "center",
      opacity: 100,
      blur: 0,
      grayscale: 0,
      brightness: 100,
      contrast: 100,
      scale: 100,
      rotate: 0,
      shape: "none",
      borderRadius: 0,
      borderWidth: 0,
      borderStyle: "solid",
      borderColor: "#ffffff",
      overlayType: "none",
      overlayColor: "#000000",
      overlayOpacity: 0,
      overlayGradientFrom: "#000000",
      overlayGradientTo: "#ffffff",
      overlayGradientDirection: "to-bottom",
      transparencyMode: "none",
      transparencyDirection: "bottom",
      transparencyStrength: 0,
      imageShadow: { x: 0, y: 0, blur: 0, spread: 0, color: "#00000000" },
    },
    settingsSchema: [
      { key: "src", label: "Image", type: "image" },
      { key: "alt", label: "Alt text", type: "text", defaultValue: "" },
      { key: "width", label: "Width (%)", type: "range", defaultValue: 100, min: 10, max: 100 },
      { key: "height", label: "Fixed height (px)", type: "range", defaultValue: 0, min: 0, max: 800 },
      {
        key: "aspectRatio",
        label: "Aspect ratio",
        type: "select",
        options: [
          { label: "Auto", value: "auto" },
          { label: "1 / 1", value: "1 / 1" },
          { label: "4 / 3", value: "4 / 3" },
          { label: "3 / 4", value: "3 / 4" },
          { label: "16 / 9", value: "16 / 9" },
          { label: "9 / 16", value: "9 / 16" },
        ],
        defaultValue: "auto",
      },
      {
        key: "objectFit",
        label: "Crop mode",
        type: "select",
        options: [
          { label: "Cover (crop)", value: "cover" },
          { label: "Contain (fit)", value: "contain" },
          { label: "Fill", value: "fill" },
          { label: "None", value: "none" },
          { label: "Scale down", value: "scale-down" },
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
      { key: "rotate", label: "Rotate (deg)", type: "range", defaultValue: 0, min: -180, max: 180 },
      {
        key: "shape",
        label: "Shape",
        type: "select",
        options: [
          { label: "None", value: "none" },
          { label: "Rounded", value: "rounded" },
          { label: "Circle", value: "circle" },
        ],
        defaultValue: "none",
      },
      { key: "borderRadius", label: "Corner radius (px)", type: "range", defaultValue: 0, min: 0, max: 40 },
      { key: "borderWidth", label: "Border width (px)", type: "range", defaultValue: 0, min: 0, max: 12 },
      { key: "borderStyle", label: "Border style", type: "select", options: [
        { label: "Solid", value: "solid" },
        { label: "Dashed", value: "dashed" },
        { label: "Dotted", value: "dotted" },
        { label: "None", value: "none" },
      ], defaultValue: "solid" },
      { key: "borderColor", label: "Border color", type: "color", defaultValue: "#ffffff" },
      { key: "imageShadow", label: "Shadow", type: "shadow", defaultValue: { x: 0, y: 0, blur: 0, spread: 0, color: "#00000000" } },
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
      { key: "fontFamily", label: "Font family", type: "font-family", defaultValue: "" },
      { key: "fontSize", label: "Font size (px)", type: "number", defaultValue: 0 },
      { key: "fontWeight", label: "Font weight", type: "font-weight", defaultValue: "" },
      { key: "textColor", label: "Text color", type: "color", defaultValue: "" },
      { key: "bgColor", label: "Background color", type: "color", defaultValue: "" },
      { key: "borderColor", label: "Border color", type: "color", defaultValue: "" },
      { key: "borderRadius", label: "Border radius (px)", type: "number", defaultValue: 0 },
      { key: "borderWidth", label: "Border width (px)", type: "number", defaultValue: 0 },
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
  Image: {
    type: "Image",
    label: "Image",
    icon: "ImageIcon",
    defaultSettings: { src: "", alt: "", width: 100, borderRadius: 0 },
    settingsSchema: [
      { key: "src", label: "Image", type: "image" },
      { key: "alt", label: "Alt text", type: "text", defaultValue: "" },
      { key: "width", label: "Width (%)", type: "range", defaultValue: 100, min: 10, max: 100 },
      { key: "borderRadius", label: "Border radius", type: "number", defaultValue: 0 },
    ],
  },
  VideoEmbed: {
    type: "VideoEmbed",
    label: "Video embed",
    icon: "Video",
    defaultSettings: { url: "", aspectRatio: "16:9", autoplay: "no" },
    settingsSchema: [
      { key: "url", label: "Video URL", type: "text", defaultValue: "" },
      {
        key: "aspectRatio",
        label: "Aspect ratio",
        type: "select",
        options: [
          { label: "16:9", value: "16:9" },
          { label: "4:3", value: "4:3" },
          { label: "1:1", value: "1:1" },
        ],
        defaultValue: "16:9",
      },
      {
        key: "autoplay",
        label: "Autoplay",
        type: "select",
        options: [
          { label: "No", value: "no" },
          { label: "Yes", value: "yes" },
        ],
        defaultValue: "no",
      },
    ],
  },
  Divider: {
    type: "Divider",
    label: "Divider",
    icon: "Minus",
    defaultSettings: { dividerStyle: "solid", thickness: 1, dividerColor: "#4b5563" },
    settingsSchema: [
      {
        key: "dividerStyle",
        label: "Style",
        type: "select",
        options: [
          { label: "Solid", value: "solid" },
          { label: "Dashed", value: "dashed" },
          { label: "Dotted", value: "dotted" },
        ],
        defaultValue: "solid",
      },
      { key: "thickness", label: "Thickness (px)", type: "number", defaultValue: 1 },
      { key: "dividerColor", label: "Color", type: "color", defaultValue: "#4b5563" },
    ],
  },
  SocialLinks: {
    type: "SocialLinks",
    label: "Social links",
    icon: "Share2",
    defaultSettings: { platforms: "" },
    settingsSchema: [
      { key: "platforms", label: "Platform URLs (comma-separated)", type: "text", defaultValue: "" },
    ],
  },
  Icon: {
    type: "Icon",
    label: "Icon",
    icon: "Smile",
    defaultSettings: { iconName: "Star", iconSize: 24, iconColor: "#ffffff" },
    settingsSchema: [
      { key: "iconName", label: "Icon name", type: "text", defaultValue: "Star" },
      { key: "iconSize", label: "Size (px)", type: "number", defaultValue: 24 },
      { key: "iconColor", label: "Color", type: "color", defaultValue: "#ffffff" },
    ],
  },
  AppEmbed: {
    type: "AppEmbed",
    label: "App embed",
    icon: "AppWindow",
    defaultSettings: {
      appId: "chatbot",
      title: "",
      embedUrl: "",
      height: 420,
    },
    settingsSchema: [
      { key: "appId", label: "App", type: "select", options: [], defaultValue: "chatbot" },
      { key: "title", label: "Title", type: "text", defaultValue: "" },
      { key: "embedUrl", label: "Embed URL (iframe)", type: "text", defaultValue: "" },
      { key: "height", label: "Height (px)", type: "number", defaultValue: 420 },
    ],
  },
};

// ---------------------------------------------------------------------------
// Section definitions
// ---------------------------------------------------------------------------

export const SECTION_DEFINITIONS: Record<string, SectionDefinition> = {
  AnnouncementBar: {
    type: "AnnouncementBar",
    label: "Announcement bar",
    icon: "Megaphone",
    allowedBlockTypes: ["Announcement", "Text", "TextElement", "ImageElement", "Button", "Icon", "AppEmbed"],
    defaultSettings: {
      colorScheme: "scheme-2",
      paddingTop: 12,
      paddingBottom: 12,
      paddingLeft: 0,
      paddingRight: 0,
      marginTop: 0,
      marginBottom: 0,
      marginLeft: 0,
      marginRight: 0,
      contentAlignment: "center",
    },
    settingsSchema: [
      colorSchemeField("colorScheme", "Color scheme", "scheme-2"),
      {
        key: "contentAlignment",
        label: "Content alignment",
        type: "alignment",
        options: [
          { label: "Left", value: "left" },
          { label: "Center", value: "center" },
          { label: "Right", value: "right" },
        ],
        defaultValue: "center",
      },
      ...paddingFields(),
      ...marginFields(),
      ...sectionStyleFields(),
    ],
  },
  Block: {
    type: "Block",
    label: "Block",
    icon: "Box",
    allowedBlockTypes: BLOCK_SECTION_ALLOWED_BLOCK_TYPES,
    defaultSettings: {
      colorScheme: "none",
      paddingTop: 24,
      paddingBottom: 24,
      paddingLeft: 24,
      paddingRight: 24,
      marginTop: 0,
      marginBottom: 0,
      marginLeft: 0,
      marginRight: 0,
      contentAlignment: "left",
    },
    settingsSchema: [
      colorSchemeFieldWithNone("colorScheme", "Color scheme", "none"),
      {
        key: "contentAlignment",
        label: "Content alignment",
        type: "select",
        options: [
          { label: "Left", value: "left" },
          { label: "Center", value: "center" },
          { label: "Right", value: "right" },
        ],
        defaultValue: "left",
      },
      ...paddingFields(),
      ...marginFields(),
      ...sectionStyleFields(),
    ],
  },
  TextElement: {
    type: "TextElement",
    label: "Text element",
    icon: "FileText",
    allowedBlockTypes: [],
    defaultSettings: {
      textContent: "Text element",
      fontFamily: "Inter, sans-serif",
      fontSize: 0,
      fontWeight: "400",
      fontStyle: "normal",
      lineHeight: 0,
      letterSpacing: 0,
      textColor: "",
    },
    settingsSchema: [
      { key: "textContent", label: "Text", type: "text", defaultValue: "Text element" },
      { key: "fontFamily", label: "Font family", type: "font-family", defaultValue: "Inter, sans-serif" },
      { key: "fontSize", label: "Font size (px)", type: "number", defaultValue: 0 },
      { key: "fontWeight", label: "Font weight", type: "font-weight", defaultValue: "400" },
      {
        key: "fontStyle",
        label: "Font style",
        type: "select",
        options: [
          { label: "Normal", value: "normal" },
          { label: "Italic", value: "italic" },
        ],
        defaultValue: "normal",
      },
      { key: "lineHeight", label: "Line height", type: "number", defaultValue: 0 },
      { key: "letterSpacing", label: "Letter spacing (px)", type: "number", defaultValue: 0 },
      { key: "textColor", label: "Text color", type: "color", defaultValue: "" },
    ],
  },
  ImageWithText: {
    type: "ImageWithText",
    label: "Image with text",
    icon: "ImageIcon",
    allowedBlockTypes: ["Heading", "Text", "TextElement", "ImageElement", "Button", "AppEmbed"],
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
      ...sectionStyleFields(),
    ],
  },

  RichText: {
    type: "RichText",
    label: "Rich text",
    icon: "FileText",
    allowedBlockTypes: ["Heading", "Text", "TextElement", "ImageElement", "Button", "AppEmbed"],
    defaultSettings: {
      colorScheme: "scheme-1",
      paddingTop: 36,
      paddingBottom: 36,
    },
    settingsSchema: [
      colorSchemeField("colorScheme", "Color scheme"),
      ...paddingFields(),
      ...sectionStyleFields(),
    ],
  },

  Grid: {
    type: "Grid",
    label: "Grid",
    icon: "LayoutGrid",
    allowedBlockTypes: ["Row"],
    defaultSettings: {
      rows: 1,
      columns: 2,
      gap: "medium",
      paddingTop: 36,
      paddingBottom: 36,
      marginTop: 0,
      marginBottom: 0,
      colorScheme: "scheme-1",
    },
    settingsSchema: [
      { key: "rows", label: "Rows", type: "range", defaultValue: 1, min: 1, max: 8 },
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
      ...sectionStyleFields(),
    ],
  },

  Hero: {
    type: "Hero",
    label: "Hero banner",
    icon: "LayoutTemplate",
    allowedBlockTypes: ["Heading", "Text", "TextElement", "ImageElement", "Button", "AppEmbed"],
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
      ...sectionStyleFields(),
    ],
  },

  Accordion: {
    type: "Accordion",
    label: "Accordion",
    icon: "ListCollapse",
    allowedBlockTypes: ["Heading", "Text", "TextElement", "ImageElement", "AppEmbed"],
    defaultSettings: {
      colorScheme: "scheme-1",
      paddingTop: 36,
      paddingBottom: 36,
    },
    settingsSchema: [
      colorSchemeField("colorScheme", "Color scheme"),
      ...paddingFields(),
      ...sectionStyleFields(),
    ],
  },

  Testimonials: {
    type: "Testimonials",
    label: "Testimonials",
    icon: "Quote",
    allowedBlockTypes: ["Heading", "Text", "TextElement", "ImageElement", "Image", "AppEmbed"],
    defaultSettings: {
      layout: "grid",
      columns: 3,
      colorScheme: "scheme-1",
      paddingTop: 36,
      paddingBottom: 36,
    },
    settingsSchema: [
      {
        key: "layout",
        label: "Layout",
        type: "select",
        options: [
          { label: "Grid", value: "grid" },
          { label: "Carousel", value: "carousel" },
        ],
        defaultValue: "grid",
      },
      { key: "columns", label: "Columns", type: "range", defaultValue: 3, min: 1, max: 4 },
      colorSchemeField("colorScheme", "Color scheme"),
      ...paddingFields(),
      ...sectionStyleFields(),
    ],
  },

  Video: {
    type: "Video",
    label: "Video",
    icon: "Video",
    allowedBlockTypes: [],
    defaultSettings: {
      videoUrl: "",
      aspectRatio: "16:9",
      autoplay: "no",
      colorScheme: "scheme-1",
      paddingTop: 36,
      paddingBottom: 36,
    },
    settingsSchema: [
      { key: "videoUrl", label: "Video URL", type: "text", defaultValue: "" },
      {
        key: "aspectRatio",
        label: "Aspect ratio",
        type: "select",
        options: [
          { label: "16:9", value: "16:9" },
          { label: "4:3", value: "4:3" },
          { label: "1:1", value: "1:1" },
        ],
        defaultValue: "16:9",
      },
      {
        key: "autoplay",
        label: "Autoplay",
        type: "select",
        options: [
          { label: "No", value: "no" },
          { label: "Yes", value: "yes" },
        ],
        defaultValue: "no",
      },
      colorSchemeField("colorScheme", "Color scheme"),
      ...paddingFields(),
      ...sectionStyleFields(),
    ],
  },

  Slideshow: {
    type: "Slideshow",
    label: "Slideshow",
    icon: "GalleryHorizontal",
    allowedBlockTypes: ["Image", "Heading", "Text", "TextElement", "ImageElement", "Button", "AppEmbed"],
    defaultSettings: {
      transition: "fade",
      autoplaySpeed: 5000,
      showDots: "yes",
      colorScheme: "scheme-1",
      paddingTop: 36,
      paddingBottom: 36,
    },
    settingsSchema: [
      {
        key: "transition",
        label: "Transition",
        type: "select",
        options: [
          { label: "Fade", value: "fade" },
          { label: "Slide", value: "slide" },
        ],
        defaultValue: "fade",
      },
      { key: "autoplaySpeed", label: "Autoplay speed (ms)", type: "number", defaultValue: 5000 },
      {
        key: "showDots",
        label: "Show dots",
        type: "select",
        options: [
          { label: "Yes", value: "yes" },
          { label: "No", value: "no" },
        ],
        defaultValue: "yes",
      },
      colorSchemeField("colorScheme", "Color scheme"),
      ...paddingFields(),
      ...sectionStyleFields(),
    ],
  },

  Newsletter: {
    type: "Newsletter",
    label: "Newsletter",
    icon: "Mail",
    allowedBlockTypes: ["Heading", "Text", "TextElement", "ImageElement", "AppEmbed"],
    defaultSettings: {
      buttonText: "Subscribe",
      placeholder: "Enter your email",
      colorScheme: "scheme-1",
      paddingTop: 36,
      paddingBottom: 36,
    },
    settingsSchema: [
      { key: "buttonText", label: "Button text", type: "text", defaultValue: "Subscribe" },
      { key: "placeholder", label: "Placeholder", type: "text", defaultValue: "Enter your email" },
      colorSchemeField("colorScheme", "Color scheme"),
      ...paddingFields(),
      ...sectionStyleFields(),
    ],
  },

  ContactForm: {
    type: "ContactForm",
    label: "Contact form",
    icon: "Send",
    allowedBlockTypes: [],
    defaultSettings: {
      fields: "name,email,message",
      submitText: "Send message",
      successMessage: "Thank you! We will be in touch.",
      colorScheme: "scheme-1",
      paddingTop: 36,
      paddingBottom: 36,
    },
    settingsSchema: [
      { key: "fields", label: "Fields (comma-separated)", type: "text", defaultValue: "name,email,message" },
      { key: "submitText", label: "Submit button text", type: "text", defaultValue: "Send message" },
      { key: "successMessage", label: "Success message", type: "text", defaultValue: "Thank you! We will be in touch." },
      colorSchemeField("colorScheme", "Color scheme"),
      ...paddingFields(),
      ...sectionStyleFields(),
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

const SECTION_TYPES_BY_ZONE: Record<PageZone, string[]> = {
  header: ["AnnouncementBar", "Block", "TextElement", "Hero", "ImageWithText", "RichText", "Grid", "Slideshow"],
  template: Object.keys(SECTION_DEFINITIONS).filter((type) => type !== "AnnouncementBar"),
  footer: ["Block", "TextElement", "RichText", "Grid", "Newsletter", "ContactForm"],
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
