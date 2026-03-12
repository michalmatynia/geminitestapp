export type SystemLogAlertsJobData = {
  type: 'alert-tick';
};

export type MongoSystemLogDoc = {
  _id?: string;
  id?: string;
  level?: string;
  message?: string;
  category?: string | null;
  source?: string | null;
  service?: string | null;
  context?: Record<string, unknown> | null;
  stack?: string | null;
  path?: string | null;
  method?: string | null;
  statusCode?: number | null;
  requestId?: string | null;
  traceId?: string | null;
  correlationId?: string | null;
  spanId?: string | null;
  parentSpanId?: string | null;
  userId?: string | null;
  createdAt?: Date;
};

export type AlertEvidenceContextRegistry = {
  refs: Array<{
    id: string;
    kind: string;
    providerId?: string;
    entityType?: string;
  }>;
  engineVersion: string | null;
};

export type AlertEvidenceSample = {
  logId: string;
  createdAt: string;
  level: string;
  source: string | null;
  message: string;
  fingerprint: string | null;
  contextRegistry: AlertEvidenceContextRegistry | null;
};

export type AlertEvidenceContext = {
  windowStart: string | null;
  windowEnd: string;
  matchedCount: number;
  sampleSize: number;
  samples: AlertEvidenceSample[];
  lastObservedLog?: AlertEvidenceSample | null;
};

export type AlertEvidenceQuery = {
  level?: 'info' | 'warn' | 'error';
  sourceContains?: string;
  service?: string;
  pathPrefix?: string;
  statusCodeMin?: number;
  statusCodeMax?: number;
  excludeAlertEvents?: boolean;
  from?: Date | null;
  to?: Date | null;
  limit?: number;
};

export type SystemLogAlertsQueueState = {
  workerStarted: boolean;
  schedulerRegistered: boolean;
  startupTickQueued: boolean;
  lastAlertAt: number;
  lastSilenceAlertAt: number;
  perSourceLastAlertAt: Record<string, number>;
  perServiceLastAlertAt: Record<string, number>;
  perSlowRouteLastAlertAt: Record<string, number>;
  perServiceTelemetrySilenceLastAlertAt: Record<string, number>;
  perAlertLastFiredAt: Record<string, number>;
};
