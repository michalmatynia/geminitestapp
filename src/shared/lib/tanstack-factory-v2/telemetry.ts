import { type QueryKey } from '@tanstack/react-query';
import { emitTanstackTelemetry } from '@/shared/lib/observability/tanstack-telemetry';
import { TanstackFactoryMeta, TanstackLifecycleStage } from '../tanstack-factory-v2.types';

type EmitFactoryTelemetryInput = {
  entity: 'query' | 'mutation' | 'query-batch';
  stage: TanstackLifecycleStage;
  meta: TanstackFactoryMeta;
  key: QueryKey | undefined;
  attempt: number;
  context?: Record<string, unknown> | undefined;
  startedAtMs?: number | undefined;
  error?: unknown;
};

export const emitFactoryTelemetry = ({
  entity,
  stage,
  meta,
  key,
  attempt,
  context,
  startedAtMs,
  error,
}: EmitFactoryTelemetryInput): void => {
  emitTanstackTelemetry({
    entity,
    stage,
    meta,
    key,
    attempt,
    ...(typeof startedAtMs === 'number' ? { durationMs: Date.now() - startedAtMs } : {}),
    ...(error !== undefined ? { error } : {}),
    context,
  });
};

export const withQueryKeyMeta = <TQueryKey extends QueryKey>(
  meta: TanstackFactoryMeta,
  queryKey: TQueryKey
): TanstackFactoryMeta => ({
  ...meta,
  queryKey,
});

export const withMutationKeyMeta = (
  meta: TanstackFactoryMeta,
  mutationKey: QueryKey | undefined
): TanstackFactoryMeta => ({
  ...meta,
  ...(mutationKey ? { mutationKey } : {}),
});
