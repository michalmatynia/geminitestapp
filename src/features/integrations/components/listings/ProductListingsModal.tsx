"use client";
import { ModalShell, Button, Input, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Label } from "@/shared/ui";
import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import Link from "next/link";

import type { ProductWithImages } from "@/features/products";
import type { ProductListingWithDetails, ProductListingExportEvent, IntegrationWithConnections, IntegrationConnectionBasic } from "@/features/integrations/types/listings";
import { SyncDirection } from "@/features/products";
import { Trash2, ArrowRight, ArrowLeft, ArrowLeftRight, Check, X } from "lucide-react";
import { ExportLogViewer } from "./ExportLogViewer";
import type { CapturedLog } from "@/features/integrations/services/exports/log-capture";
import type { ImageRetryPreset, ImageTransformOptions } from "@/features/data-import-export";
import { useImageRetryPresets } from "./useImageRetryPresets";

import { isImageExportError } from "./utils";
import { useIntegrationSelection } from "./hooks/useIntegrationSelection";

type ProductListingsModalProps = {
  product: ProductWithImages;
  onClose: () => void;
  onStartListing?: (integrationId: string, connectionId: string) => void;
  filterIntegrationSlug?: string | null;
  onListingsUpdated?: (() => void) | undefined;
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
  onStartListing,
  filterIntegrationSlug,
  onListingsUpdated,
}: ProductListingsModalProps): React.JSX.Element {
  const queryClient: QueryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [deletingFromBase, setDeletingFromBase] = useState<string | null>(null);
  const [purgingListing, setPurgingListing] = useState<string | null>(null);
  const [exportingListing, setExportingListing] = useState<string | null>(null);
  const [inventoryOverrides, setInventoryOverrides] = useState<Record<string, string>>({});
  const [savingInventoryId, setSavingInventoryId] = useState<string | null>(null);
  const [historyOpenByListing, setHistoryOpenByListing] = useState<Record<string, boolean>>({});
  const [exportLogs, setExportLogs] = useState<CapturedLog[]>([]);
  const [logsOpen, setLogsOpen] = useState<boolean>(false);
  const [lastExportListingId, setLastExportListingId] = useState<string | null>(null);
  const imageRetryPresets: ImageRetryPreset[] = useImageRetryPresets();

  const {
    integrations,
    loading: _loadingIntegrations,
    selectedIntegrationId,
    selectedConnectionId,
    selectedIntegration,
    setSelectedIntegrationId,
    setSelectedConnectionId,
  } = useIntegrationSelection();

  const productName: string =
    product.name_en || product.name_pl || product.name_de || "Unnamed Product";

  const listingsQuery: ReturnType<typeof useQuery<ProductListingWithDetails[]>> = useQuery({
    queryKey: ["integrations", "product-listings", product.id],
    queryFn: async (): Promise<ProductListingWithDetails[]> => {
      const res: Response = await fetch(`/api/integrations/products/${product.id}/listings`);
      if (!res.ok) {
        throw new Error("Failed to fetch listings");
      }
      return (await res.json()) as ProductListingWithDetails[];
    },
    enabled: Boolean(product.id),
  });

  const listings: ProductListingWithDetails[] = listingsQuery.data ?? [];
  const loadingListings: boolean = listingsQuery.isPending;
  const listingsError: unknown = listingsQuery.error;
  const combinedError: string | null = useMemo((): string | null => {
    if (error) return error;
    if (!listingsError) return null;
    return listingsError instanceof Error ? listingsError.message : "Failed to load listings";
  }, [error, listingsError]);

  const filteredListings: ProductListingWithDetails[] = filterIntegrationSlug
    ? listings.filter((listing: ProductListingWithDetails): boolean => listing.integration.slug === filterIntegrationSlug)
    : listings;
  const statusTargetLabel: string =
    filterIntegrationSlug === "baselinker"
      ? "Base.com"
      : filterIntegrationSlug ?? "integration";

  const formatTimestamp = (value: string | Date | null | undefined): string => {
    if (!value) return "—";
    const date: Date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString();
  };

  const formatListValue = (value: string | null | undefined): string =>
    value ? value : "—";

  const getExportFieldsLabel = (): string => {
    const fields: string[] = [];
    if (product.sku) fields.push("SKU");
    if (product.ean) fields.push("EAN");
    if (product.weight !== null && product.weight !== undefined) fields.push("Weight");
    if (product.name_en) fields.push("Name");
    if (product.description_en) fields.push("Description");
    if (product.price !== null && product.price !== undefined) fields.push("Price");
    if (product.stock !== null && product.stock !== undefined) fields.push("Stock");
    return fields.length > 0 ? fields.join(", ") : "No exportable fields detected";
  };

  const getLatestTemplateId = (listing: ProductListingWithDetails): string | null => {
    const history: ProductListingExportEvent[] = listing.exportHistory ?? [];
    if (history.length === 0) return null;
    const sorted: ProductListingExportEvent[] = [...history].sort((a: ProductListingExportEvent, b: ProductListingExportEvent): number => {
      const aTime: number = a.exportedAt ? new Date(a.exportedAt).getTime() : 0;
      const bTime: number = b.exportedAt ? new Date(b.exportedAt).getTime() : 0;
      return bTime - aTime;
    });
    return sorted[0]?.templateId ?? null;
  };

  // Define sync configuration for each field
  const getSyncFields = (): { name: string; value: string; hasValue: boolean; syncDirection: SyncDirection; description: string }[] => {
    return [
      {
        name: "SKU",
        value: product.sku || "—",
        hasValue: !!product.sku,
        syncDirection: "to_base" as SyncDirection,
        description: "Product identifier",
      },
      {
        name: "Name",
        value: product.name_en || "—",
        hasValue: !!product.name_en,
        syncDirection: "to_base" as SyncDirection,
        description: "Product name (English)",
      },
      {
        name: "Description",
        value: product.description_en ? `${product.description_en.slice(0, 50)}...` : "—",
        hasValue: !!product.description_en,
        syncDirection: "to_base" as SyncDirection,
        description: "Product description (English)",
      },
      {
        name: "Price",
        value: product.price !== null && product.price !== undefined ? `${product.price.toFixed(2)}` : "—",
        hasValue: product.price !== null && product.price !== undefined,
        syncDirection: "to_base" as SyncDirection,
        description: "Base price",
      },
      {
        name: "Stock",
        value: product.stock !== null && product.stock !== undefined ? `${product.stock}` : "—",
        hasValue: product.stock !== null && product.stock !== undefined,
        syncDirection: "to_base" as SyncDirection,
        description: "Inventory quantity",
      },
      {
        name: "EAN",
        value: product.ean || "—",
        hasValue: !!product.ean,
        syncDirection: "to_base" as SyncDirection,
        description: "Barcode / EAN",
      },
      {
        name: "Weight",
        value: product.weight !== null && product.weight !== undefined ? `${product.weight}g` : "—",
        hasValue: product.weight !== null && product.weight !== undefined,
        syncDirection: "to_base" as SyncDirection,
        description: "Product weight",
      },
    ];
  };

  const getSyncDirectionIcon = (direction: SyncDirection | "none"): React.JSX.Element => {
    switch (direction) {
      case "to_base":
        return <ArrowRight className="size-3 text-blue-400" />;
      case "from_base":
        return <ArrowLeft className="size-3 text-purple-400" />;
      case "bidirectional":
        return <ArrowLeftRight className="size-3 text-emerald-400" />;
      default:
        return <X className="size-3 text-gray-500" />;
    }
  };

  const getSyncDirectionLabel = (direction: SyncDirection | "none"): string => {
    switch (direction) {
      case "to_base":
        return "To Base.com";
      case "from_base":
        return "From Base.com";
      case "bidirectional":
        return "Both ways";
      default:
        return "Not synced";
    }
  };

  const canStartListing: boolean = Boolean(onStartListing) && !filterIntegrationSlug;

  const StartListingPanel: React.FC = (): React.JSX.Element => (
    <div className="rounded-md border border-border bg-card/60 px-4 py-4">
      {_loadingIntegrations ? (
        <p className="text-sm text-gray-400">Loading integrations...</p>
      ) : integrations.length === 0 ? (
        <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
          No connected integrations.{" "}
          <Link href="/admin/integrations" className="underline hover:text-yellow-100">
            Set up an integration
          </Link>
          .
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-left">
            <Label className="mb-2 block text-xs font-medium text-gray-300">
              Integration
            </Label>
            <Select
              value={selectedIntegrationId}
              onValueChange={setSelectedIntegrationId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an integration..." />
              </SelectTrigger>
              <SelectContent>
                {integrations
                  .filter((integration: IntegrationWithConnections): boolean => !!integration.id)
                  .map((integration: IntegrationWithConnections): React.JSX.Element => (
                    <SelectItem key={integration.id} value={integration.id}>
                      {integration.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {selectedIntegration && selectedIntegration.connections.length > 0 && (
            <div className="text-left">
              <Label className="mb-2 block text-xs font-medium text-gray-300">
                Account / Connection
              </Label>
              <Select
                value={selectedConnectionId}
                onValueChange={setSelectedConnectionId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an account..." />
                </SelectTrigger>
                <SelectContent>
                  {selectedIntegration.connections
                    .filter((connection: IntegrationConnectionBasic): boolean => !!connection.id)
                    .map((connection: IntegrationConnectionBasic): React.JSX.Element => (
                      <SelectItem key={connection.id} value={connection.id}>
                        {connection.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-center">
            <Button
              onClick={(): void => {
                if (onStartListing && selectedIntegrationId && selectedConnectionId) {
                  onStartListing(selectedIntegrationId, selectedConnectionId);
                }
              }}
              disabled={!selectedIntegrationId || !selectedConnectionId || !onStartListing}
            >
              List Product
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  const SyncConfigurationPanel: React.FC = (): React.JSX.Element => {
    const syncFields: { name: string; value: string; hasValue: boolean; syncDirection: SyncDirection; description: string }[] = getSyncFields();
    const activeFields: { name: string; value: string; hasValue: boolean; syncDirection: SyncDirection; description: string }[] = syncFields.filter((f: { hasValue: boolean }): boolean => f.hasValue);

    return (
      <div className="rounded-md border border-border bg-card/60 p-3">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Sync Configuration
          </h4>
          <div className="flex items-center gap-1 text-[10px] text-gray-500">
            <ArrowRight className="size-2.5" />
            <span>To Base.com only</span>
          </div>
        </div>

        <div className="mb-3 rounded border border-blue-500/20 bg-blue-500/5 px-2 py-1.5">
          <div className="flex items-center gap-2 text-xs text-blue-300">
            <ArrowRight className="size-3" />
            <span>
              Currently configured for <strong>one-way export</strong> (Product &rarr; Base.com)
            </span>
          </div>
        </div>

        <div className="space-y-1">
          {syncFields.map((field: { name: string; value: string; hasValue: boolean; syncDirection: SyncDirection; description: string }): React.JSX.Element => (
            <div
              key={field.name}
              className={`flex items-center justify-between rounded px-2 py-1.5 text-xs ${
                field.hasValue
                  ? "bg-card/50"
                  : "bg-gray-900/20 opacity-50"
              }`}
            >
              <div className="flex items-center gap-2">
                {field.hasValue ? (
                  <Check className="size-3 text-emerald-400" />
                ) : (
                  <X className="size-3 text-gray-600" />
                )}
                <span className={field.hasValue ? "text-gray-200" : "text-gray-500"}>
                  {field.name}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="max-w-[120px] truncate text-gray-400" title={field.value}>
                  {field.value}
                </span>
                <div className="flex items-center gap-1" title={getSyncDirectionLabel(field.syncDirection)}>
                  {getSyncDirectionIcon(field.hasValue ? field.syncDirection : "none")}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 border-t border-border pt-2">
          <div className="flex items-center justify-between text-[10px] text-gray-500">
            <span>{activeFields.length} of {syncFields.length} fields will be synced</span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <ArrowRight className="size-2.5 text-blue-400" />
                <span>To Base</span>
              </div>
              <div className="flex items-center gap-1 opacity-40">
                <ArrowLeft className="size-2.5 text-purple-400" />
                <span>From Base</span>
              </div>
              <div className="flex items-center gap-1 opacity-40">
                <ArrowLeftRight className="size-2.5 text-emerald-400" />
                <span>Both</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleDeleteFromBase = async (listingId: string): Promise<void> => {
    const listing: ProductListingWithDetails | undefined = listings.find((item: ProductListingWithDetails): boolean => item.id === listingId);
    if (!listing) return;
    if (!window.confirm("Delete this product from Base.com? This cannot be undone.")) {
      return;
    }

    try {
      setDeletingFromBase(listingId);
      // Send inventoryId if available, but let the backend handle fallback logic
      const inventoryId: string = (inventoryOverrides[listingId] || listing.inventoryId || "").trim();
      const body: { inventoryId?: string } = inventoryId ? { inventoryId } : {};
      const res: Response = await fetch(
        `/api/integrations/products/${product.id}/listings/${listingId}/delete-from-base`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        const payload: { error?: string } = (await res.json().catch((): Record<string, never> => ({}))) as { error?: string };
        throw new Error(payload.error || "Failed to delete from Base.com");
      }
      queryClient.setQueryData<ProductListingWithDetails[]>(
        ["integrations", "product-listings", product.id],
        (prev: ProductListingWithDetails[] | undefined = []): ProductListingWithDetails[] =>
          prev.map((item: ProductListingWithDetails): ProductListingWithDetails =>
            item.id === listingId
              ? { ...item, status: "removed", updatedAt: new Date() }
              : item
          )
      );
      onListingsUpdated?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete from Base.com");
    } finally {
      setDeletingFromBase(null);
    }
  };

  const handlePurgeListing = async (listingId: string): Promise<void> => {
    const listing: ProductListingWithDetails | undefined = listings.find((item: ProductListingWithDetails): boolean => item.id === listingId);
    if (!listing) return;
    if (!window.confirm("Remove this integration connection and its history?")) {
      return;
    }

    try {
      setPurgingListing(listingId);
      const res: Response = await fetch(
        `/api/integrations/products/${product.id}/listings/${listingId}/purge`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        throw new Error("Failed to remove listing history");
      }
      queryClient.setQueryData<ProductListingWithDetails[]>(
        ["integrations", "product-listings", product.id],
        (prev: ProductListingWithDetails[] | undefined = []): ProductListingWithDetails[] => prev.filter((item: ProductListingWithDetails): boolean => item.id !== listingId)
      );
      onListingsUpdated?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to remove listing history");
    } finally {
      setPurgingListing(null);
    }
  };

  const handleSaveInventoryId = async (listingId: string): Promise<void> => {
    const value: string = (inventoryOverrides[listingId] ?? "").trim();
    if (!value) {
      setError("Inventory ID is required.");
      return;
    }

    try {
      setSavingInventoryId(listingId);
      const res: Response = await fetch(
        `/api/integrations/products/${product.id}/listings/${listingId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inventoryId: value }),
        }
      );
      if (!res.ok) {
        const payload: { error?: string } = (await res.json().catch((): Record<string, never> => ({}))) as { error?: string };
        throw new Error(payload.error || "Failed to save inventory ID");
      }
      queryClient.setQueryData<ProductListingWithDetails[]>(
        ["integrations", "product-listings", product.id],
        (prev: ProductListingWithDetails[] | undefined = []): ProductListingWithDetails[] =>
          prev.map((item: ProductListingWithDetails): ProductListingWithDetails =>
            item.id === listingId
              ? { ...item, inventoryId: value, updatedAt: new Date() }
              : item
          )
      );
      setInventoryOverrides((prev: Record<string, string>): Record<string, string> => {
        const next: Record<string, string> = { ...prev };
        delete next[listingId];
        return next;
      });
      onListingsUpdated?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save inventory ID");
    } finally {
      setSavingInventoryId(null);
    }
  };

  const exportListingToBase = async (
    listingId: string,
    options?: {
      imageBase64Mode?: "base-only" | "full-data-uri";
      imageTransform?: ImageTransformOptions | null;
    }
  ): Promise<void> => {
    const listing: ProductListingWithDetails | undefined = listings.find((item: ProductListingWithDetails): boolean => item.id === listingId);
    if (!listing) return;
    const inventoryId: string = (inventoryOverrides[listingId] || listing.inventoryId || "").trim();
    if (!inventoryId) {
      throw new Error("Inventory ID is required.");
    }
    const templateId: string | undefined = getLatestTemplateId(listing) ?? undefined;
    const payload: Record<string, unknown> = {
      connectionId: listing.connectionId,
      inventoryId,
      templateId,
    };
    if (options?.imageBase64Mode) {
      payload.imageBase64Mode = options.imageBase64Mode;
      payload.exportImagesAsBase64 = true;
    }
    if (options?.imageTransform) {
      payload.imageTransform = options.imageTransform;
      payload.exportImagesAsBase64 = true;
    }

    const res: Response = await fetch(`/api/integrations/products/${product.id}/export-to-base`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const payloadRes: { logs?: CapturedLog[]; error?: string } = (await res.json().catch((): Record<string, never> => ({}))) as { logs?: CapturedLog[]; error?: string };
    if (payloadRes.logs) {
      setExportLogs(payloadRes.logs);
    }
    if (!res.ok) {
      throw new Error(payloadRes.error || "Failed to export product");
    }
  };

  const exportListingImagesOnly = async (
    listingId: string,
    options?: {
      imageBase64Mode?: "base-only" | "full-data-uri";
      imageTransform?: ImageTransformOptions | null;
    }
  ): Promise<void> => {
    const listing: ProductListingWithDetails | undefined = listings.find((item: ProductListingWithDetails): boolean => item.id === listingId);
    if (!listing) return;
    const inventoryId: string = (inventoryOverrides[listingId] || listing.inventoryId || "").trim();
    if (!inventoryId) {
      throw new Error("Inventory ID is required.");
    }
    if (!listing.externalListingId) {
      throw new Error("External Base.com product ID is missing.");
    }
    const payload: Record<string, unknown> = {
      connectionId: listing.connectionId,
      inventoryId,
      imagesOnly: true,
      listingId: listing.id,
      externalListingId: listing.externalListingId,
      allowDuplicateSku,
      exportImagesAsBase64: true,
    };
    if (options?.imageBase64Mode) {
      payload.imageBase64Mode = options.imageBase64Mode;
    }
    if (options?.imageTransform) {
      payload.imageTransform = options.imageTransform;
    }

    const res: Response = await fetch(`/api/integrations/products/${product.id}/export-to-base`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const payloadRes: { logs?: CapturedLog[]; error?: string } = (await res.json().catch((): Record<string, never> => ({}))) as { logs?: CapturedLog[]; error?: string };
    if (payloadRes.logs) {
      setExportLogs(payloadRes.logs);
    }
    if (!res.ok) {
      throw new Error(payloadRes.error || "Failed to export product images");
    }
  };

  const handleExportAgain = async (listingId: string): Promise<void> => {
    const listing: ProductListingWithDetails | undefined = listings.find((item: ProductListingWithDetails): boolean => item.id === listingId);
    if (!listing) return;
    const inventoryId: string = (inventoryOverrides[listingId] || listing.inventoryId || "").trim();
    if (!inventoryId) {
      setError("Inventory ID is required.");
      return;
    }

    try {
      setExportingListing(listingId);
      setLastExportListingId(listingId);
      setExportLogs([]);
      setLogsOpen(true);
      await exportListingToBase(listingId);
      await queryClient.invalidateQueries({
        queryKey: ["integrations", "product-listings", product.id],
      });
      onListingsUpdated?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to export product");
    } finally {
      setExportingListing(null);
    }
  };

  const handleExportImagesOnly = async (
    listingId: string,
    preset?: ImageRetryPreset
  ): Promise<void> => {
    try {
      setExportingListing(listingId);
      setLastExportListingId(listingId);
      setError(null);
      setExportLogs([]);
      setLogsOpen(true);
      await exportListingImagesOnly(listingId, preset ? {
        imageBase64Mode: preset.imageBase64Mode,
        imageTransform: preset.transform,
      } : undefined);
      await queryClient.invalidateQueries({
        queryKey: ["integrations", "product-listings", product.id],
      });
      onListingsUpdated?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to export product images");
    } finally {
      setExportingListing(null);
    }
  };

  const handleImageRetry = async (preset: ImageRetryPreset): Promise<void> => {
    if (!lastExportListingId) return;
    try {
      setExportingListing(lastExportListingId);
      setError(null);
      setExportLogs([]);
      setLogsOpen(true);
      await exportListingToBase(lastExportListingId, {
        imageBase64Mode: preset.imageBase64Mode,
        imageTransform: preset.transform,
      });
      await queryClient.invalidateQueries({
        queryKey: ["integrations", "product-listings", product.id],
      });
      onListingsUpdated?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to export product");
    } finally {
      setExportingListing(null);
    }
  };

  const loading: boolean = loadingListings;

  return (
    <ModalShell
      title={`Integrations - ${productName}`}
      onClose={onClose}
      size="md"
    >
      <div className="space-y-4">
        {loading ? (
          <p className="text-sm text-gray-400">Loading listings...</p>
        ) : combinedError ? (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <div className="flex flex-col gap-3">
              <span>{combinedError}</span>
              {isImageExportError(combinedError) && lastExportListingId ? (
                <div className="flex flex-wrap items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="bg-red-500/20 text-red-100 hover:bg-red-500/30"
                        disabled={Boolean(exportingListing)}
                      >
                        Retry image export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="bg-card border-border">
                      {imageRetryPresets.map((preset: ImageRetryPreset): React.JSX.Element => (
                        <DropdownMenuItem
                          key={preset.id}
                          onSelect={(): void => { void handleImageRetry(preset); }}
                          className="text-gray-200 focus:bg-gray-800/70"
                        >
                          <div className="flex flex-col">
                            <span className="text-sm">{preset.label}</span>
                            <span className="text-xs text-gray-400">
                              {preset.description}
                            </span>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <span className="text-xs text-red-200/80">
                    Applies JPEG resize/compression and retries automatically.
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {canStartListing && <StartListingPanel />}
            {filteredListings.length === 0 ? (
              <div className="rounded-md border bg-card/50 px-4 py-8 text-center">
                {filterIntegrationSlug ? (
                  <div className="space-y-3">
                    <div className="text-sm text-gray-300">
                      {statusTargetLabel} status
                    </div>
                    <div className="rounded-md border border-border bg-card/60 px-3 py-2 text-xs text-gray-400">
                      Not connected.
                    </div>
                    {filterIntegrationSlug === "baselinker" && <SyncConfigurationPanel />}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="border-t border-border pt-3">
                      <p className="text-sm text-gray-400">
                        This product is not listed on any marketplace yet.
                      </p>
                      <p className="mt-2 text-xs text-gray-500">
                        Use the + button in the header to list products on a marketplace.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filterIntegrationSlug && (
                  <div className="rounded-md border border-border bg-card/60 px-3 py-2 text-xs text-gray-300">
                    {statusTargetLabel} status: {filteredListings[0]?.status ?? "Unknown"}
                  </div>
                )}
                {filterIntegrationSlug === "baselinker" && <SyncConfigurationPanel />}
                {filteredListings.map((listing: ProductListingWithDetails): React.JSX.Element => (
                  <div
                    key={listing.id}
                    className="flex items-center justify-between rounded-md border bg-card/50 px-4 py-3"
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
                      {listing.inventoryId && (
                        <p className="text-xs text-gray-500">
                          Inventory ID: {listing.inventoryId}
                        </p>
                      )}
                      <div className="mt-2 space-y-1 text-xs text-gray-500">
                        <p>Last export: {formatTimestamp(listing.listedAt)}</p>
                        <p>Created: {formatTimestamp(listing.createdAt)}</p>
                        <p>Updated: {formatTimestamp(listing.updatedAt)}</p>
                        {["baselinker", "base-com"].includes(listing.integration.slug) && (
                          <p>Exported fields: {getExportFieldsLabel()}</p>
                        )}
                      </div>
                      {listing.exportHistory && listing.exportHistory.length > 0 ? (
                        <div className="mt-3 rounded border border-border bg-card/50 p-2">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] uppercase tracking-wide text-gray-500">
                              Export history
                            </p>
                            <Button
                              type="button"
                              onClick={(): void =>
                                setHistoryOpenByListing((prev: Record<string, boolean>): Record<string, boolean> => ({
                                  ...prev,
                                  [listing.id]: !(prev[listing.id] ?? false),
                                }))
                              }
                              className="text-[10px] uppercase tracking-wide text-gray-400 hover:text-gray-200"
                            >
                              {(historyOpenByListing[listing.id] ?? false)
                                ? "Hide"
                                : "Show"}
                            </Button>
                          </div>
                          {(historyOpenByListing[listing.id] ?? false) ? (
                            <div className="mt-2 space-y-2 text-xs text-gray-400">
                              {listing.exportHistory.slice(0, 5).map((event: ProductListingExportEvent, index: number): React.JSX.Element => (
                                <div key={`${listing.id}-export-${index}`} className="grid gap-1">
                                  <div className="flex items-center justify-between text-gray-300">
                                    <span>{formatTimestamp(event.exportedAt)}</span>
                                    <span className="uppercase text-[10px] text-gray-500">
                                      {event.status ?? "success"}
                                    </span>
                                  </div>
                                  <div className="grid gap-1">
                                    <span>Inventory: {formatListValue(event.inventoryId)}</span>
                                    <span>Template: {formatListValue(event.templateId)}</span>
                                    <span>Warehouse: {formatListValue(event.warehouseId)}</span>
                                    {event.externalListingId && (
                                      <span>External ID: {event.externalListingId}</span>
                                    )}
                                    {event.fields && event.fields.length > 0 ? (
                                      <span>Fields: {event.fields.join(", ")}</span>
                                    ) : (
                                      <span>Fields: &mdash;</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-gray-600">No export history recorded.</p>
                      )}
                    </div>
                    <div className="ml-4 flex flex-col gap-2">
                      {["baselinker", "base-com"].includes(listing.integration.slug) && (
                        <>
                          {listing.status === "failed" && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={(): void => { void handleExportAgain(listing.id); }}
                              disabled={exportingListing === listing.id}
                              className="border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10"
                            >
                              Export again
                            </Button>
                          )}
                          {listing.status !== "removed" && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={
                                    exportingListing === listing.id ||
                                    !listing.externalListingId
                                  }
                                  className="border-sky-500/40 text-sky-200 hover:bg-sky-500/10"
                                >
                                  Re-export images only
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="start"
                                className="bg-card border-border"
                              >
                                <DropdownMenuItem
                                  onSelect={(): void => { void handleExportImagesOnly(listing.id); }}
                                  className="text-gray-200 focus:bg-gray-800/70"
                                >
                                  <div className="flex flex-col">
                                    <span className="text-sm">No resize (base-only)</span>
                                    <span className="text-xs text-gray-400">
                                      Re-send images without extra compression.
                                    </span>
                                  </div>
                                </DropdownMenuItem>
                                {imageRetryPresets.map((preset: ImageRetryPreset): React.JSX.Element => (
                                  <DropdownMenuItem
                                    key={preset.id}
                                    onSelect={(): void => {
                                      void handleExportImagesOnly(listing.id, preset);
                                    }}
                                    className="text-gray-200 focus:bg-gray-800/70"
                                  >
                                    <div className="flex flex-col">
                                      <span className="text-sm">{preset.label}</span>
                                      <span className="text-xs text-gray-400">
                                        {preset.description}
                                      </span>
                                    </div>
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                          {!listing.inventoryId && (
                            <div className="space-y-1 text-xs text-gray-400">
                              <Label htmlFor={`inventory-${listing.id}`}>
                                Inventory ID
                              </Label>
                              <Input
                                id={`inventory-${listing.id}`}
                                value={inventoryOverrides[listing.id] ?? ""}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                                  setInventoryOverrides((prev: Record<string, string>): Record<string, string> => ({
                                    ...prev,
                                    [listing.id]: e.target.value,
                                  }))
                                }
                                placeholder="Enter inventory ID"
                                className="h-7 border bg-card/60 text-gray-200"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={(): void => { void handleSaveInventoryId(listing.id); }}
                                disabled={savingInventoryId === listing.id}
                                className="h-7 border text-gray-200 hover:bg-muted/50"
                              >
                                Save inventory ID
                              </Button>
                            </div>
                          )}
                          {listing.status !== "removed" && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={(): void => { void handleDeleteFromBase(listing.id); }}
                              disabled={deletingFromBase === listing.id}
                              className="border-red-500/40 text-red-300 hover:bg-red-500/10"
                            >
                              Delete from Base.com
                            </Button>
                          )}
                        </>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(): void => { void handlePurgeListing(listing.id); }}
                        disabled={purgingListing === listing.id}
                        className="text-gray-400 hover:bg-muted/50 hover:text-red-400"
                      >
                        <Trash2 className="mr-1 size-3" />
                        Remove history
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {exportLogs.length > 0 && (
          <div className="mt-4 border-t border pt-4">
            <ExportLogViewer
              logs={exportLogs}
              isOpen={logsOpen}
              onToggle={setLogsOpen}
            />
          </div>
        )}
      </div>
    </ModalShell>
  );
}
