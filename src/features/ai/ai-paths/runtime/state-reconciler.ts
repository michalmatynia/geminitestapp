import { type RuntimeState, type RuntimeHistoryEntry } from '@/shared/contracts/ai-paths';

/**
 * Builds a unique key for a history entry to prevent duplicates during reconciliation.
 */
function buildHistoryEntryKey(entry: RuntimeHistoryEntry): string {
  if (entry.spanId) return entry.spanId;
  
  return [
    entry.traceId ?? '',
    entry.timestamp,
    entry.status,
    entry.attempt ?? '',
    entry.iteration,
  ].join(':');
}

/**
 * Reconciles a base runtime state with one or more partial updates.
 * This is designed to be robust against parallel branch updates where each branch
 * may have modified different parts of the state.
 */
export function reconcileRuntimeState(
  base: RuntimeState,
  updates: Partial<RuntimeState>[]
): RuntimeState {
  // Use the latest status from the updates if available
  let status = base.status;
  
  const nodeStatuses = { ...base.nodeStatuses };
  const inputs = { ...base.inputs };
  const outputs = { ...base.outputs };
  const nodeOutputs = { ...base.nodeOutputs };
  const variables = { ...base.variables };
  const hashes = { ...base.hashes };
  const hashTimestamps = { ...base.hashTimestamps };
  const nodeDurations = { ...base.nodeDurations };
  const events = [...(base.events ?? [])];
  
  // History merging requires deduplication
  const mergedHistory = new Map<string, Map<string, RuntimeHistoryEntry>>();
  
  const appendHistoryToMap = (nodeId: string, entries: RuntimeHistoryEntry[]) => {
    const existing = mergedHistory.get(nodeId) ?? new Map<string, RuntimeHistoryEntry>();
    entries.forEach((entry) => {
      existing.set(buildHistoryEntryKey(entry), entry);
    });
    mergedHistory.set(nodeId, existing);
  };

  // Seed with base history
  if (base.history) {
    Object.entries(base.history).forEach(([nodeId, entries]) => {
      appendHistoryToMap(nodeId, entries);
    });
  }

  // Apply updates
  for (const update of updates) {
    if (update.status) status = update.status;
    
    if (update.nodeStatuses) {
      Object.assign(nodeStatuses, update.nodeStatuses);
    }
    
    if (update.inputs) {
      Object.assign(inputs, update.inputs);
    }
    
    if (update.outputs) {
      Object.assign(outputs, update.outputs);
    }
    
    if (update.nodeOutputs) {
      Object.assign(nodeOutputs, update.nodeOutputs);
    }
    
    if (update.variables) {
      Object.assign(variables, update.variables);
    }
    
    if (update.hashes) {
      Object.assign(hashes, update.hashes);
    }
    
    if (update.hashTimestamps) {
      Object.assign(hashTimestamps, update.hashTimestamps);
    }
    
    if (update.nodeDurations) {
      Object.assign(nodeDurations, update.nodeDurations);
    }
    
    if (update.events) {
      events.push(...update.events);
    }
    
    if (update.history) {
      Object.entries(update.history).forEach(([nodeId, entries]) => {
        appendHistoryToMap(nodeId, entries);
      });
    }
  }

  // Deduplicate events by ID if they have one
  const uniqueEvents = new Map<string, any>();
  events.forEach((evt) => {
    if (evt.id) {
      uniqueEvents.set(evt.id, evt);
    } else {
      uniqueEvents.set(`anon_${Math.random()}`, evt);
    }
  });

  return {
    ...base,
    status,
    nodeStatuses,
    inputs,
    outputs,
    nodeOutputs,
    variables,
    hashes,
    hashTimestamps,
    nodeDurations,
    events: Array.from(uniqueEvents.values()),
    history: Object.fromEntries(
      Array.from(mergedHistory.entries()).map(([nodeId, entriesMap]) => [
        nodeId,
        Array.from(entriesMap.values()),
      ])
    ),
  };
}
