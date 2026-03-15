import { context, trace } from '@opentelemetry/api';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export type OtelContextAttributes = {
  otelTraceId?: string | undefined;
  otelSpanId?: string | undefined;
  otelTraceFlags?: string | undefined;
};

const toTraceFlagsHex = (traceFlags: number): string => traceFlags.toString(16).padStart(2, '0');

export const getActiveOtelContextAttributes = (): OtelContextAttributes => {
  try {
    const activeSpan = trace.getSpan(context.active());
    if (!activeSpan) return {};

    const spanContext = activeSpan.spanContext();
    if (!spanContext?.traceId || !spanContext.spanId) return {};

    return {
      otelTraceId: spanContext.traceId,
      otelSpanId: spanContext.spanId,
      ...(typeof spanContext.traceFlags === 'number'
        ? { otelTraceFlags: toTraceFlagsHex(spanContext.traceFlags) }
        : {}),
    };
  } catch (error) {
    logClientError(error);
    return {};
  }
};
