/**
 * React Utility Types
 * 
 * Type utilities for React component and context patterns.
 * Provides:
 * - Function key extraction from object types
 * - Action/state separation utilities
 * - Type-safe property filtering
 * - Component prop type manipulation
 * - Context value type utilities
 */

/**
 * Resolves keys of T that are functions.
 * Used to extract action methods from state objects.
 */
export type FunctionKey<T> = {
   
  [K in keyof T]-?: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

/**
 * Picks keys of T that are functions.
 * Useful for extracting action methods from context values.
 */
export type PickActions<T> = Pick<T, FunctionKey<T>>;

/**
 * Omits keys of T that are functions.
 * Useful for extracting state properties from context values.
 */
export type OmitState<T> = Omit<T, FunctionKey<T>>;
