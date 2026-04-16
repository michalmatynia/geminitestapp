import type { LabeledOptionDto } from '@/shared/contracts/base';
import type {
  PlaywrightIdentityProfile,
  PlaywrightProxyProviderPreset,
  PlaywrightProxySessionMode,
  PlaywrightSettings,
} from '@/shared/contracts/playwright';

export const playwrightIdentityProfileOptions = [
  { value: 'default', label: 'Default' },
  { value: 'search', label: 'Search Engine' },
  { value: 'marketplace', label: 'Marketplace' },
] as const satisfies ReadonlyArray<LabeledOptionDto<PlaywrightIdentityProfile>>;

export const playwrightProxySessionModeOptions = [
  { value: 'sticky', label: 'Sticky Session' },
  { value: 'rotate', label: 'Rotate Per Run' },
] as const satisfies ReadonlyArray<LabeledOptionDto<PlaywrightProxySessionMode>>;

export const playwrightProxyProviderPresetOptions = [
  { value: 'custom', label: 'Custom' },
  { value: 'brightdata', label: 'Bright Data' },
  { value: 'oxylabs', label: 'Oxylabs' },
  { value: 'decodo', label: 'Decodo' },
] as const satisfies ReadonlyArray<LabeledOptionDto<PlaywrightProxyProviderPreset>>;

export const defaultPlaywrightSettings: PlaywrightSettings = {
  identityProfile: 'default',
  headless: true,
  slowMo: 50,
  timeout: 15000,
  navigationTimeout: 30000,
  locale: '',
  timezoneId: '',
  humanizeMouse: false,
  mouseJitter: 6,
  clickDelayMin: 30,
  clickDelayMax: 120,
  inputDelayMin: 20,
  inputDelayMax: 120,
  actionDelayMin: 200,
  actionDelayMax: 900,
  proxyEnabled: false,
  proxyServer: '',
  proxyUsername: '',
  proxyPassword: '',
  proxySessionAffinity: false,
  proxySessionMode: 'sticky',
  proxyProviderPreset: 'custom',
  emulateDevice: false,
  deviceName: 'Desktop Chrome',
};

export const playwrightDeviceOptions = [
  { value: 'Desktop Chrome', label: 'Desktop Chrome' },
  { value: 'Desktop Firefox', label: 'Desktop Firefox' },
  { value: 'Desktop Safari', label: 'Desktop Safari' },
  { value: 'iPhone 13', label: 'iPhone 13' },
  { value: 'iPhone 14 Pro', label: 'iPhone 14 Pro' },
  { value: 'Pixel 7', label: 'Pixel 7' },
  { value: 'iPad (gen 7)', label: 'iPad (gen 7)' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;
