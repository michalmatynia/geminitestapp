export const KANGUR_SURFACE_HINT_SCRIPT =
  'document.documentElement.classList.add(\'kangur-surface-active\');' +
  'document.body.classList.add(\'kangur-surface-active\');';

const KANGUR_SURFACE_BOOTSTRAP_SELECTORS = [
  'html.kangur-surface-active',
  'body.kangur-surface-active',
  '#app-content.kangur-surface-active',
].join(',\n');

export const getKangurSurfaceBootstrapFallbackStyle = (): string =>
  `${KANGUR_SURFACE_BOOTSTRAP_SELECTORS} { background-color: #ffffff; color: #111827; }`;

const HTML_ESCAPE_MAP: Record<string, string> = {
  '<': '\\u003c',
  '>': '\\u003e',
  '&': '\\u0026',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
};

export const escapeForInlineScript = (value: string): string =>
  value.replace(/[<>&\u2028\u2029]/g, (character) => HTML_ESCAPE_MAP[character] ?? character);
