/**
 * UI Hooks Public Exports
 * 
 * Centralized exports for UI-related React hooks.
 * Provides:
 * - Debounce hook for input throttling
 * - Undo/redo hook for state history management
 * - Confirmation dialog hook for user actions
 * - Prompt dialog hook for user input
 * - Unified UI hook interface
 */

// UI-related hooks
export { useDebounce } from './use-debounce';
export { useUndo } from './use-undo';
export { useConfirm } from './useConfirm';
export { usePrompt } from './usePrompt';
