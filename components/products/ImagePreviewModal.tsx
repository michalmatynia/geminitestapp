"use client";

import { XIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface ImageFile {
  id: string;
  filename: string;
  filepath: string;
  mimetype: string;
  size: number;
  width: number | null;
  height: number | null;
  products: {
    product: {
      id: string;
      name: string;
    };
  }[];
}

interface ImagePreviewModalProps {
  file: ImageFile;
  onClose: () => void;
}

export default function ImagePreviewModal({
  file,
  onClose,
}: ImagePreviewModalProps) {
  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg shadow-lg p-8 max-w-3xl w-full relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
          aria-label="Close modal"
        >
          <XIcon className="size-6" />
        </button>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-bold mb-4">{file.filename}</h2>
            <div className="relative w-full h-96">
              <Image
                src={file.filepath}
                alt={file.filename}
                layout="fill"
                objectFit="contain"
                className="rounded"
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
            <h3 className="text-xl font-bold mt-8 mb-4">Linked Products</h3>
            <div className="flex flex-wrap gap-2">
              {file.products.map(({ product }) => (
                <Link
                  key={product.id}
                  href={`/admin/products/${product.id}/edit`}
                  className="bg-gray-700 text-white px-3 py-1 rounded-full text-sm hover:bg-gray-600"
                >
                  {product.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
