/**
 * @fileoverview Kangur TTS Server Entrypoint
 * @description Server-side interface for the Kangur Text-to-Speech (TTS) feature.
 *
 * @boundary WARNING: This module contains server-side logic and must only be imported
 * into server-side code (Node.js runtime).
 */

import 'server-only';

/** @export Errors */
export * from './segments/errors';
/** @export Instructions */
export * from './segments/instructions';
/** @export Cache */
export * from './segments/cache';
/** @export Storage */
export * from './segments/storage';
/** @export Synthesis */
export * from './segments/synthesis';
/** @export API */
export * from './segments/api';
