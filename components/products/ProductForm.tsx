"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useProductFormContext } from "@/lib/context/ProductFormContext";
import DebugPanel from "@/components/DebugPanel";
import ProductFormGeneral from "./form/ProductFormGeneral";
import ProductFormOther from "./form/ProductFormOther";
import ProductFormImages from "./form/ProductFormImages";
import ProductFormImportInfo from "./form/ProductFormImportInfo";
import ProductFormParameters from "./form/ProductFormParameters";

interface ProductFormProps {
  submitButtonText: string;
  skuRequired?: boolean;
}

/**
 * This component renders the product form fields and handles user interactions.
 * It consumes the ProductFormContext to access state and functions.
 * @param submitButtonText - The text to display on the submit button.
 */
export default function ProductForm({
  submitButtonText: _submitButtonText,
  skuRequired: _skuRequired = false,
}: ProductFormProps) {
  const {
    handleSubmit,
    uploadError,
    uploadSuccess,
    product,
  } = useProductFormContext();
  
  const searchParams = useSearchParams();
  const [isDebugOpen, setIsDebugOpen] = useState(false);

  useEffect(() => {
    setIsDebugOpen(searchParams.get("debug") === "true");
  }, [searchParams]);

  return (
    <form onSubmit={handleSubmit} className="relative min-h-[400px] pb-10">
      {isDebugOpen && <DebugPanel />}
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="other">Other</TabsTrigger>
          <TabsTrigger value="parameters">Parameters</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
          <TabsTrigger value="import-info">Import Info</TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="mt-4">
          <ProductFormGeneral />
        </TabsContent>
        <TabsContent value="other" className="mt-4">
          <ProductFormOther />
        </TabsContent>
        <TabsContent value="parameters" className="mt-4">
          <ProductFormParameters />
        </TabsContent>
        <TabsContent value="images" className="mt-4">
          <ProductFormImages />
        </TabsContent>
        <TabsContent value="import-info" className="mt-4">
          <ProductFormImportInfo />
        </TabsContent>
      </Tabs>
      {product?.id && (
        <div className="absolute bottom-0 right-0 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors">
          <span className="mr-1">ID:</span>
          <span className="font-mono select-all cursor-text" title="Click to select">
            {product.id}
          </span>
        </div>
      )}
      {(uploadSuccess || uploadError) && (
        <div className="fixed bottom-6 right-6 z-50">
          <div
            className={`rounded-md px-4 py-3 text-sm shadow-lg ${
              uploadError
                ? "bg-red-500 text-white"
                : "bg-emerald-500 text-white"
            }`}
            role={uploadError ? "alert" : "status"}
          >
            {uploadError ? uploadError : "Saved."}
          </div>
        </div>
      )}
    </form>
  );
}
