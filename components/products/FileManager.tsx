"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

interface ImageFile {
  id: string;
  filename: string;
  filepath: string;
  products: {
    product: {
      id: string;
      name: string;
    };
  }[];
}

interface FileManagerProps {
  onSelectFile?: (files: { id: string; filepath: string }[]) => void;
}

// This component provides a UI for browsing and selecting existing image files.
// It fetches the list of files from the API and allows the user to filter them.
export default function FileManager({ onSelectFile }: FileManagerProps) {
  const [files, setFiles] = useState<ImageFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<
    { id: string; filepath: string }[]
  >([]);
  const [filenameSearch, setFilenameSearch] = useState("");
  const [productNameSearch, setProductNameSearch] = useState("");

  // This function fetches the files from the API based on the search criteria.
  const fetchFiles = useCallback(() => {
    const query = new URLSearchParams();
    if (filenameSearch) {
      query.append("filename", filenameSearch);
    }
    if (productNameSearch) {
      query.append("productName", productNameSearch);
    }
    void fetch(`/api/files?${query.toString()}`)
      .then((res) => res.json())
      .then(setFiles);
  }, [filenameSearch, productNameSearch]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // This function toggles the selection of a file.
  const handleToggleSelect = (file: { id: string; filepath: string }) => {
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
      const res = await fetch(`/api/files/${fileId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchFiles();
      } else {
        alert("Failed to delete file.");
      }
    }
  };

  return (
    <div className="p-4 bg-gray-900 text-white">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">File Manager</h2>
        {onSelectFile && (
          <Button onClick={handleConfirmSelection}>
            Confirm Selection ({selectedFiles.length})
          </Button>
        )}
      </div>
      <div className="flex space-x-4 mb-4">
        <input
          type="text"
          placeholder="Search by filename"
          value={filenameSearch}
          onChange={(e) => setFilenameSearch(e.target.value)}
          className="w-full p-2 bg-gray-800 rounded"
        />
        <input
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
              selectedFiles.some((f) => f.id === file.id)
                ? "border-blue-500"
                : "border-transparent"
            }`}
            onClick={() =>
              handleToggleSelect({ id: file.id, filepath: file.filepath })
            }
          >
            <Image
              src={`/api/files/preview?fileId=${file.id}`}
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
            <Button
              variant="destructive"
              size="sm"
              className="absolute top-1 right-1"
              onClick={(e) => {
                e.stopPropagation();
                void handleDelete(file.id);
              }}
            >
              X
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
