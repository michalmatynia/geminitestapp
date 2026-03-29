import type {
  NodeHandler,
  NodeHandlerContext,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths-runtime';
import { coerceInput, hashRuntimeValue, parseJsonSafe } from '@/shared/lib/ai-paths/core/utils';

type IteratorState = {
  advanceStamp: string;
  index: number;
  items: unknown[];
  itemsHash: string;
  lastAckHash: string;
  prevStatus: unknown;
  total: number;
};

const ITERATOR_RESULT_KEYS = ['items', 'values', 'rows', 'results'] as const;

const readNestedIteratorItems = (value: unknown): unknown[] | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;

  for (const key of ITERATOR_RESULT_KEYS) {
    if (Array.isArray(record[key])) {
      return record[key] as unknown[];
    }
  }

  return null;
};

const splitNewlineIteratorItems = (value: string): string[] =>
  value
    .split(/\r?\n/)
    .map((line: string) => line.trim())
    .filter(Boolean);

const coerceStringIteratorItems = (value: string): unknown[] => {
  const trimmed = value.trim();

  if (!trimmed) {
    return [];
  }

  const parsed = parseJsonSafe(trimmed);

  if (Array.isArray(parsed)) {
    return parsed;
  }

  return readNestedIteratorItems(parsed) ?? splitNewlineIteratorItems(trimmed);
};

const coerceIteratorItems = (value: unknown): unknown[] => {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return value as unknown[];

  if (typeof value === 'string') {
    return coerceStringIteratorItems(value);
  }

  return readNestedIteratorItems(value) ?? [value];
};

const readFiniteNumber = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const readStringValue = (value: unknown): string => (typeof value === 'string' ? value : '');

const clampIteratorIndex = (index: number, total: number): number => Math.min(Math.max(index, 0), total);

const resolveIteratorState = (
  items: unknown[],
  prevOutputs: RuntimePortValues
): IteratorState => {
  const itemsHash = hashRuntimeValue(items);
  const total = items.length;
  const prevItemsHash = readStringValue(prevOutputs['itemsHash']);
  const isSameItems = Boolean(prevItemsHash) && prevItemsHash === itemsHash;
  const prevIndex = isSameItems ? readFiniteNumber(prevOutputs['index']) : 0;

  return {
    advanceStamp: isSameItems ? readStringValue(prevOutputs['advanceStamp']) : '',
    index: clampIteratorIndex(prevIndex, total),
    items,
    itemsHash,
    lastAckHash: isSameItems ? readStringValue(prevOutputs['lastAckHash']) : '',
    prevStatus: prevOutputs['status'],
    total,
  };
};

const createIteratorResult = (
  state: IteratorState,
  result: Partial<RuntimePortValues>
): RuntimePortValues => ({
  advanceStamp: '',
  done: false,
  index: state.index,
  itemsHash: state.itemsHash,
  lastAckHash: state.lastAckHash,
  total: state.total,
  value: null,
  ...result,
});

const createIdleIteratorResult = (state: IteratorState): RuntimePortValues =>
  createIteratorResult(state, {
    done: true,
    index: 0,
    status: 'idle',
  });

const createCompletedIteratorResult = (state: IteratorState): RuntimePortValues =>
  createIteratorResult(state, {
    done: true,
    status: 'completed',
  });

const createAdvancedIteratorResult = (
  state: IteratorState,
  callbackHash: string,
  now: string
): RuntimePortValues => {
  const nextIndex = state.index + 1;
  const done = nextIndex >= state.total;

  return createIteratorResult(state, {
    advanceStamp: now,
    done,
    index: nextIndex,
    lastAckHash: callbackHash,
    status: done ? 'completed' : 'advance_pending',
  });
};

const shouldAdvanceIterator = (callbackInput: unknown, lastAckHash: string): string | null => {
  if (callbackInput === undefined || callbackInput === null) {
    return null;
  }

  const callbackHash = hashRuntimeValue(callbackInput);
  return callbackHash && callbackHash !== lastAckHash ? callbackHash : null;
};

const shouldHoldAdvancedIterator = (state: IteratorState, now: string): boolean =>
  state.prevStatus === 'advance_pending' && state.advanceStamp === now;

const createHoldIteratorResult = (state: IteratorState): RuntimePortValues =>
  createIteratorResult(state, {
    advanceStamp: state.advanceStamp,
    status: 'advance_pending',
  });

const createWaitingIteratorResult = (state: IteratorState): RuntimePortValues =>
  createIteratorResult(state, {
    status: 'waiting_callback',
    value: state.items[state.index],
  });

export const handleIterator: NodeHandler = ({
  nodeInputs,
  prevOutputs,
  now,
}: NodeHandlerContext): RuntimePortValues => {
  const state = resolveIteratorState(coerceIteratorItems(nodeInputs['value']), prevOutputs);
  const callbackInput = coerceInput(nodeInputs['callback']);
  const callbackHash = shouldAdvanceIterator(callbackInput, state.lastAckHash);

  if (state.total === 0) {
    return createIdleIteratorResult(state);
  }

  if (state.index >= state.total) {
    return createCompletedIteratorResult(state);
  }

  if (callbackHash) {
    return createAdvancedIteratorResult(state, callbackHash, now);
  }

  if (shouldHoldAdvancedIterator(state, now)) {
    return createHoldIteratorResult(state);
  }

  return createWaitingIteratorResult(state);
};
