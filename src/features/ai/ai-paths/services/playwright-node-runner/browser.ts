import {
  buildChromiumAntiDetectionContextOptions,
  buildChromiumAntiDetectionLaunchOptions,
  installChromiumAntiDetectionInitScript,
  resolveChromiumAntiDetectionRuntimeBehavior,
} from '@/shared/lib/playwright/anti-detection';
import { applyPlaywrightProxySessionAffinity } from '@/shared/lib/playwright/proxy-affinity';

export const browserManager = {
  buildAntiDetectionContext: buildChromiumAntiDetectionContextOptions,
  buildAntiDetectionLaunch: buildChromiumAntiDetectionLaunchOptions,
  installAntiDetectionScript: installChromiumAntiDetectionInitScript,
  resolveBehavior: resolveChromiumAntiDetectionRuntimeBehavior,
  applyProxyAffinity: applyPlaywrightProxySessionAffinity,
};
