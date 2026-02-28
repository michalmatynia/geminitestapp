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

export const normalizePlaywrightConfig = (
  config: PlaywrightConfig | undefined | null
): PlaywrightConfig => {
  const defaults = createDefaultPlaywrightConfig();
  return {
    personaId: config?.personaId ?? defaults.personaId,
    script: config?.script ?? defaults.script,
    waitForResult: config?.waitForResult ?? defaults.waitForResult,
    timeoutMs: config?.timeoutMs ?? defaults.timeoutMs,
    browserEngine: config?.browserEngine ?? defaults.browserEngine,
    startUrlTemplate: config?.startUrlTemplate ?? defaults.startUrlTemplate,
    launchOptionsJson: config?.launchOptionsJson ?? defaults.launchOptionsJson,
    contextOptionsJson: config?.contextOptionsJson ?? defaults.contextOptionsJson,
    settingsOverrides: config?.settingsOverrides ?? defaults.settingsOverrides,
    capture: {
      screenshot: config?.capture?.screenshot ?? defaults.capture?.screenshot ?? true,
      html: config?.capture?.html ?? defaults.capture?.html ?? false,
      video: config?.capture?.video ?? defaults.capture?.video ?? false,
      trace: config?.capture?.trace ?? defaults.capture?.trace ?? false,
    },
  };
};
