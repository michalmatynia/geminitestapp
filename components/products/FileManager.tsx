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
  onSelectFile?: (fileId: string) => void;
}

export default function FileManager({ onSelectFile }: FileManagerProps) {
  const [files, setFiles] = useState<ImageFile[]>([]);
  const [filenameSearch, setFilenameSearch] = useState("");
  const [productNameSearch, setProductNameSearch] = useState("");

  // The `fetchFiles` function fetches the files from the API based on the
  // search criteria.
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

  // The `handleSelect` function is called when a file is selected. It calls
  // the `onSelectFile` callback with the selected file's ID.
  const handleSelect = (fileId: string) => {
    if (onSelectFile) {
      onSelectFile(fileId);
    }
  };

  // The `handleDelete` function sends a DELETE request to the API to delete a
  // file. If the request is successful, it triggers a refresh of the file
  // list.
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
      <h2 className="text-2xl font-bold mb-4">File Manager</h2>
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
          <div key={file.id} className="relative">
            <div
              className={onSelectFile ? "cursor-pointer" : ""}
              onClick={() => handleSelect(file.id)}
            >
              <Image
                src={`/api/files/preview?fileId=${file.id}`}
                alt={file.filename}
                width={150}
                height={150}
                className="object-cover rounded"
              />
            </div>
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
              onClick={() => {
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
