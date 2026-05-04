/**
 * Typography Configuration
 * 
 * Centralized font management system for the application.
 * Provides:
 * - Predefined font combinations for consistent branding
 * - User-selectable font sets with heading/body pairings
 * - System font fallbacks for performance
 * - Typography settings persistence
 */

export const APP_FONT_SET_SETTING_KEY = 'app_font_set.v1';

// Available font set identifiers
export type AppFontSetId =
  | 'system' // System default fonts
  | 'dm-sans' // DM Sans family
  | 'manrope' // Manrope family
  | 'outfit' // Outfit family
  | 'plus-jakarta' // Plus Jakarta Sans family
  | 'space-grotesk' // Space Grotesk family
  | 'sora' // Sora family
  | 'bebas-dm'; // Bebas Neue + DM Sans combination

// Font set configuration with heading and body font pairings
export type AppFontSet = {
  id: AppFontSetId;
  name: string; // Display name for UI
  description: string; // Description for font selection
  heading: string; // CSS font-family for headings
  body: string; // CSS font-family for body text
};

export const APP_FONT_SETS: readonly AppFontSet[] = [
  {
    id: 'system',
    name: 'System',
    description: 'Use system UI fonts (no downloads).',
    heading: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    body: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  {
    id: 'dm-sans',
    name: 'DM Sans',
    description: 'Clean, modern sans serif.',
    heading: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
    body: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: 'manrope',
    name: 'Manrope',
    description: 'Geometric sans with strong readability.',
    heading: '"Manrope", ui-sans-serif, system-ui, sans-serif',
    body: '"Manrope", ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: 'outfit',
    name: 'Outfit',
    description: 'Rounder, friendly sans serif.',
    heading: '"Outfit", ui-sans-serif, system-ui, sans-serif',
    body: '"Outfit", ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: 'plus-jakarta',
    name: 'Plus Jakarta Sans',
    description: 'Contemporary UI font with a bit of personality.',
    heading: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
    body: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: 'space-grotesk',
    name: 'Space Grotesk',
    description: 'Techy, compact sans serif.',
    heading: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
    body: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: 'sora',
    name: 'Sora',
    description: 'Crisp geometric sans serif.',
    heading: '"Sora", ui-sans-serif, system-ui, sans-serif',
    body: '"Sora", ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: 'bebas-dm',
    name: 'Bebas + DM Sans',
    description: 'Bebas Neue for headings, DM Sans for body.',
    heading: '"Bebas Neue", ui-sans-serif, system-ui, sans-serif',
    body: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
  },
] as const;

export const getAppFontSet = (id: string | null | undefined): AppFontSet => {
  const found = APP_FONT_SETS.find((set: AppFontSet) => set.id === id);
  return found ?? APP_FONT_SETS[0]!;
};
