"use client";

import React from "react";
import Image from "next/image";
import { Upload, FileIcon, Link2, Trash2 } from "lucide-react";
import type { NoteFileRecord } from "@/types/notes";

interface FileAttachmentsProps {
  noteId?: string;
  noteFiles: NoteFileRecord[];
  maxSlots: number;
  uploadingSlots: Set<number>;
  getNextAvailableSlot: () => number | null;
  onFileUpload: (slotIndex: number, file: File) => Promise<void>;
  onMultiFileUpload: (files: FileList | File[]) => Promise<void>;
  onFileDelete: (slotIndex: number) => Promise<void>;
  onInsertFileReference: (file: NoteFileRecord) => void;
  formatFileSize: (bytes: number) => string;
  isImageFile: (mimetype: string) => boolean;
}

export function FileAttachments({
  noteId,
  noteFiles,
  maxSlots,
  uploadingSlots,
  getNextAvailableSlot,
  onFileUpload,
  onMultiFileUpload,
  onFileDelete,
  onInsertFileReference,
  formatFileSize,
  isImageFile,
}: FileAttachmentsProps) {
  const fileInputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  if (!noteId) {
    return (
      <div className="rounded-lg border border-dashed border-gray-600 bg-gray-800/50 p-4 text-center text-sm text-gray-400">
        Save the note first to enable file attachments ({maxSlots} slots available)
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="mb-2 block text-sm font-medium text-white">
        Attachments ({noteFiles.length}/{maxSlots} slots used)
      </label>
      <div className="flex flex-wrap gap-3">
        {(() => {
          const nextSlot = getNextAvailableSlot();
          const isUploading = nextSlot !== null && uploadingSlots.has(nextSlot);
          return (
            <div
              className="relative h-20 w-20 rounded-md border border-gray-700 bg-gray-800"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                if (nextSlot === null) return;
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) {
                  void onFileUpload(nextSlot, file);
                }
              }}
            >
              {isUploading ? (
                <div className="flex h-full items-center justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-600 border-t-blue-500" />
                </div>
              ) : nextSlot === null ? (
                <div className="flex h-full items-center justify-center text-[10px] text-gray-500">
                  Full
                </div>
              ) : (
                <label className="flex h-full cursor-pointer flex-col items-center justify-center text-gray-500 hover:bg-gray-700/50 hover:text-gray-400 transition-colors">
                  <Upload size={14} />
                  <span className="mt-1 text-[10px]">Upload</span>
                  <span className="mt-0.5 text-[10px] text-gray-400">
                    {maxSlots - noteFiles.length} left
                  </span>
                  <input
                    ref={(el) => {
                      fileInputRefs.current[nextSlot] = el;
                    }}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        void onMultiFileUpload(files);
                      }
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
          );
        })()}

        {noteFiles.map((file) => (
          <div
            key={file.slotIndex}
            className="relative h-20 w-24 rounded-md border border-gray-700 bg-gray-800/70"
          >
            <div className="group relative h-full">
              {isImageFile(file.mimetype) ? (
                <Image
                  src={file.filepath}
                  alt={file.filename}
                  width={96}
                  height={80}
                  className="h-full w-full rounded-md object-cover"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center p-2">
                  <FileIcon className="h-6 w-6 text-gray-400" />
                  <span className="mt-1 text-[10px] text-gray-400 truncate w-full text-center">
                    {file.filename.length > 12
                      ? file.filename.slice(0, 10) + "..."
                      : file.filename}
                  </span>
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-md bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => onInsertFileReference(file)}
                  className="rounded-full bg-blue-600 p-1.5 text-white hover:bg-blue-700"
                  title="Insert into content"
                >
                  <Link2 size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => onFileDelete(file.slotIndex)}
                  className="rounded-full bg-red-600 p-1.5 text-white hover:bg-red-700"
                  title="Delete file"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 rounded-b-md bg-black/70 px-1 py-0.5 text-[9px] text-gray-300 truncate">
                {formatFileSize(file.size)}
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500">
        Drag and drop files or click to upload. Max 10MB per file.
      </p>
    </div>
  );
}
