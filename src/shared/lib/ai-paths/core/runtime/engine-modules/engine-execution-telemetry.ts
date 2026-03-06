import {
  type EvaluateGraphOptions,
  type RuntimeNodeResolutionTelemetry,
} from './engine-types';

export const buildRuntimeTelemetryFields = (
  telemetry: RuntimeNodeResolutionTelemetry | null
): {
  runtimeStrategy?: RuntimeNodeResolutionTelemetry['runtimeStrategy'];
  runtimeResolutionSource?: RuntimeNodeResolutionTelemetry['runtimeResolutionSource'];
  runtimeCodeObjectId?: string | null;
} =>
  telemetry
    ? {
      runtimeStrategy: telemetry.runtimeStrategy,
      runtimeResolutionSource: telemetry.runtimeResolutionSource,
      runtimeCodeObjectId: telemetry.runtimeCodeObjectId ?? null,
    }
    : {};

export class RuntimeTelemetryResolver {
  private cache = new Map<string, RuntimeNodeResolutionTelemetry | null>();

  constructor(private options: EvaluateGraphOptions) {}

  resolve(nodeTypeInput: string): RuntimeNodeResolutionTelemetry | null {
    const nodeType = typeof nodeTypeInput === 'string' ? nodeTypeInput.trim() : '';
    if (!nodeType) return null;
    if (this.cache.has(nodeType)) {
      return this.cache.get(nodeType) ?? null;
    }
    const telemetry = this.options.resolveHandlerTelemetry
      ? this.options.resolveHandlerTelemetry(nodeType)
      : null;
    this.cache.set(nodeType, telemetry ?? null);
    return telemetry ?? null;
  }
}
