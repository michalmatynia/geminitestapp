"use client";

import React from "react";
import ModalShell from "@/components/ui/modal-shell";
import FileManager from "@/components/products/FileManager";
import ProductForm from "@/components/products/ProductForm";
import ProductListingsModal from "@/components/products/ProductListingsModal";
import ListProductModal from "@/components/products/ListProductModal";
import { ProductFormProvider, useProductFormContext } from "@/lib/context/ProductFormContext";
import type { ProductWithImages } from "@/types";

interface ProductModalsProps {
  isCreateOpen: boolean;
  initialSku: string;
  onCloseCreate: () => void;
  onCreateSuccess: () => void;
  editingProduct: ProductWithImages | null;
  onCloseEdit: () => void;
  onEditSuccess: () => void;
  integrationsProduct: ProductWithImages | null;
  onCloseIntegrations: () => void;
  showListProductModal: boolean;
  onOpenListProduct: () => void;
  onCloseListProduct: () => void;
  onListProductSuccess: () => void;
}

function CreateProductModalContent({ onClose }: { onClose: () => void }) {
  const { showFileManager, handleMultiFileSelect } = useProductFormContext();
  return (
    <ModalShell title="Create Product" onClose={onClose}>
      {showFileManager ? <FileManager onSelectFile={handleMultiFileSelect} /> : <ProductForm submitButtonText="Create" />}
    </ModalShell>
  );
}

function EditProductModalContent({ onClose }: { onClose: () => void }) {
  const { showFileManager, handleMultiFileSelect } = useProductFormContext();
  return (
    <ModalShell title="Edit Product" onClose={onClose}>
      {showFileManager ? <FileManager onSelectFile={handleMultiFileSelect} /> : <ProductForm submitButtonText="Update" />}
    </ModalShell>
  );
}

export function ProductModals({
  isCreateOpen,
  initialSku,
  onCloseCreate,
  onCreateSuccess,
  editingProduct,
  onCloseEdit,
  onEditSuccess,
  integrationsProduct,
  onCloseIntegrations,
  showListProductModal,
  onOpenListProduct,
  onCloseListProduct,
  onListProductSuccess,
}: ProductModalsProps) {
  return (
    <>
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onCloseCreate}>
          <div onClick={(e) => e.stopPropagation()}>
            <ProductFormProvider onSuccess={onCreateSuccess} initialSku={initialSku}>
              <CreateProductModalContent onClose={onCloseCreate} />
            </ProductFormProvider>
          </div>
        </div>
      )}
      
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onCloseEdit}>
          <div onClick={(e) => e.stopPropagation()}>
            <ProductFormProvider product={editingProduct} onSuccess={onEditSuccess}>
              <EditProductModalContent onClose={onCloseEdit} />
            </ProductFormProvider>
          </div>
        </div>
      )}
      
      {integrationsProduct && !showListProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onCloseIntegrations}>
          <div onClick={(e) => e.stopPropagation()}>
            <ProductListingsModal 
              product={integrationsProduct} 
              onClose={onCloseIntegrations} 
              onListProduct={onOpenListProduct} 
            />
          </div>
        </div>
      )}
      
      {integrationsProduct && showListProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onCloseListProduct}>
          <div onClick={(e) => e.stopPropagation()}>
            <ListProductModal 
              product={integrationsProduct} 
              onClose={onCloseListProduct} 
              onSuccess={onListProductSuccess} 
            />
          </div>
        </div>
      )}
    </>
  );
}
