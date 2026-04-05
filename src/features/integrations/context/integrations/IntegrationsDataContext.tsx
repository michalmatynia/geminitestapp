'use client';

import type { IntegrationsData } from '@/shared/contracts/integrations/context';
import { createStrictContext } from '../createStrictContext';

export const { Context: IntegrationsDataContext, useValue: useIntegrationsData } =
  createStrictContext<IntegrationsData>({
    displayName: 'IntegrationsDataContext',
    errorMessage: 'useIntegrationsData must be used within IntegrationsProvider',
  });
