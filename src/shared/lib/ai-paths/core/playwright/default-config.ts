import type { PlaywrightConfig } from '@/shared/contracts/ai-paths';

import { PLAYWRIGHT_SCRIPT_TEMPLATES } from './script-templates';

export const DEFAULT_PLAYWRIGHT_SCRIPT =
  PLAYWRIGHT_SCRIPT_TEMPLATES[0]?.script ??
  'export default async function run({ page, input, emit }) { return {}; }';

export const DEFAULT_PLAYWRIGHT_TIMEOUT_MS = 120000;
export const DEFAULT_PLAYWRIGHT_BROWSER_ENGINE: NonNullable<PlaywrightConfig['browserEngine']> =
  'chromium';

export const DEFAULT_PLAYWRIGHT_CAPTURE_CONFIG: NonNullable<PlaywrightConfig['capture']> = {
  screenshot: true,
  html: false,
  video: false,
  trace: false,
};

export const createDefaultPlaywrightConfig = (): PlaywrightConfig => ({
  personaId: '',
  script: DEFAULT_PLAYWRIGHT_SCRIPT,
  waitForResult: true,
  timeoutMs: DEFAULT_PLAYWRIGHT_TIMEOUT_MS,
  browserEngine: DEFAULT_PLAYWRIGHT_BROWSER_ENGINE,
  startUrlTemplate: '',
  launchOptionsJson: '{}',
  contextOptionsJson: '{}',
  settingsOverrides: {},
  capture: {
    ...DEFAULT_PLAYWRIGHT_CAPTURE_CONFIG,
  },
});

const mergePlaywrightCaptureConfig = (
  capture: PlaywrightConfig['capture'] | undefined,
  defaults: NonNullable<PlaywrightConfig['capture']>
): NonNullable<PlaywrightConfig['capture']> => ({
  screenshot: capture?.screenshot ?? defaults.screenshot,
  html: capture?.html ?? defaults.html,
  video: capture?.video ?? defaults.video,
  trace: capture?.trace ?? defaults.trace,
});

export const normalizePlaywrightConfig = (
  config: PlaywrightConfig | undefined | null
): PlaywrightConfig => {
  const defaults = createDefaultPlaywrightConfig();
  const defaultCapture = defaults.capture ?? DEFAULT_PLAYWRIGHT_CAPTURE_CONFIG;
  return {
    ...defaults,
    ...(config ?? {}),
    capture: mergePlaywrightCaptureConfig(config?.capture, defaultCapture),
  };
};
