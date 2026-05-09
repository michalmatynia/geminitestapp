/**
 * @fileoverview Kangur UI Components Entrypoint
 * @description Centralized export for Kangur UI feature components.
 *
 * @boundary IMPORTANT: Intended for use within the Kangur UI feature boundary.
 */

/** @export Dashboard components */
export * from './dashboard';
/** @export Game components */
export * from './game';
/** @export Kangur components */
export * from './kangur';
/** @export PageNotFound component */
export * from './PageNotFound';
/** @export UserNotRegisteredError component */
export { default as UserNotRegisteredError } from './UserNotRegisteredError';
