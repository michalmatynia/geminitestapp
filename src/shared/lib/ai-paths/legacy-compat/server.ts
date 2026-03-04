import 'server-only';

import { notFoundError } from '@/shared/errors/app-error';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';

import { isLegacyCompatRoutesEnabled } from './flags';

type LegacyCompatRouteCheckInput = {
  route: string;
  method: string;
  source: string;
};

export const assertLegacyCompatRouteEnabled = (input: LegacyCompatRouteCheckInput): void => {
  if (isLegacyCompatRoutesEnabled()) return;

  void logSystemEvent({
    level: 'warn',
    message: '[legacy-compat] route disabled',
    source: 'legacy-compat-route',
    context: {
      route: input.route,
      method: input.method,
      source: input.source,
    },
  });

  throw notFoundError(
    `Legacy compatibility route "${input.method} ${input.route}" is disabled. Use canonical /api/v2 endpoints.`
  );
};
