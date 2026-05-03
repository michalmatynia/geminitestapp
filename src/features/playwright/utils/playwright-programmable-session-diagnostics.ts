import type { PlaywrightSettings } from '@/shared/contracts/playwright';

import type { ProgrammableSessionPreview } from './playwright-programmable-session-preview';

const SHARED_OVERRIDE_FIELDS: Array<[keyof PlaywrightSettings, string]> = [
  ['headless', 'Headless mode'],
  ['slowMo', 'SlowMo'],
  ['timeout', 'Timeout'],
  ['navigationTimeout', 'Navigation timeout'],
  ['locale', 'Locale'],
  ['timezoneId', 'Timezone'],
  ['emulateDevice', 'Device emulation'],
  ['deviceName', 'Device'],
];

export type ProgrammableSessionDiagnostics = {
  sharedOverrideSummary: string[];
  divergentActionSummary: string[];
  conflictingSharedOverrideSummary: string[];
};

export const buildProgrammableSessionDiagnostics = ({
  listingPreview,
  importPreview,
  currentSettings,
  personaBaseline,
}: {
  listingPreview: ProgrammableSessionPreview;
  importPreview: ProgrammableSessionPreview;
  currentSettings: PlaywrightSettings;
  personaBaseline: PlaywrightSettings;
}): ProgrammableSessionDiagnostics => {
  const sharedOverrideEntries = SHARED_OVERRIDE_FIELDS.filter(
    ([key]) => currentSettings[key] !== personaBaseline[key]
  );
  const divergentActionEntries = SHARED_OVERRIDE_FIELDS.filter(
    ([key]) =>
      listingPreview.actionBaselineSettings[key] !== importPreview.actionBaselineSettings[key]
  );

  return {
    sharedOverrideSummary: sharedOverrideEntries.map(([, label]) => label),
    divergentActionSummary: divergentActionEntries.map(([, label]) => label),
    conflictingSharedOverrideSummary: sharedOverrideEntries
      .filter(([key]) =>
        divergentActionEntries.some(([divergentKey]) => divergentKey === key)
      )
      .map(([, label]) => label),
  };
};
