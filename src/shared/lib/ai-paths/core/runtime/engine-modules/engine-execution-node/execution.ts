import { type RunNodeArgs } from './types';
import { resolveNodeHandlerOrThrow } from '../engine-execution-handlers';
import { buildRuntimeTelemetryFields } from '../engine-telemetry';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { GraphExecutionError } from '../engine-types';

export async function runNode(args: RunNodeArgs): Promise<unknown> {
  const { node, iteration, state, options, telemetryResolver, executed } = args;
  
  const telemetry = telemetryResolver.resolve(node.type);
  const handler = resolveNodeHandlerOrThrow(node.type);
  
  try {
    const result = await handler.execute({
      node,
      iteration,
      context: {
        runId: args.resolvedRunId,
        startedAt: args.resolvedRunStartedAt,
        triggerContext: args.triggerContext,
        telemetry,
        executed,
      },
      ...args.options,
    });
    return result;
  } catch (error) {
    logClientError(error);
    throw new GraphExecutionError(`Failed to execute node ${node.id}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
