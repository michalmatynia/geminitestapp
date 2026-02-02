export const APP_FONT_SET_SETTING_KEY = "app_font_set.v1";

export type AppFontSetId =
  | "system"
  | "dm-sans"
  | "manrope"
  | "outfit"
  | "plus-jakarta"
  | "space-grotesk"
  | "sora"
  | "bebas-dm";

export type AppFontSet = {
  id: AppFontSetId;
  name: string;
  description: string;
  heading: string;
  body: string;
};

export const APP_FONT_SETS: readonly AppFontSet[] = [
  {
    id: "system",
    name: "System",
    description: "Use system UI fonts (no downloads).",
    heading:
      "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
    body: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
  },
  {
    id: "dm-sans",
    name: "DM Sans",
    description: "Clean, modern sans serif.",
    heading: "\"DM Sans\", ui-sans-serif, system-ui, sans-serif",
    body: "\"DM Sans\", ui-sans-serif, system-ui, sans-serif",
  },
  {
    id: "manrope",
    name: "Manrope",
    description: "Geometric sans with strong readability.",
    heading: "\"Manrope\", ui-sans-serif, system-ui, sans-serif",
    body: "\"Manrope\", ui-sans-serif, system-ui, sans-serif",
  },
  {
    id: "outfit",
    name: "Outfit",
    description: "Rounder, friendly sans serif.",
    heading: "\"Outfit\", ui-sans-serif, system-ui, sans-serif",
    body: "\"Outfit\", ui-sans-serif, system-ui, sans-serif",
  },
  {
    id: "plus-jakarta",
    name: "Plus Jakarta Sans",
    description: "Contemporary UI font with a bit of personality.",
    heading: "\"Plus Jakarta Sans\", ui-sans-serif, system-ui, sans-serif",
    body: "\"Plus Jakarta Sans\", ui-sans-serif, system-ui, sans-serif",
  },
  {
    id: "space-grotesk",
    name: "Space Grotesk",
    description: "Techy, compact sans serif.",
    heading: "\"Space Grotesk\", ui-sans-serif, system-ui, sans-serif",
    body: "\"Space Grotesk\", ui-sans-serif, system-ui, sans-serif",
  },
  {
    id: "sora",
    name: "Sora",
    description: "Crisp geometric sans serif.",
    heading: "\"Sora\", ui-sans-serif, system-ui, sans-serif",
    body: "\"Sora\", ui-sans-serif, system-ui, sans-serif",
  },
  {
    id: "bebas-dm",
    name: "Bebas + DM Sans",
    description: "Bebas Neue for headings, DM Sans for body.",
    heading: "\"Bebas Neue\", ui-sans-serif, system-ui, sans-serif",
    body: "\"DM Sans\", ui-sans-serif, system-ui, sans-serif",
  },
] as const;

export const getAppFontSet = (id: string | null | undefined): AppFontSet => {
  const found = APP_FONT_SETS.find((set) => set.id === id);
  return found ?? APP_FONT_SETS[0]!;
};

