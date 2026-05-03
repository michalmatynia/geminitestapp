'use client';

import type { JSX, DragEvent } from 'react';
import { FormActions } from '@/shared/ui/forms-and-actions.public';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import { FileDropZone, SelectedFilePreview } from './Asset3DUploaderSubcomponents';
import { AssetFormFields, VisibilityToggle } from './Asset3DUploaderFormFields';
import { TagsManager } from './TagsManager';
import type { Asset3DRecord } from '@/shared/contracts/viewer3d';

interface Asset3DUploaderProps {
  className?: string;
  onUpload: (uploaded: Asset3DRecord) => void;
  setShowUploader: (show: boolean) => void;
  categories: string[];
  handleUpload: (helpers?: { reportProgress: (loaded: number, total?: number) => void }) => Promise<void>;
  file: File | null;
  setFile: (f: File | null) => void;
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  tags: string[];
  setTags: (t: string[]) => void;
  newTag: string;
  setNewTag: (t: string) => void;
  isPublic: boolean;
  setIsPublic: (b: boolean) => void;
  isUploading: boolean;
  error: string | null;
  isDragOver: boolean;
  setIsDragOver: (b: boolean) => void;
  onFileSelect: (f: File) => Promise<void>;
  onHandleDrop: (e: DragEvent<HTMLDivElement>) => void;
  formatFileSize: (bytes: number) => string;
}

interface UploaderHeaderProps {
  error: string | null;
  file: File;
  setFile: (f: File | null) => void;
  formatFileSize: (bytes: number) => string;
  isUploading: boolean;
}

function UploaderHeader({ error, file, setFile, formatFileSize, isUploading }: UploaderHeaderProps): JSX.Element {
  return (
    <>
      {error !== null && <p className='text-red-500 text-sm mb-2'>{error}</p>}
      <SelectedFilePreview
        file={file}
        onClear={() => setFile(null)}
        formatFileSize={formatFileSize}
        isUploading={isUploading}
      />
    </>
  );
}

function UploaderFormContent(props: Omit<Asset3DUploaderProps, 'className' | 'onUpload' | 'onFileSelect' | 'onHandleDrop' | 'isDragOver' | 'setIsDragOver'>): JSX.Element {
  const { setShowUploader, handleUpload, file, setFile, isUploading, error, formatFileSize } = props;

  const onSave = (): void => {
    handleUpload().catch((err) => logClientCatch(err, { source: 'Asset3DUploader', action: 'onSave' }));
  };

  return (
    <div className='space-y-4'>
      {file && (
        <UploaderHeader error={error} file={file} setFile={setFile} formatFileSize={formatFileSize} isUploading={isUploading} />
      )}
      <UploaderFields {...props} />
      <FormActions
        onSave={onSave}
        onCancel={() => setShowUploader(false)}
        saveText='Upload Asset'
        isSaving={isUploading}
        cancelVariant='ghost'
      />
    </div>
  );
}

function UploaderFields(props: Omit<Asset3DUploaderProps, 'className' | 'onUpload' | 'onFileSelect' | 'onHandleDrop' | 'isDragOver' | 'setIsDragOver' | 'setShowUploader' | 'handleUpload' | 'file' | 'setFile' | 'error' | 'formatFileSize'>): JSX.Element {
  const {
    categories,
    name,
    setName,
    description,
    setDescription,
    category,
    setCategory,
    tags,
    setTags,
    newTag,
    setNewTag,
    isPublic,
    setIsPublic,
    isUploading,
  } = props;

  const handleAddTag = (): void => {
    const trimmed = newTag.trim().toLowerCase();
    if (trimmed.length > 0 && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string): void => setTags(tags.filter((t: string) => t !== tag));

  return (
    <>
      <AssetFormFields
        name={name}
        setName={setName}
        description={description}
        setDescription={setDescription}
        category={category}
        setCategory={setCategory}
        existingCategories={categories}
        isUploading={isUploading}
      />
      <TagsManager
        tags={tags}
        newTag={newTag}
        setNewTag={setNewTag}
        onAddTag={handleAddTag}
        onRemoveTag={handleRemoveTag}
        isUploading={isUploading}
      />
      <VisibilityToggle isPublic={isPublic} setIsPublic={setIsPublic} isUploading={isUploading} />
    </>
  );
}

export function Asset3DUploader(props: Asset3DUploaderProps): JSX.Element {
  const { className, file, onFileSelect, onHandleDrop, isDragOver, setIsDragOver } = props;

  const onFileSelectWrapper = (f: File): void => {
    onFileSelect(f).catch((err) => logClientCatch(err, { source: 'Asset3DUploader', action: 'onFileSelect' }));
  };

  return (
    <div className={className}>
      {!file ? (
        <FileDropZone
          onFileSelect={onFileSelectWrapper}
          onDrop={onHandleDrop}
          isDragOver={isDragOver}
          setIsDragOver={setIsDragOver}
        />
      ) : (
        <UploaderFormContent {...props} />
      )}
    </div>
  );
}
