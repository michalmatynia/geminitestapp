'use client';

import Image from 'next/image';

import { AppModal } from '@/shared/ui';

export interface FilePreviewData {
  id?: string;
  filename: string;
  filepath: string;
  mimetype: string;
  size: number;
  width: number | null;
  height: number | null;
  tags?: string[];
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
}

interface FilePreviewModalProps {
  file: FilePreviewData;
  onClose: () => void;
  children?: React.ReactNode;
}

export default function FilePreviewModal({
  file,
  onClose,
  children,
}: FilePreviewModalProps) {
  return (
    <AppModal
      open={true}
      onClose={onClose}
      title={file.filename}
      size="lg"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-2xl font-bold mb-4">{file.filename}</h2>
          <div className="relative w-full h-64">
            <Image
              src={file.filepath}
              alt={file.filename}
              fill
              className="rounded object-contain"
            />
          </div>
        </div>
        <div>
          <h3 className="text-xl font-bold mb-4">File Information</h3>
          <div className="space-y-2 text-sm text-gray-200">
            {file.id && (
              <p>
                <strong>ID:</strong> {file.id}
              </p>
            )}
            <p>
              <strong>Path:</strong> {file.filepath}
            </p>
            <p>
              <strong>MIME Type:</strong> {file.mimetype}
            </p>
            <p>
              <strong>Size:</strong> {(file.size / 1024).toFixed(2)} KB
            </p>
            <p>
              <strong>Dimensions:</strong> {file.width} x {file.height}
            </p>
            {file.createdAt && (
              <p>
                <strong>Added:</strong>{' '}
                {new Date(file.createdAt).toLocaleString()}
              </p>
            )}
            {file.updatedAt && (
              <p>
                <strong>Modified:</strong>{' '}
                {new Date(file.updatedAt).toLocaleString()}
              </p>
            )}
            {(file.tags ?? []).length > 0 && (
              <p>
                <strong>Tags:</strong> {(file.tags ?? []).join(', ')}
              </p>
            )}
          </div>
          <div className="mt-4 rounded-md border border-border/60 bg-black/30 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Raw Metadata
            </div>
            <pre className="mt-2 max-h-48 overflow-auto text-[11px] text-gray-300">
              {JSON.stringify(file, null, 2)}
            </pre>
          </div>
          {children}
        </div>
      </div>
    </AppModal>
  );
}
