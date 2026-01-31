"use client";

import React, { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, useToast } from "@/shared/ui";
import { FileManager } from "@/features/files";
import type { ImageFileRecord, ImageFileSelection } from "@/shared/types/files";

interface MediaLibraryPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (filepaths: string[]) => void;
  selectionMode?: "single" | "multiple";
  autoConfirmSelection?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function MediaLibraryPanel({
  open,
  onOpenChange,
  onSelect,
  selectionMode = "single",
  autoConfirmSelection,
}: MediaLibraryPanelProps): React.ReactNode {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const shouldAutoConfirm = autoConfirmSelection ?? selectionMode === "single";

  const handleSelect = (files: ImageFileSelection[]): void => {
    const filepaths = files.map((file: ImageFileSelection) => file.filepath).filter(Boolean);
    if (filepaths.length === 0) return;
    onSelect(filepaths);
    if (selectionMode === "single") {
      onOpenChange(false);
    }
  };

  const uploadSingleFile = async (file: File): Promise<ImageFileRecord> => {
    if (file.size > MAX_FILE_SIZE) {
      throw new Error("File exceeds 10MB limit");
    }
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/cms/media", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      throw new Error("Failed to upload image");
    }
    return (await res.json()) as ImageFileRecord;
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = event.target.files;
    event.target.value = "";
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const list = Array.from(files);
      const uploaded: ImageFileRecord[] = [];
      for (const file of list) {
        uploaded.push(await uploadSingleFile(file));
      }
      toast("Upload complete.", { variant: "success" });
      await queryClient.invalidateQueries({ queryKey: ["files"] });
      if (shouldAutoConfirm && uploaded.length > 0) {
        const selections = uploaded
          .map((file) => ({ id: file.id, filepath: file.filepath }))
          .filter((file) => file.filepath);
        if (selections.length > 0) {
          handleSelect(selections);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      toast(message, { variant: "error" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Media Library</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="mr-2 size-4" />
            {uploading ? "Uploading..." : "Upload images"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => { void handleUpload(e); }}
          />
          <p className="text-xs text-gray-500">Max 10MB per file</p>
        </div>

        <div className="mt-4 rounded border border-border/40 bg-gray-900">
          <FileManager
            onSelectFile={handleSelect}
            selectionMode={selectionMode}
            autoConfirmSelection={shouldAutoConfirm}
            showFolderFilter
            defaultFolder="cms"
            showBulkActions={selectionMode === "multiple"}
            showTagSearch
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
