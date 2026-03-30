import type { ObservabilityLoggingControls } from '@/shared/contracts/observability';

import {
  DEFAULT_OBSERVABILITY_LOGGING_CONTROLS,
  isObservabilityLoggingEnabled,
  type ObservabilityLoggingControlType,
} from './logging-controls';

let clientLoggingControls: ObservabilityLoggingControls = {
  ...DEFAULT_OBSERVABILITY_LOGGING_CONTROLS,
};

export const getClientLoggingControls = (): ObservabilityLoggingControls => ({
  ...clientLoggingControls,
});

export const isClientLoggingControlEnabled = (
  type: ObservabilityLoggingControlType
): boolean => isObservabilityLoggingEnabled(clientLoggingControls, type);

export const setClientLoggingControls = (controls: ObservabilityLoggingControls): void => {
  clientLoggingControls = { ...controls };
};

export const resetClientLoggingControlsForTests = (): void => {
  clientLoggingControls = {
    ...DEFAULT_OBSERVABILITY_LOGGING_CONTROLS,
  };
};
