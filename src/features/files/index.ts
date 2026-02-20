// Public client-safe API for the Files feature.
export { default as FileManager } from './components/FileManager';
export { AdminFilesPage } from './pages/AdminFilesPage';
export { AdminFileStorageSettingsPage } from './pages/AdminFileStorageSettingsPage';
export type {
  ImageFileCreateInput,
  ImageFileListFilters,
  ImageFileRecord,
  ImageFileRepository,
  ImageFileUpdateInput,
} from '@/shared/contracts/files';
