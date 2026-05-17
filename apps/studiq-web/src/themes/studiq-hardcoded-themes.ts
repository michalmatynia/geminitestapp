/**
 * StudiQ hardcoded theme tokens for all 4 appearance modes.
 * Each theme maps to CSS custom properties set via data-theme attribute.
 * Themes are self-contained and modular — add/remove without touching others.
 */

export type StudiQThemeId = 'daily' | 'dawn' | 'sunset' | 'nightly';

export interface StudiQThemeTokens {
  id: StudiQThemeId;
  label: string;
  /** CSS vars keyed without leading '--' */
  vars: Record<string, string>;
  /** Extra font imports needed */
  fonts: string[];
  /** Ambient orb colors for animated mesh background */
  orbs: [string, string, string];
}

// ─── Daily ────────────────────────────────────────────────────────────────────
// Soft lavender canvas, electric violet primary, fuchsia CTA.
// Sora headlines / DM Sans body — approachable, modern, learner-facing.
// Accent: magenta/fuchsia (#d946ef) — violet's natural complement, no warm clash.

const daily: StudiQThemeTokens = {
  id: 'daily',
  label: 'Daily',
  fonts: [
    'https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap',
  ],
  orbs: ['#c4bfff', '#e8b4fb', '#f0c0ff'],
  vars: {
    'heading-font': "'Sora', sans-serif",
    'body-font': "'DM Sans', sans-serif",
    'bg': '#f1ecf4',
    'bg-alt': '#ece6f0',
    'surface': '#faf7fc',
    'surface-raised': '#ffffff',
    'surface-inset': '#ede8f1',
    'border': 'rgba(107, 99, 255, 0.14)',
    'border-strong': 'rgba(107, 99, 255, 0.26)',
    'primary': '#6b63ff',
    'primary-light': '#ebe9ff',
    'primary-dark': '#4e46d4',
    'primary-fg': '#ffffff',
    'accent': '#d946ef',
    'accent-light': '#fdf4ff',
    'accent-fg': '#ffffff',
    'text': '#1a1630',
    'text-secondary': '#6e6a82',
    'text-tertiary': '#a09bba',
    'btn-bg': 'linear-gradient(135deg, #9490ff 0%, #6b63ff 55%, #5040e0 100%)',
    'btn-shadow': '0 8px 24px -4px rgba(107, 99, 255, 0.44)',
    'card-shadow': '0 4px 24px -4px rgba(107, 99, 255, 0.12)',
    'card-shadow-hover': '0 12px 40px -6px rgba(107, 99, 255, 0.22)',
    'hero-gradient': 'linear-gradient(135deg, #6b63ff 0%, #9b8fff 100%)',
    'streak-color': '#f59e0b',
    'progress-track': '#ede8f1',
    'progress-fill': '#6b63ff',
    'tag-bg': '#ebe9ff',
    'tag-text': '#4e46d4',
    'success': '#22c55e',
    'warning': '#f59e0b',
    'error': '#f06f7b',
    'radius-sm': '10px',
    'radius': '16px',
    'radius-lg': '24px',
    'radius-xl': '32px',
    'radius-pill': '999px',
  },
};

// ─── Dawn ─────────────────────────────────────────────────────────────────────
// Warm cream canvas, deep teal primary, muted gold accents.
// Outfit headlines / Plus Jakarta Sans body — calm, focused, early-morning.

const dawn: StudiQThemeTokens = {
  id: 'dawn',
  label: 'Dawn',
  fonts: [
    'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap',
  ],
  orbs: ['#b8e8e3', '#f5dfa0', '#ffd6b0'],
  vars: {
    'heading-font': "'Outfit', sans-serif",
    'body-font': "'Plus Jakarta Sans', sans-serif",
    'bg': '#f7f1e8',
    'bg-alt': '#f0ead8',
    'surface': '#fdfaf4',
    'surface-raised': '#ffffff',
    'surface-inset': '#ede5d6',
    'border': 'rgba(47, 125, 122, 0.14)',
    'border-strong': 'rgba(47, 125, 122, 0.28)',
    'primary': '#2f7d7a',
    'primary-light': '#d5f0ef',
    'primary-dark': '#1e5a58',
    'primary-fg': '#ffffff',
    'accent': '#d4a853',
    'accent-light': '#fdf3db',
    'accent-fg': '#ffffff',
    'text': '#1a1712',
    'text-secondary': '#6b6150',
    'text-tertiary': '#a39880',
    'btn-bg': 'linear-gradient(135deg, #3c9c99 0%, #2f7d7a 50%, #1e6361 100%)',
    'btn-shadow': '0 8px 24px -4px rgba(47, 125, 122, 0.38)',
    'card-shadow': '0 4px 24px -4px rgba(47, 125, 122, 0.10)',
    'card-shadow-hover': '0 12px 40px -6px rgba(47, 125, 122, 0.20)',
    'hero-gradient': 'linear-gradient(135deg, #2f7d7a 0%, #4fb3af 100%)',
    'streak-color': '#d4a853',
    'progress-track': '#ede5d6',
    'progress-fill': '#2f7d7a',
    'tag-bg': '#d5f0ef',
    'tag-text': '#1e5a58',
    'success': '#2d9e6b',
    'warning': '#d4a853',
    'error': '#e05c6b',
    'radius-sm': '8px',
    'radius': '14px',
    'radius-lg': '20px',
    'radius-xl': '28px',
    'radius-pill': '999px',
  },
};

// ─── Sunset ───────────────────────────────────────────────────────────────────
// Warm white canvas, vivid orange primary, coral-rose accents.
// Space Grotesk headlines / Nunito body — energetic, playful, afternoon vibe.

const sunset: StudiQThemeTokens = {
  id: 'sunset',
  label: 'Sunset',
  fonts: [
    'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Nunito:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap',
  ],
  orbs: ['#ffd0a0', '#ffb3c1', '#ffe0a0'],
  vars: {
    'heading-font': "'Space Grotesk', sans-serif",
    'body-font': "'Nunito', sans-serif",
    'bg': '#fff7f0',
    'bg-alt': '#ffeee0',
    'surface': '#fffcfa',
    'surface-raised': '#ffffff',
    'surface-inset': '#ffe8d8',
    'border': 'rgba(249, 115, 22, 0.14)',
    'border-strong': 'rgba(249, 115, 22, 0.28)',
    'primary': '#f97316',
    'primary-light': '#ffedd5',
    'primary-dark': '#c2570f',
    'primary-fg': '#ffffff',
    'accent': '#f43f5e',
    'accent-light': '#ffe4e9',
    'accent-fg': '#ffffff',
    'text': '#1c1008',
    'text-secondary': '#7a5038',
    'text-tertiary': '#b08060',
    'btn-bg': 'linear-gradient(135deg, #fb923c 0%, #f97316 50%, #ea6c0b 100%)',
    'btn-shadow': '0 8px 24px -4px rgba(249, 115, 22, 0.40)',
    'card-shadow': '0 4px 24px -4px rgba(249, 115, 22, 0.10)',
    'card-shadow-hover': '0 12px 40px -6px rgba(249, 115, 22, 0.22)',
    'hero-gradient': 'linear-gradient(135deg, #f97316 0%, #fb923c 60%, #f43f5e 100%)',
    'streak-color': '#f97316',
    'progress-track': '#ffe8d8',
    'progress-fill': '#f97316',
    'tag-bg': '#ffedd5',
    'tag-text': '#c2570f',
    'success': '#22c55e',
    'warning': '#f59e0b',
    'error': '#f43f5e',
    'radius-sm': '6px',
    'radius': '12px',
    'radius-lg': '18px',
    'radius-xl': '26px',
    'radius-pill': '999px',
  },
};

// ─── Nightly ──────────────────────────────────────────────────────────────────
// Deep ink canvas, soft violet primary, electric cyan accents.
// Manrope headlines / IBM Plex Sans body — focused, premium, late-night.

const nightly: StudiQThemeTokens = {
  id: 'nightly',
  label: 'Nightly',
  fonts: [
    'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap',
  ],
  orbs: ['#2d2060', '#0d4060', '#1a0d3a'],
  vars: {
    'heading-font': "'Manrope', sans-serif",
    'body-font': "'IBM Plex Sans', sans-serif",
    'bg': '#0c1018',
    'bg-alt': '#0a0d14',
    'surface': '#131924',
    'surface-raised': '#1a2230',
    'surface-inset': '#0e1420',
    'border': 'rgba(138, 128, 255, 0.16)',
    'border-strong': 'rgba(138, 128, 255, 0.30)',
    'primary': '#8a80ff',
    'primary-light': '#1e1a40',
    'primary-dark': '#6b63ff',
    'primary-fg': '#ffffff',
    'accent': '#22d3ee',
    'accent-light': '#0a2832',
    'accent-fg': '#0c1018',
    'text': '#e8eaf0',
    'text-secondary': '#8a93a8',
    'text-tertiary': '#4e5768',
    'btn-bg': 'linear-gradient(135deg, #9b8fff 0%, #8a80ff 50%, #7060ff 100%)',
    'btn-shadow': '0 8px 24px -4px rgba(138, 128, 255, 0.38)',
    'card-shadow': '0 4px 24px -4px rgba(0, 0, 0, 0.40)',
    'card-shadow-hover': '0 12px 40px -6px rgba(138, 128, 255, 0.22)',
    'hero-gradient': 'linear-gradient(135deg, #8a80ff 0%, #6b63ff 100%)',
    'streak-color': '#22d3ee',
    'progress-track': '#1a2230',
    'progress-fill': '#8a80ff',
    'tag-bg': '#1e1a40',
    'tag-text': '#9b8fff',
    'success': '#34d399',
    'warning': '#fbbf24',
    'error': '#f87171',
    'radius-sm': '8px',
    'radius': '14px',
    'radius-lg': '20px',
    'radius-xl': '28px',
    'radius-pill': '999px',
  },
};

export const STUDIQ_THEMES: Record<StudiQThemeId, StudiQThemeTokens> = {
  daily,
  dawn,
  sunset,
  nightly,
};

export const STUDIQ_THEME_ORDER: StudiQThemeId[] = ['daily', 'dawn', 'sunset', 'nightly'];

/** Generates a complete <style> block for a given theme (data-theme selector). */
export function generateThemeCssBlock(theme: StudiQThemeTokens): string {
  const declarations = Object.entries(theme.vars)
    .map(([k, v]) => `  --${k}: ${v};`)
    .join('\n');
  return `[data-theme="${theme.id}"] {\n${declarations}\n}`;
}

/** Generates the complete CSS for all themes (useful for injection into a <style> tag). */
export function generateAllThemesCss(): string {
  return STUDIQ_THEME_ORDER.map((id) => generateThemeCssBlock(STUDIQ_THEMES[id])).join('\n\n');
}
