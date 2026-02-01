"use client";
import { Button } from "@/shared/ui";
import { useRouter } from "next/navigation";
import { FileManager } from "@/features/files";
import ProductForm from "@/features/products/components/ProductForm";

import {
  ProductFormProvider,
  useProductFormContext,
} from "@/features/products/context/ProductFormContext";
import { ProductWithImages } from "@/features/products/types";

function ArrowLeftIcon(props: React.SVGProps<SVGSVGElement>): React.JSX.Element {
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

function EditProductForm(): React.JSX.Element {
  const { showFileManager, handleMultiFileSelect, uploading, handleSubmit } = useProductFormContext();
  const router = useRouter();

  return (
    <div className="rounded-lg bg-card p-6 shadow-lg">
      <div className="mb-6 flex items-center gap-4 border-b border-border pb-4">
        <Button
          onClick={(e: React.FormEvent | React.MouseEvent) => { void handleSubmit(e); }}
          disabled={uploading}
          aria-disabled={uploading}
          className="min-w-[100px] text-foreground"
        >
          {uploading ? "Saving..." : "Update"}
        </Button>
        <Button
          onClick={() => router.push("/admin/products")}
          className="min-w-[100px] text-foreground"
          aria-label="Back to products"
        >
          <ArrowLeftIcon className="size-4 mr-2" />
          Close
        </Button>
        <h1 className="text-3xl font-bold text-white leading-none">Edit Product</h1>
      </div>
      {showFileManager ? (
        <FileManager onSelectFile={handleMultiFileSelect} showFileManager={showFileManager} />
      ) : (
        <ProductForm submitButtonText="Update" />
      )}
    </div>
  );
}

export default function EditProductPage({
  product,
}: {
  product: ProductWithImages;
}): React.JSX.Element {
  return (
    <ProductFormProvider product={product}>
      <EditProductForm />
    </ProductFormProvider>
  );
}
