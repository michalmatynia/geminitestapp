import { registerLogHydrator } from '@/shared/lib/observability/log-hydration-registry';
import { hydrateLogRuntimeContext } from './runtime-context/hydrate-system-log-runtime-context';

// Register observability-specific hydrator to system-logger without circular dependencies
registerLogHydrator(hydrateLogRuntimeContext);

export * from './runtime-context/hydrate-system-log-runtime-context';
export * from './runtime-context/sanitize-system-log-for-ai';
