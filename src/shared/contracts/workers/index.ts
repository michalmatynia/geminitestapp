/**
 * Background Job & Queue Message Types
 *
 * Job payload and result contracts for BullMQ workers and async operations.
 *
 * Naming pattern:
 * - [ActionName]Job or [ActionName]Request for payloads
 * - [ActionName]JobResult or [ActionName]Response for results
 *
 * Examples:
 * import { ProcessProductAiJob, ProcessProductAiJobResult } from '@/shared/contracts/workers';
 */

// Worker job contracts live in this directory
// Export them with: export { ProcessProductAiJob, ProcessProductAiJobResult } from './product-ai-job';
