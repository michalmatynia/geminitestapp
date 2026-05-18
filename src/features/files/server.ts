import 'server-only';

/**
 * Server-side entrypoint for the Files feature.
 * Exports server-side services (file storage, repositories, upload events)
 * and contract types for file operations.
 * Should only be accessed in server environments.
 */
export * from '@/shared/lib/files/services/image-file-repository';
export * from '@/shared/lib/files/services/image-file-service';
export * from '@/shared/lib/files/services/image-file-repository/mongo-image-file-repository';
export * from '@/shared/lib/files/services/file-upload-events';
export * from '@/shared/lib/files/services/storage/file-storage-service';
export * from '@/shared/lib/files/file-uploader';
export type {
  ImageFileCreateInput,
  ImageFileListFilters,
  ImageFileRecord,
  ImageFileRepository,
  ImageFileUpdateInput,
} from '@/shared/contracts/files';
