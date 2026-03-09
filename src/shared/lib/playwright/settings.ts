import type { PlaywrightSettings } from '@/shared/contracts/playwright';

export const defaultPlaywrightSettings: PlaywrightSettings = {
  headless: true,
  slowMo: 50,
  timeout: 15000,
  navigationTimeout: 30000,
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
];
