"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import ModalShell from "@/components/ui/modal-shell";
import { ProductListingRecord, ProductWithImages } from "@/types";
import { Trash2 } from "lucide-react";

type ProductListingsModalProps = {
  product: ProductWithImages;
  onClose: () => void;
  onListProduct: () => void;
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  active: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  failed: "bg-red-500/20 text-red-300 border-red-500/40",
  removed: "bg-gray-500/20 text-gray-300 border-gray-500/40",
};

export default function ProductListingsModal({
  product,
  onClose,
  onListProduct,
}: ProductListingsModalProps) {
  const [listings, setListings] = useState<ProductListingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const productName =
    product.name_en || product.name_pl || product.name_de || "Unnamed Product";

  useEffect(() => {
    const fetchListings = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/products/${product.id}/listings`);
        if (!res.ok) {
          throw new Error("Failed to fetch listings");
        }
        const data = (await res.json()) as ProductListingRecord[];
        setListings(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load listings");
      } finally {
        setLoading(false);
      }
    };

    void fetchListings();
  }, [product.id]);

  const handleDelete = async (listingId: string) => {
    if (!window.confirm("Remove this listing?")) return;

    try {
      setDeleting(listingId);
      const res = await fetch(
        `/api/products/${product.id}/listings/${listingId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        throw new Error("Failed to remove listing");
      }
      setListings((prev) => prev.filter((l) => l.id !== listingId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove listing");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <ModalShell
      title={`Integrations - ${productName}`}
      onClose={onClose}
      size="md"
      footer={
        <Button onClick={onListProduct}>
          List Product
        </Button>
      }
    >
      <div className="space-y-4">
        {loading ? (
          <p className="text-sm text-gray-400">Loading listings...</p>
        ) : error ? (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : listings.length === 0 ? (
          <div className="rounded-md border border-gray-700 bg-gray-900/50 px-4 py-8 text-center">
            <p className="text-sm text-gray-400">
              This product is not listed on any marketplace yet.
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Click &quot;List Product&quot; to add it to a marketplace.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {listings.map((listing) => (
              <div
                key={listing.id}
                className="flex items-center justify-between rounded-md border border-gray-700 bg-gray-900/50 px-4 py-3"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">
                      {listing.integration.name}
                    </span>
                    <span
                      className={`rounded border px-2 py-0.5 text-xs ${statusColors[listing.status] || statusColors.pending}`}
                    >
                      {listing.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    Account: {listing.connection.name}
                  </p>
                  {listing.externalListingId && (
                    <p className="text-xs text-gray-500">
                      External ID: {listing.externalListingId}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void handleDelete(listing.id)}
                  disabled={deleting === listing.id}
                  className="ml-4 rounded p-2 text-gray-400 hover:bg-gray-800 hover:text-red-400 disabled:opacity-50"
                  aria-label="Remove listing"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </ModalShell>
  );
}
