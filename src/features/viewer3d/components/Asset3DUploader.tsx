'use client';

import { Upload, Loader2, Plus, X } from 'lucide-react';
import { useState, useCallback } from 'react';

import { logClientError } from '@/features/observability';
import { Button, Input, Label, FileUploadTrigger, Textarea, Checkbox, Tag, FormField, FormSection } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { uploadAsset3DFile } from '../api';
import { validate3DFileAsync, SUPPORTED_3D_FORMATS } from '../utils/validateAsset3d';

import type { Asset3DRecord } from '../types';


export interface Asset3DUploaderProps {
  onUpload: (asset: Asset3DRecord) => void;
  onCancel?: () => void;
  existingCategories?: string[];
  existingTags?: string[];
  className?: string;
}

export function Asset3DUploader({
  onUpload,
  onCancel,
  existingCategories = [],
  existingTags = [],
  className,
}: Asset3DUploaderProps): React.JSX.Element {
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
        context: { source: 'Asset3DUploader', action: 'handleFileSelect', filename: selectedFile.name } 
      });
      setError(validation.error ?? 'Invalid file');
      return;
    }
    setFile(selectedFile);
    setError(null);
    // Auto-fill name from filename
    if (!name) {
      const cleanName = selectedFile.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      setName(cleanName);
    }
  }, [name]);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>): void => {
      e.preventDefault();
      setIsDragOver(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) void handleFileSelect(droppedFile);
    },
    [handleFileSelect]
  );

  const handleAddTag = (): void => {
    const trimmed = newTag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string): void => {
    setTags(tags.filter((t: string) => t !== tag));
  };

  const handleUpload = async (helpers?: { reportProgress: (loaded: number, total?: number) => void }): Promise<void> => {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const uploaded = await uploadAsset3DFile(
        file,
        {
          ...(name.trim() && { name: name.trim() }),
          ...(description.trim() && { description: description.trim() }),
          ...(category.trim() && { category: category.trim() }),
          ...(tags.length > 0 && { tags }),
          isPublic,
        },
        (loaded: number, total?: number) => helpers?.reportProgress(loaded, total)
      );
      onUpload(uploaded);
    } catch (err) {
      logClientError(err, { context: { source: 'Asset3DUploader', action: 'handleUpload', filename: file.name } });
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
    <div className={className}>
      {/* File Drop Zone */}
      {!file ? (
        <FileUploadTrigger
          accept='.glb,.gltf'
          onFilesSelected={(files: File[]) => {
            const selectedFile = files[0];
            if (selectedFile) void handleFileSelect(selectedFile);
          }}
          asChild
        >
          <div
            className={cn(
              'relative flex h-32 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed transition-colors',
              isDragOver
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-gray-600 bg-gray-800/50 hover:border-blue-500 hover:bg-gray-800'
            )}
            onDragOver={(e: React.DragEvent<HTMLDivElement>): void => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={(e: React.DragEvent<HTMLDivElement>): void => {
              e.preventDefault();
              setIsDragOver(false);
            }}
            onDrop={handleDrop}
          >
            <div className='flex flex-col items-center gap-2'>
              <Upload className='h-8 w-8 text-gray-500' />
              <span className='text-sm text-gray-400'>
              Drop .glb or .gltf file here
              </span>
              <span className='text-xs text-gray-500'>or click to browse</span>
            </div>
          </div>
        </FileUploadTrigger>
      ) : (
        <div className='space-y-4'>
          {/* Selected File */}
          <div className='flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700'>
            <div className='flex items-center gap-3'>
              <div className='h-10 w-10 bg-blue-500/20 rounded flex items-center justify-center'>
                <Upload className='h-5 w-5 text-blue-400' />
              </div>
              <div>
                <p className='text-sm font-medium text-white'>{file.name}</p>
                <p className='text-xs text-gray-400'>{formatFileSize(file.size)}</p>
              </div>
            </div>
            <Button
              variant='ghost'
              size='icon'
              onClick={() => setFile(null)}
              disabled={isUploading}
            >
              <X className='h-4 w-4' />
            </Button>
          </div>

          {/* Name */}
          <FormField label='Name'>
            <Input
              id='upload-name'
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setName(e.target.value)}
              placeholder='Enter asset name...'
              className='bg-gray-800 border-gray-700 h-9'
              disabled={isUploading}
            />
          </FormField>

          {/* Description */}
          <FormField label='Description'>
            <Textarea
              id='upload-description'
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void => setDescription(e.target.value)}
              placeholder='Enter description...'
              className='bg-gray-800 border-gray-700 min-h-[60px] text-sm'
              disabled={isUploading}
            />
          </FormField>

          {/* Category */}
          <FormField label='Category'>
            <Input
              id='upload-category'
              value={category}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setCategory(e.target.value)}
              placeholder='Enter category...'
              list='upload-categories-list'
              className='bg-gray-800 border-gray-700 h-9'
              disabled={isUploading}
            />
            <datalist id='upload-categories-list'>
              {existingCategories.map((cat: string) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </FormField>

          {/* Tags */}
          <FormField label='Tags'>
            <div className='space-y-2 mt-1'>
              <div className='flex gap-2'>
                <Input
                  value={newTag}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setNewTag(e.target.value)}
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>): void => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder='Add tag...'
                  list='upload-tags-list'
                  className='bg-gray-800 border-gray-700 flex-1 h-9'
                  disabled={isUploading}
                />
                <datalist id='upload-tags-list'>
                  {existingTags
                    .filter((t: string) => !tags.includes(t))
                    .map((tag: string) => (
                      <option key={tag} value={tag} />
                    ))}
                </datalist>
                <Button
                  type='button'
                  variant='secondary'
                  size='icon'
                  onClick={handleAddTag}
                  disabled={isUploading}
                  className='h-9 w-9'
                >
                  <Plus className='h-4 w-4' />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className='flex flex-wrap gap-1 mt-2'>
                  {tags.map((tag: string) => (
                    <Tag
                      key={tag}
                      label={tag}
                      onRemove={() => handleRemoveTag(tag)}
                      className='bg-gray-700 text-gray-300 border-none'
                      disabled={isUploading}
                    />
                  ))}
                </div>
              )}
            </div>
          </FormField>

          {/* Visibility */}
          <div className='flex items-center gap-3 p-3 rounded-md border border-border/40 bg-gray-900/40'>
            <Checkbox
              id='upload-is-public'
              checked={isPublic}
              onCheckedChange={(checked: boolean | 'indeterminate') => setIsPublic(Boolean(checked))}
              disabled={isUploading}
            />
            <label htmlFor='upload-is-public' className='cursor-pointer flex-1'>
              <span className='text-sm text-gray-300'>Make publicly visible</span>
            </label>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className='mt-2 text-sm text-red-400'>{error}</p>
      )}

      {/* Format Info */}
      <p className='mt-2 text-xs text-gray-500'>
        Supported formats: {Object.keys(SUPPORTED_3D_FORMATS).join(', ')}. Max 100MB.
      </p>

      {/* Actions */}
      {file && (
        <div className='flex justify-end gap-2 mt-4'>
          {onCancel && (
            <Button variant='ghost' onClick={onCancel} disabled={isUploading}>
              Cancel
            </Button>
          )}
          <Button onClick={() => void handleUpload()} disabled={isUploading}>
            {isUploading ? (
              <>
                <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                Uploading...
              </>
            ) : (
              <>
                <Upload className='h-4 w-4 mr-2' />
                Upload Asset
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
