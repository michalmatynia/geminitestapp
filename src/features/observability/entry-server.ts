import { registerLogHydrator } from '@/shared/lib/observability/log-hydration-registry';
import { hydrateLogRuntimeContext } from './server/runtime-context/hydrate-system-log-runtime-context';

// Register observability-specific hydrator to system-logger without circular dependencies
registerLogHydrator(hydrateLogRuntimeContext);

export * from './server/runtime-context/hydrate-system-log-runtime-context';
export * from './server/runtime-context/sanitize-system-log-for-ai';
