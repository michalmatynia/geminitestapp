import type { PlaywrightSettings } from '@/shared/contracts/playwright';

export type StickySessionDescriptor = {
  key: string;
  path: string;
  profile: PlaywrightSettings['identityProfile'];
  origin: string;
  scopeLabel: string;
};

export const stickySessionManager = {
  // Logic extracted from playwright-node-runner.ts
};
