/**
 * Re-export selection hooks from SelectionContext.
 * Provides cleaner imports from a single module.
 */
export { useSelectionState, useSelectionActions } from '../SelectionContext';

export type { SelectionState, SelectionActions } from '../SelectionContext';
