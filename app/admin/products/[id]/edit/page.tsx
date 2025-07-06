"use client";

import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Product } from "@/components/columns";

function ArrowLeftIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

interface EditProductPageProps {
  params: {
    id: string;
  };
}

export default function EditProductPage({ params }: EditProductPageProps) {
  const [name, setName] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [image, setImage] = useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const router = useRouter();
  const { id } = params;

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then((res) => res.json())
      .then((data: Product) => {
        if (data) {
          setName(data.name);
          setPrice(data.price.toString());
          setExistingImageUrl(data.imageUrl || null);
          setUploadedImageUrl(data.imageUrl || null); // Set uploaded image if it exists
        }
      });
  }, [id]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("price", price);
    if (image) {
      formData.append("image", image);
    }

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "PUT",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setUploadedImageUrl(data.imageUrl);
        setUploading(false);
        router.push("/admin");
      } else {
        const errorData = await res.json();
        setUploadError(errorData.error || "Failed to upload image.");
        setUploading(false);
      }
    } catch (_error) {
      setUploadError("Network error or server is unreachable.");
      setUploading(false);
    }
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
      setUploadedImageUrl(null); // Clear previous image on new selection
      setUploadError(null); // Clear previous error
    }
  };

  return (
    <div className="rounded-lg bg-gray-950 p-6 shadow-lg">
      <div className="mb-4 flex items-center">
        <Link href="/admin" className="mr-4 text-white hover:text-gray-300">
          <ArrowLeftIcon className="size-6" />
        </Link>
        <h1 className="text-3xl font-bold text-white">Edit Product</h1>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-400"
          >
            Name
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setName(e.target.value)
            }
            className="mt-1 block w-full rounded-md border-gray-700 bg-gray-900 text-white focus:border-gray-500 focus:ring-gray-500 sm:text-sm"
          />
        </div>
        <div className="mb-4">
          <label
            htmlFor="price"
            className="block text-sm font-medium text-gray-400"
          >
            Price
          </label>
          <input
            type="number"
            id="price"
            value={price}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setPrice(e.target.value)
            }
            className="mt-1 block w-full rounded-md border-gray-700 bg-gray-900 text-white focus:border-gray-500 focus:ring-gray-500 sm:text-sm"
          />
        </div>
        <div className="mb-4">
          <label
            htmlFor="image"
            className="block text-sm font-medium text-gray-400"
          >
            Product Image
          </label>
          {(existingImageUrl || uploadedImageUrl) && (
            <div className="mb-2">
              <Image
                src={uploadedImageUrl || existingImageUrl!}
                alt="Product Image"
                width={128}
                height={128}
                className="max-w-xs h-auto"
              />
            </div>
          )}
          <input
            type="file"
            id="image"
            accept="image/*"
            onChange={handleImageChange}
            className="mt-1 block w-full text-sm text-gray-400
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-gray-700 file:text-white
              hover:file:bg-gray-600"
          />
          {uploading && (
            <div className="mt-2 w-full bg-gray-700 rounded-full h-2.5">
              <div
                className="bg-white h-2.5 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          )}
          {uploadError && (
            <p className="mt-2 text-sm text-red-500">Error: {uploadError}</p>
          )}
        </div>
        <button
          type="submit"
          className="inline-flex justify-center rounded-md border border-transparent bg-white px-4 py-2 text-sm font-medium text-black shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          Update
        </button>
      </form>
    </div>
  );
}
