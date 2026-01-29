"use client";
import { FilePreviewModal, Button, useToast, Input } from "@/shared/ui";
import Image from "next/image";
import Link from "next/link";
import { useState, useMemo } from "react";
import type { ImageFileSelection } from "@/shared/types/files";
import type { ExpandedImageFile } from "@/features/products";
import { useFiles, useDeleteFile } from "@/features/files/hooks/useFiles";

interface FileManagerProps {
  onSelectFile?: (files: ImageFileSelection[]) => void;
  mode?: "view" | "select";
  showFileManager?: boolean;
}

// This component provides a UI for browsing and selecting existing image files.
// It fetches the list of files from the API and allows the user to filter them.
export default function FileManager({
  onSelectFile,
  mode = "select",
}: FileManagerProps) {
  const [selectedFiles, setSelectedFiles] = useState<ImageFileSelection[]>([]);
  const [filenameSearch, setFilenameSearch] = useState("");
  const [productNameSearch, setProductNameSearch] = useState("");
  const [previewFile, setPreviewFile] = useState<ExpandedImageFile | null>(null);
  const { toast } = useToast();
  const deleteFileMutation = useDeleteFile();

  const queryParams = useMemo(() => {
    const query = new URLSearchParams();
    if (filenameSearch) {
      query.append("filename", filenameSearch);
    }
    if (productNameSearch) {
      query.append("productName", productNameSearch);
    }
    return query.toString();
  }, [filenameSearch, productNameSearch]);

  const { data: files = [] } = useFiles(queryParams);

  const handleClick = (file: ExpandedImageFile) => {
    if (mode === "select") {
      handleToggleSelect({ id: file.id, filepath: file.filepath });
    } else {
      setPreviewFile(file);
    }
  };

  // This function toggles the selection of a file.
  const handleToggleSelect = (file: ImageFileSelection) => {
    setSelectedFiles((prev) =>
      prev.some((f) => f.id === file.id)
        ? prev.filter((f) => f.id !== file.id)
        : [...prev, file]
    );
  };

  // This function is called when the user confirms their selection.
  // It calls the onSelectFile callback with the selected files.
  const handleConfirmSelection = () => {
    if (onSelectFile) {
      onSelectFile(selectedFiles);
    }
  };

  // This function sends a DELETE request to the API to delete a file.
  const handleDelete = async (fileId: string) => {
    if (confirm("Are you sure you want to delete this file?")) {
      try {
        await deleteFileMutation.mutateAsync(fileId);
        toast("File deleted successfully.", { variant: "success" });
      } catch (error) {
        console.error("Failed to delete file:", error);
        toast("Failed to delete file.", { variant: "error" });
      }
    }
  };

  return (
    <div className="p-4 bg-gray-900 text-white">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">File Manager</h2>
        {mode === "select" && onSelectFile && (
          <Button onClick={handleConfirmSelection}>
            Confirm Selection ({selectedFiles.length})
          </Button>
        )}
      </div>
      <div className="flex space-x-4 mb-4">
        <Input
          type="text"
          placeholder="Search by filename"
          value={filenameSearch}
          onChange={(e) => setFilenameSearch(e.target.value)}
          className="w-full p-2 bg-gray-800 rounded"
        />
        <Input
          type="text"
          placeholder="Search by product name"
          value={productNameSearch}
          onChange={(e) => setProductNameSearch(e.target.value)}
          className="w-full p-2 bg-gray-800 rounded"
        />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {files.map((file) => (
          <div
            key={file.id}
            className={`relative border-2 ${
              selectedFiles.some((f) => f.id === file.id) && mode === "select"
                ? "border-blue-500"
                : "border-transparent"
            }`}
            onClick={() => handleClick(file)}
          >
            <Image
              src={file.filepath}
              alt={file.filename}
              width={150}
              height={150}
              className="object-cover rounded"
            />
            <p className="text-center mt-2">{file.filename}</p>
            <div className="text-center text-xs text-gray-400">
              {file.products.map(({ product }) => (
                <Link
                  key={product.id}
                  href={`/admin/products/${product.id}/edit`}
                  className="hover:underline"
                >
                  {product.name}
                </Link>
              ))}
            </div>
            <div className="mt-2 flex justify-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewFile(file);
                }}
              >
                View
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  void handleDelete(file.id);
                }}
              >
                X
              </Button>
            </div>
          </div>
        ))}
      </div>
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        >
          <h3 className="text-xl font-bold mt-8 mb-4">Linked Products</h3>
          <div className="flex flex-wrap gap-2">
            {previewFile.products.map(({ product }) => (
              <Link
                key={product.id}
                href={`/admin/products/${product.id}/edit`}
                className="bg-gray-700 text-white px-3 py-1 rounded-full text-sm hover:bg-gray-600"
              >
                {product.name}
              </Link>
            ))}
          </div>
        </FilePreviewModal>
      )}
    </div>
  );
}
