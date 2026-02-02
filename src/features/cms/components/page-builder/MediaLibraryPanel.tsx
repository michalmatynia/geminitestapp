import React, { useRef } from "react";
import { Upload, X } from "lucide-react";
import { Button, Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, useToast } from "@/shared/ui";
import dynamic from "next/dynamic";
import type { ImageFileRecord, ImageFileSelection } from "@/shared/types/files";
import { useUploadCmsMedia } from "../../hooks/useCmsQueries";

const FileManager = dynamic(() => import("@/features/files/components/FileManager"), {
  ssr: false,
  loading: () => <div>Loading file manager...</div>
});

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
  const { toast } = useToast();
  const shouldAutoConfirm = autoConfirmSelection ?? selectionMode === "single";

  const uploadMutation = useUploadCmsMedia();

  const handleSelect = (files: ImageFileSelection[]): void => {
    const filepaths = files.map((file: ImageFileSelection) => file.filepath).filter(Boolean);
    if (filepaths.length === 0) return;
    onSelect(filepaths);
    if (selectionMode === "single") {
      onOpenChange(false);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = event.target.files;
    event.target.value = "";
    if (!files || files.length === 0) return;

    try {
      const list = Array.from(files);
      const uploaded: ImageFileRecord[] = [];
      for (const file of list) {
        if (file.size > MAX_FILE_SIZE) {
          toast(`File ${file.name} exceeds 10MB limit`, { variant: "error" });
          continue;
        }
        const result = await uploadMutation.mutateAsync(file);
        uploaded.push(result);
      }
      
      if (uploaded.length > 0) {
        toast("Upload complete.", { variant: "success" });
        if (shouldAutoConfirm) {
          const selections: ImageFileSelection[] = uploaded
            .map((file: ImageFileRecord): ImageFileSelection => ({ id: file.id, filepath: file.filepath }))
            .filter((file: ImageFileSelection): boolean => Boolean(file.filepath));
          if (selections.length > 0) {
            handleSelect(selections);
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      toast(message, { variant: "error" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[calc(100vw-2rem)] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0">
          <DialogTitle>Media Library</DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close media library">
              <X className="size-4" />
            </Button>
          </DialogClose>
        </DialogHeader>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
          >
            <Upload className="mr-2 size-4" />
            {uploadMutation.isPending ? "Uploading..." : "Upload images"}
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

        <div className="mt-4 rounded border border-border/40 bg-gray-900 flex-1 overflow-auto">
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
