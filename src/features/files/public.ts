// Public client-safe API for the Files feature.
export { default } from './components/FileManager';
export {
  default as FileManager,
  FileManagerRuntimeContext,
  type FileManagerRuntimeValue,
} from './components/FileManager';
export { FileUploadEventsPanel } from './components/FileUploadEventsPanel';
export { AdminFilesPage } from './pages/AdminFilesPage';
export { AdminFileStorageSettingsPage } from './pages/AdminFileStorageSettingsPage';
export type {
  ImageFileCreateInput,
  ImageFileListFilters,
  ImageFileRecord,
  ImageFileRepository,
  ImageFileUpdateInput,
} from '@/shared/contracts/files';
