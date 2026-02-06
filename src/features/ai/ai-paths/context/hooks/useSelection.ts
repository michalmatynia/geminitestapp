/**
 * Re-export selection hooks from SelectionContext.
 * Provides cleaner imports: import { useSelection } from '@/features/ai/ai-paths/context/hooks/useSelection'
 */
export {
  useSelection,
  useSelectionState,
  useSelectionActions,
} from '../SelectionContext';

export type {
  SelectionState,
  SelectionActions,
} from '../SelectionContext';
