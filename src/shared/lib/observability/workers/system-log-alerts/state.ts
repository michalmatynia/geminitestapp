import { type SystemLogAlertsQueueState } from './types';

const globalWithState = globalThis as typeof globalThis & {
  __systemLogAlertsQueueState__?: SystemLogAlertsQueueState;
};

export const queueState =
  globalWithState.__systemLogAlertsQueueState__ ??
  (globalWithState.__systemLogAlertsQueueState__ = {
    workerStarted: false,
    schedulerRegistered: false,
    startupTickQueued: false,
    lastAlertAt: 0,
    lastSilenceAlertAt: 0,
    perSourceLastAlertAt: {},
    perServiceLastAlertAt: {},
    perSlowRouteLastAlertAt: {},
    perServiceTelemetrySilenceLastAlertAt: {},
    perAlertLastFiredAt: {},
  });

export const shouldCheckAlerts = (): boolean => {
  if (process.env['SYSTEM_LOG_ALERTS_ENABLED'] === 'false') return false;
  return true;
};
