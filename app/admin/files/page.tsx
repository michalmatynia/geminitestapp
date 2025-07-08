"use client";

import { useState, useEffect } from "react";
import { ImageFile, Product, ProductImage } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Image from "next/image";

type EnrichedProductImage = ProductImage & { product: Product };
type EnrichedImageFile = ImageFile & { products: EnrichedProductImage[] };

export default function FileManagerPage() {
  const [files, setFiles] = useState<EnrichedImageFile[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<EnrichedImageFile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function fetchFiles() {
      const res = await fetch("/api/files");
      const data = await res.json();
      setFiles(data);
      setFilteredFiles(data);
    }
    fetchFiles();
  }, []);

  useEffect(() => {
    const results = files.filter(
      (file) =>
        file.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        file.products.some((p) =>
          p.product.name?.toLowerCase().includes(searchTerm.toLowerCase())
        )
    );
    setFilteredFiles(results);
  }, [searchTerm, files]);

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this file?")) {
      const res = await fetch(`/api/files/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setFiles(files.filter((file) => file.id !== id));
      }
    }
  };

  return (
    <div className="p-6 bg-gray-950 text-white">
      <h1 className="text-3xl font-bold mb-4">File Manager</h1>
      <Input
        type="text"
        placeholder="Search by filename or product name..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-4 bg-gray-800 border-gray-700"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredFiles.map((file) => (
          <div key={file.id} className="bg-gray-800 rounded-lg p-4">
            <Image
              src={file.filepath}
              alt={file.filename}
              width={200}
              height={200}
              className="w-full h-40 object-cover rounded-md mb-2"
            />
            <p className="text-sm truncate">{file.filename}</p>
            <div className="text-xs text-gray-400">
              {file.products.length > 0 ? (
                <p>
                  Linked to:{" "}
                  {file.products.map((p) => p.product.name).join(", ")}
                </p>
              ) : (
                <p>Not linked to any product</p>
              )}
            </div>
            <Button
              onClick={() => handleDelete(file.id)}
              variant="destructive"
              className="mt-2 w-full"
            >
              Delete
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}