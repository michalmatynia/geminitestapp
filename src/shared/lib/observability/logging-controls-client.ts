/**
 * Client Logging Controls
 * 
 * Client-side logging control management and state.
 * Provides:
 * - Client logging control state management
 * - Logging control type checking
 * - Client-side observability configuration
 * - Logging state access and updates
 * - Client-specific logging rules
 */

import type { ObservabilityLoggingControls } from '@/shared/contracts/observability';

import {
  DEFAULT_OBSERVABILITY_LOGGING_CONTROLS,
  isObservabilityLoggingEnabled,
  type ObservabilityLoggingControlType,
} from './logging-controls';

/** Client-side logging control state */
let clientLoggingControls: ObservabilityLoggingControls = {
  ...DEFAULT_OBSERVABILITY_LOGGING_CONTROLS,
};

/**
 * Gets the current client logging controls
 * @returns Current logging control configuration
 */
export const getClientLoggingControls = (): ObservabilityLoggingControls => ({
  ...clientLoggingControls,
});

/**
 * Checks if a specific logging control type is enabled on the client
 * @param type - Logging control type to check
 * @returns True if the control type is enabled
 */
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
