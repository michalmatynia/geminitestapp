/**
 * Public client-side API entrypoint for the Files feature.
 * Exports public file management components, context, and types.
 */
export { default, default as FileManager, FileManagerRuntimeContext } from '../components/FileManager';
export type { FileManagerRuntimeValue } from '../components/FileManager';
export { FileUploadEventsPanel } from '../components/FileUploadEventsPanel';
