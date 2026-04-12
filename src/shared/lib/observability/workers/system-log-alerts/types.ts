import type {
  AlertEvidenceContext,
  AlertEvidenceContextRegistry,
  AlertEvidenceSample,
} from '@/shared/contracts/observability';
import type {
  SchedulerQueueState,
  TypedSchedulerTickJobData,
} from '@/shared/lib/queue/scheduler-queue-types';
import type { MongoSystemLogDoc } from '@/shared/lib/observability/system-log-types';

export type SystemLogAlertsJobData = TypedSchedulerTickJobData<'alert-tick'>;

export type { MongoSystemLogDoc, AlertEvidenceContext, AlertEvidenceContextRegistry, AlertEvidenceSample };

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

export type SystemLogAlertsQueueState = SchedulerQueueState & {
  startupTickQueued: boolean;
  lastAlertAt: number;
  lastSilenceAlertAt: number;
  perSourceLastAlertAt: Record<string, number>;
  perServiceLastAlertAt: Record<string, number>;
  perSlowRouteLastAlertAt: Record<string, number>;
  perServiceTelemetrySilenceLastAlertAt: Record<string, number>;
  perAlertLastFiredAt: Record<string, number>;
};
