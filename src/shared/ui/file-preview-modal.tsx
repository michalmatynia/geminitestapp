"use client";

import { XIcon } from "lucide-react";
import Image from "next/image";

export interface FilePreviewData {
  filename: string;
  filepath: string;
  mimetype: string;
  size: number;
  width: number | null;
  height: number | null;
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
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg shadow-lg p-6 max-w-2xl w-full relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
          aria-label="Close modal"
        >
          <XIcon className="size-6" />
        </button>
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
            <div className="space-y-2">
              <p>
                <strong>MIME Type:</strong> {file.mimetype}
              </p>
              <p>
                <strong>Size:</strong> {(file.size / 1024).toFixed(2)} KB
              </p>
              <p>
                <strong>Dimensions:</strong> {file.width} x {file.height}
              </p>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
