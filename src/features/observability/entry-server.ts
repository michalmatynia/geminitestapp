import { registerLogHydrator } from '@/shared/lib/observability/log-hydration-registry';
import { hydrateLogRuntimeContext } from '@/shared/lib/observability/runtime-context/hydrate-system-log-runtime-context';

// Register observability-specific hydrator to system-logger without circular dependencies
if (typeof hydrateLogRuntimeContext === 'function') {
  registerLogHydrator(hydrateLogRuntimeContext);
}

export * from '@/shared/lib/observability/runtime-context/hydrate-system-log-runtime-context';
export * from '@/shared/lib/observability/runtime-context/sanitize-system-log-for-ai';
