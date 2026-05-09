import { type TraderaExecutionStep } from '@/shared/contracts/integrations/listings';
import { readTraderaExecutionSteps, toRecord, getEventPayload } from '../../utils/tradera-execution-steps';

export const resolveTraderaCheckStatusExecutionStepsFromResult = (
  rawResult: Record<string, unknown> | null | undefined
): TraderaExecutionStep[] => {
  const resultRecord = toRecord(rawResult);
  return readTraderaExecutionSteps(resultRecord['executionSteps']);
};

export const getTraderaExecutionLogPayload = (
  logs: readonly string[] | null | undefined,
  event: string
): Record<string, unknown> | null => getEventPayload(logs, event);
