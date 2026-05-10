# application-performance Audit Exception Log

## Permitted Console Usage

The following console methods are flagged by the `observability:check` audit but serve as necessary, low-level fallback mechanisms within the observability system itself, where `logSystemEvent` cannot be used to avoid infinite recursion.

| File | Method | Reason |
| --- | --- | --- |
| `src/shared/utils/observability/client-error-logger.ts` | `console.debug`/`console.warn` | Used as low-level logger for debug/warning information when the system logger is unavailable. |
| `src/shared/utils/observability/internal-observability-fallback.ts` | `console.error` | Final fallback error reporting mechanism when structured logging fails. |
| `src/features/playwright/server/ai-step/verification.ts` | `console.log` | Temporary diagnostic logs in non-production playwright server components. |

*Note: These files were manually reviewed on 2026-05-06 and verified to be necessary architectural fallbacks.*
