'use client';

import React, { useState, useCallback } from 'react';
import { validate3DFileAsync } from '@/features/viewer3d/utils/validateAsset3d';
import { logClientCatch, logClientError } from '@/shared/utils/observability/client-error-logger';
import { uploadAsset3DFile } from '../api';
import { useAdmin3DAssetsContext } from '../context/Admin3DAssetsContext';
import { Asset3DUploader } from './Asset3DUploaderView';

interface Asset3DUploaderContainerProps {
  className?: string;
}

export function Asset3DUploaderContainer({ className }: Asset3DUploaderContainerProps): React.JSX.Element {
  const { handleUpload: onUpload, setShowUploader, categories = [] } = useAdmin3DAssetsContext();

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
  }, [name]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile !== undefined && droppedFile !== null) {
      handleFileSelect(droppedFile).catch((err) => {
        logClientCatch(err, { source: 'Asset3DUploader', action: 'handleDrop' });
      });
    }
  }, [handleFileSelect]);

  const handleUpload = async (helpers?: { reportProgress: (loaded: number, total?: number) => void }): Promise<void> => {
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
      }, (loaded, total) => helpers?.reportProgress(loaded, total));
      onUpload(uploaded);
    } catch (err) {
      logClientCatch(err, { source: 'Asset3DUploader', action: 'handleUpload', filename: file.name });
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  return (
    <Asset3DUploader
      className={className}
      onUpload={onUpload}
      setShowUploader={setShowUploader}
      categories={categories}
      handleUpload={handleUpload}
      file={file}
      setFile={setFile}
      name={name}
      setName={setName}
      description={description}
      setDescription={setDescription}
      category={category}
      setCategory={setCategory}
      tags={tags}
      setTags={setTags}
      newTag={newTag}
      setNewTag={setNewTag}
      isPublic={isPublic}
      setIsPublic={setIsPublic}
      isUploading={isUploading}
      error={error}
      isDragOver={isDragOver}
      setIsDragOver={setIsDragOver}
      onFileSelect={handleFileSelect}
      onHandleDrop={handleDrop}
      formatFileSize={formatFileSize}
    />
  );
}
