'use client';

import Image from 'next/image';
import Link from 'next/link';
import React, { useCallback } from 'react';

import type { ExpandedImageFile } from '@/features/products';
import { ImageFileSelection } from '@/shared/contracts/files';
import { Button, Card, Badge } from '@/shared/ui';

import { useFileManager } from '../../contexts/FileManagerContext';

export function FileManagerGrid(): React.JSX.Element {
  const {
    filteredFiles,
    selectedFiles,
    mode,
    handleToggleSelect,
    setPreviewFile,
    handleDelete,
  } = useFileManager();

  const getFileKind = useCallback((filepath: string) => {
    const clean = (filepath || '').trim();
    if (!clean) return 'other';
    if (clean.startsWith('data:')) return 'base64';
    if (/^https?:\/\//i.test(clean)) {
      try {
        const url = new URL(clean);
        if (url.pathname.includes('/uploads/')) return 'upload';
      } catch {
        return 'link';
      }
      return 'link';
    }
    if (clean.includes('/uploads/') || clean.startsWith('/uploads/') || clean.startsWith('uploads/')) return 'upload';
    return 'other';
  }, []);

  const resolveFolder = useCallback((filepath: string): string => {
    const kind = getFileKind(filepath);
    if (kind === 'base64') return 'base64';
    if (kind === 'link') {
      try { return new URL(filepath).hostname || 'link'; } catch { return 'link'; }
    }
    const clean = filepath.replace(/^\/+/, '');
    const parts = clean.split('/');
    if (parts.length === 0) return 'uploads';
    if (parts[0] === 'uploads') return parts[1] ?? 'uploads';
    return parts[0] || 'uploads';
  }, [getFileKind]);

  const handleClick = (file: ExpandedImageFile): void => {
    if (mode === 'select') {
      handleToggleSelect({ id: file.id, filepath: file.filepath });
    } else {
      setPreviewFile(file);
    }
  };

  return (
    <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4'>
      {filteredFiles.map((file: ExpandedImageFile) => (
        <Card
          key={file.id}
          className={`relative border-2 transition-all cursor-pointer overflow-hidden ${
            selectedFiles.some((f: ImageFileSelection) => f.id === file.id)
              ? 'border-blue-500 bg-blue-500/5'
              : 'border-transparent hover:border-gray-700'
          }`}
          onClick={(): void => handleClick(file)}
        >
          <Badge variant='neutral' className='absolute left-2 top-2 bg-gray-900/80 text-[10px] font-bold uppercase tracking-wide z-10'>
            {resolveFolder(file.filepath)}
          </Badge>
          <div className='aspect-square relative w-full'>
            <Image
              src={file.filepath}
              alt={file.filename}
              fill
              className='object-cover'
            />
          </div>
          <div className='p-2'>
            <p className='text-center text-sm truncate font-medium' title={file.filename}>
              {file.filename}
            </p>
            {(file.tags ?? []).length > 0 && (
              <div className='mt-1 flex flex-wrap justify-center gap-1'>
                {(file.tags ?? []).slice(0, 3).map((tag: string) => (
                  <Badge key={tag} variant='neutral' className='bg-card/70 text-[10px] font-normal'>
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}
            <div className='mt-1 text-center text-xs text-gray-400'>
              {file.products.map(({ product }: { product: { id: string; name: string } }) => (
                <Link
                  key={product.id}
                  href={`/admin/products/${product.id}/edit`}
                  className='hover:underline block truncate'
                  onClick={(e) => e.stopPropagation()}
                >
                  {product.name}
                </Link>
              ))}
            </div>
            <div className='mt-2 flex justify-center gap-2'>
              <Button
                variant='secondary'
                size='sm'
                className='h-7 px-2 text-[11px]'
                onClick={(e: React.MouseEvent<HTMLButtonElement>): void => {
                  e.stopPropagation();
                  setPreviewFile(file);
                }}
              >
                View
              </Button>
              <Button
                variant='destructive'
                size='sm'
                className='h-7 px-2 text-[11px]'
                onClick={(e: React.MouseEvent<HTMLButtonElement>): void => {
                  e.stopPropagation();
                  void handleDelete(file.id);
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
