/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { ImageFile, Product } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Trash2 } from "lucide-react";

interface ImageFileWithProducts extends ImageFile {
  products: { product: Product }[];
}

export default function FileManagerPage() {
  const [imageFiles, setImageFiles] = useState<ImageFileWithProducts[]>([]);
  const [searchFilename, setSearchFilename] = useState<string>("");
  const [searchProductName, setSearchProductName] = useState<string>("");
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  useEffect(() => {
    const fetchImageFiles = async () => {
      let url = `/api/files?`;
      if (searchFilename) {
        url += `filename=${searchFilename}&`;
      }
      if (searchProductName) {
        url += `productName=${searchProductName}&`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setImageFiles(data);
      } else {
        console.error("Failed to fetch image files");
      }
    };
    fetchImageFiles();
  }, [searchFilename, searchProductName, refreshTrigger]);

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this image file?")) {
      const res = await fetch(`/api/files/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setRefreshTrigger((prev) => prev + 1);
      } else {
        console.error("Failed to delete image file:", await res.json());
      }
    }
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">File Manager</h1>

      <div className="flex space-x-4 mb-6">
        <Input
          placeholder="Search by filename..."
          value={searchFilename}
          onChange={(e) => setSearchFilename(e.target.value)}
          className="max-w-sm"
        />
        <Input
          placeholder="Search by product name..."
          value={searchProductName}
          onChange={(e) => setSearchProductName(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {imageFiles.map((file) => (
          <div key={file.id} className="border rounded-lg p-4 shadow-sm flex flex-col">
            <div className="relative w-full h-48 mb-4 rounded-md overflow-hidden">
              <img
                src={file.filepath}
                alt={file.filename}
                className="w-full h-full object-cover"
              />
            </div>
            <h2 className="text-lg font-semibold truncate mb-2" title={file.filename}>
              {file.filename}
            </h2>
            <p className="text-sm text-muted-foreground mb-1">Size: {(file.size / 1024).toFixed(2)} KB</p>
            <p className="text-sm text-muted-foreground mb-4">Mime Type: {file.mimetype}</p>

            {file.products && file.products.length > 0 && (
              <div className="mb-4">
                <h3 className="text-md font-medium mb-2">Associated Products:</h3>
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                  {file.products.map((prodRel) => (
                    <li key={prodRel.product.id}>
                      <Link href={`/admin/products/${prodRel.product.id}`} className="hover:underline">
                        {prodRel.product.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button
              variant="destructive"
              onClick={() => handleDelete(file.id)}
              className="mt-auto w-full"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          </div>
        ))}
      </div>

      {imageFiles.length === 0 && (
        <p className="text-center text-muted-foreground mt-8">No image files found.</p>
      )}
    </div>
  );
}
