'use client';

import React, { useState, useCallback, type Dispatch, type SetStateAction } from 'react';
import { validate3DFileAsync } from '@/features/viewer3d/utils/validateAsset3d';
import type { FileStorageProfile } from '@/shared/lib/files/constants';
import { logClientCatch, logClientError } from '@/shared/utils/observability/client-error-logger';
import { uploadAsset3DFile } from '../api';
import { useAdmin3DAssetsContext } from '../context/Admin3DAssetsContext';
import { Asset3DUploader as Asset3DUploaderView } from './Asset3DUploaderView';

interface Asset3DUploaderContainerProps {
  className?: string;
  storageProfile?: FileStorageProfile;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

type Asset3DUploaderFormState = {
  file: File | null;
  setFile: Dispatch<SetStateAction<File | null>>;
  name: string;
  setName: Dispatch<SetStateAction<string>>;
  description: string;
  setDescription: Dispatch<SetStateAction<string>>;
  category: string;
  setCategory: Dispatch<SetStateAction<string>>;
  tags: string[];
  setTags: Dispatch<SetStateAction<string[]>>;
  newTag: string;
  setNewTag: Dispatch<SetStateAction<string>>;
  isPublic: boolean;
  setIsPublic: Dispatch<SetStateAction<boolean>>;
  isUploading: boolean;
  setIsUploading: Dispatch<SetStateAction<boolean>>;
  error: string | null;
  setError: Dispatch<SetStateAction<string | null>>;
  isDragOver: boolean;
  setIsDragOver: Dispatch<SetStateAction<boolean>>;
};

const useAsset3DUploaderFormState = (): Asset3DUploaderFormState => {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  return { file, setFile, name, setName, description, setDescription, category, setCategory, tags, setTags, newTag, setNewTag, isPublic, setIsPublic, isUploading, setIsUploading, error, setError, isDragOver, setIsDragOver };
};

const useFileSelectHandler = (formState: Asset3DUploaderFormState): ((selectedFile: File) => Promise<void>) => {
  const { name, setError, setFile, setName } = formState;
  const handleFileSelect = useCallback(async (selectedFile: File): Promise<void> => {
    const validation = await validate3DFileAsync(selectedFile);
    if (!validation.valid) {
      logClientError(new Error(validation.error ?? 'Invalid 3D file'), {
        context: { source: 'Asset3DUploader', action: 'handleFileSelect', filename: selectedFile.name },
      });
      setError(validation.error ?? 'Invalid file');
      return;
    }
    setFile(selectedFile);
    setError(null);
    if (name.length === 0) {
      setName(selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim());
    }
  }, [name, setError, setFile, setName]);
  return handleFileSelect;
};

const useDropHandler = (
  setIsDragOver: Dispatch<SetStateAction<boolean>>,
  handleFileSelect: (selectedFile: File) => Promise<void>
): ((e: React.DragEvent<HTMLDivElement>) => void) =>
  useCallback((e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile !== undefined) {
      handleFileSelect(droppedFile).catch((err) => {
        logClientCatch(err, { source: 'Asset3DUploader', action: 'handleDrop' });
      });
    }
  }, [handleFileSelect]);

const useUploadHandler = (
  formState: Asset3DUploaderFormState,
  onUpload: ReturnType<typeof useAdmin3DAssetsContext>['handleUpload'],
  storageProfile: FileStorageProfile
): ((helpers?: { reportProgress: (loaded: number, total?: number) => void }) => Promise<void>) =>
  useCallback(async (helpers?: { reportProgress: (loaded: number, total?: number) => void }): Promise<void> => {
    const { file, name, description, category, tags, isPublic, setError, setIsUploading } = formState;
    if (file === null) return;
    setIsUploading(true);
    setError(null);
    try {
      const uploaded = await uploadAsset3DFile(file, {
        ...(name.trim().length > 0 && { name: name.trim() }),
        ...(description.trim().length > 0 && { description: description.trim() }),
        ...(category.trim().length > 0 && { category: category.trim() }),
        ...(tags.length > 0 && { tags }),
        isPublic,
        storageProfile,
      }, (loaded, total) => helpers?.reportProgress(loaded, total));
      onUpload(uploaded);
    } catch (err) {
      logClientCatch(err, { source: 'Asset3DUploader', action: 'handleUpload', filename: file.name });
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [formState, onUpload, storageProfile]);

export function Asset3DUploaderContainer({
  className,
  storageProfile = 'default',
}: Asset3DUploaderContainerProps): React.JSX.Element {
  const { handleUpload: onUpload, setShowUploader, categories } = useAdmin3DAssetsContext();
  const formState = useAsset3DUploaderFormState();
  const handleFileSelect = useFileSelectHandler(formState);
  const handleDrop = useDropHandler(formState.setIsDragOver, handleFileSelect);
  const handleUpload = useUploadHandler(formState, onUpload, storageProfile);

  return (
    <Asset3DUploaderView
      className={className}
      onUpload={onUpload}
      setShowUploader={setShowUploader}
      categories={categories}
      handleUpload={handleUpload}
      {...formState}
      onFileSelect={handleFileSelect}
      onHandleDrop={handleDrop}
      formatFileSize={formatFileSize}
    />
  );
}

export const Asset3DUploader = Asset3DUploaderContainer;
