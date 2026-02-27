import type { NodeHandler, NodeHandlerContext, RuntimePortValues } from '@/shared/contracts/ai-paths-runtime';
import {
  coerceInput,
  hashRuntimeValue,
  parseJsonSafe,
} from '../../../utils';

const coerceIteratorItems = (value: unknown): unknown[] => {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return value as unknown[];

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    const parsed = parseJsonSafe(trimmed);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const record = parsed as Record<string, unknown>;
      const nested = record['items'] ?? record['values'] ?? record['rows'] ?? record['results'];
      if (Array.isArray(nested)) return nested as unknown[];
    }
    // Fallback: treat as newline-delimited list.
    return trimmed
      .split(/\r?\n/)
      .map((line: string) => line.trim())
      .filter(Boolean);
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const nested = record['items'] ?? record['values'] ?? record['rows'] ?? record['results'];
    if (Array.isArray(nested)) return nested as unknown[];
  }

  return [value];
};

export const handleIterator: NodeHandler = ({ nodeInputs, prevOutputs, now }: NodeHandlerContext): RuntimePortValues => {
  const iterableInput = nodeInputs['value'];
  const callbackInput = coerceInput(nodeInputs['callback']);

  const items = coerceIteratorItems(iterableInput);
  const total = items.length;
  const itemsHash = hashRuntimeValue(items);

  const prevItemsHash = typeof prevOutputs['itemsHash'] === 'string' ? prevOutputs['itemsHash'] : '';
  const prevIndex = typeof prevOutputs['index'] === 'number' && Number.isFinite(prevOutputs['index']) ? prevOutputs['index'] : 0;
  const prevLastAckHash = typeof prevOutputs['lastAckHash'] === 'string' ? prevOutputs['lastAckHash'] : '';
  const prevAdvanceStamp = typeof prevOutputs['advanceStamp'] === 'string' ? prevOutputs['advanceStamp'] : '';

  let index = prevItemsHash && prevItemsHash === itemsHash ? prevIndex : 0;
  const lastAckHash = prevItemsHash && prevItemsHash === itemsHash ? prevLastAckHash : '';
  const advanceStamp = prevItemsHash && prevItemsHash === itemsHash ? prevAdvanceStamp : '';

  // Clamp to sane bounds.
  if (!Number.isFinite(index) || index < 0) index = 0;
  if (index > total) index = total;

  const hasCallback = callbackInput !== undefined && callbackInput !== null;
  const callbackHash = hasCallback ? hashRuntimeValue(callbackInput) : '';
  const isNewAck = Boolean(callbackHash) && callbackHash !== lastAckHash;

  // Nothing to iterate.
  if (total === 0) {
    return {
      value: null,
      index: 0,
      total: 0,
      done: true,
      status: 'idle',
      itemsHash,
      lastAckHash,
      advanceStamp: '',
    };
  }

  // Completed.
  if (index >= total) {
    return {
      value: null,
      index,
      total,
      done: true,
      status: 'completed',
      itemsHash,
      lastAckHash,
      advanceStamp: '',
    };
  }

  // Advance when callback is observed (and changed vs lastAckHash).
  if (isNewAck) {
    const nextIndex = index + 1;
    const done = nextIndex >= total;
    return {
      value: null,
      index: nextIndex,
      total,
      done,
      status: done ? 'completed' : 'advance_pending',
      itemsHash,
      lastAckHash: callbackHash,
      // Prevent stepping multiple times in a single evaluateGraph call (engine has inner iterations).
      advanceStamp: now,
    };
  }

  // If we advanced earlier in this evaluateGraph call, hold "advance_pending" until the next call.
  // This prevents the engine's inner iteration loop from emitting the next item without downstream
  // nodes being able to re-run (they're tracked via `executed.*` sets per evaluateGraph call).
  if (prevOutputs['status'] === 'advance_pending' && advanceStamp === now) {
    return {
      value: null,
      index,
      total,
      done: false,
      status: 'advance_pending',
      itemsHash,
      lastAckHash,
      advanceStamp,
    };
  }

  // Emit current item and wait for callback.
  return {
    value: items[index],
    index,
    total,
    done: false,
    status: 'waiting_callback',
    itemsHash,
    lastAckHash,
    advanceStamp: '',
  };
};
