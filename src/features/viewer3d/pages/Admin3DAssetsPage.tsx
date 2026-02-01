"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Button,
  SectionHeader,
  SectionPanel,
  Input,
  ListPanel,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui";
import {
  Box,
  Upload,
  Loader2,
  RefreshCw,
  Search,
  Grid,
  List,
  Filter,
  X,
} from "lucide-react";
import { cn } from "@/shared/utils";
import { Asset3DUploader } from "../components/Asset3DUploader";
import { Asset3DPreviewModal } from "../components/Asset3DPreviewModal";
import { Asset3DCard } from "../components/Asset3DCard";
import { Asset3DEditModal } from "../components/Asset3DEditModal";
import { 
  useAssets3D, 
  useAsset3DCategories, 
  useAsset3DTags,
  useDeleteAsset3DMutation,
  asset3dKeys
} from "../hooks/useAsset3dQueries";
import type { Asset3DRecord } from "../types";

type ViewMode = "grid" | "list";

export function Admin3DAssetsPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const [showUploader, setShowUploader] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<Asset3DRecord | null>(null);
  const [editAsset, setEditAsset] = useState<Asset3DRecord | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const filters = useMemo(
    () => ({
      ...(searchQuery && { search: searchQuery }),
      ...(selectedCategory && { category: selectedCategory }),
      ...(selectedTags.length > 0 && { tags: selectedTags }),
    }),
    [searchQuery, selectedCategory, selectedTags]
  );

  const assetsQuery = useAssets3D(filters);
  const categoriesQuery = useAsset3DCategories();
  const tagsQuery = useAsset3DTags();
  const deleteMutation = useDeleteAsset3DMutation();

  const assets = assetsQuery.data ?? [];
  const loading = assetsQuery.isPending;
  const error = assetsQuery.error instanceof Error ? assetsQuery.error.message : null;
  const categories = categoriesQuery.data ?? [];
  const allTags = tagsQuery.data ?? [];

  const handleUpload = (_asset: Asset3DRecord): void => {
    setShowUploader(false);
    void queryClient.invalidateQueries({ queryKey: asset3dKeys.all });
  };

  const handleEdit = (_updated: Asset3DRecord): void => {
    void queryClient.invalidateQueries({ queryKey: asset3dKeys.all });
  };

  const handleDelete = async (asset: Asset3DRecord): Promise<void> => {
    if (!confirm(`Are you sure you want to delete "${asset.name || asset.filename}"?`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(asset.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete asset");
    }
  };

  const clearFilters = (): void => {
    setSearchQuery("");
    setSelectedCategory(null);
    setSelectedTags([]);
  };

  const hasActiveFilters = searchQuery || selectedCategory || selectedTags.length > 0;

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const formatDate = (date: Date | string): string => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const stats =
    !loading && assets.length > 0 ? (
      <div className="text-sm text-muted-foreground">
        Showing {assets.length} asset{assets.length !== 1 ? "s" : ""}
        {hasActiveFilters && " (filtered)"}
      </div>
    ) : null;

  return (
    <ListPanel
      header={
        <SectionHeader
          title="3D Assets"
          description="Upload and manage 3D models with dithering preview"
          actions={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void assetsQuery.refetch()}
                disabled={loading}
                className="gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", assetsQuery.isFetching && "animate-spin")} />
                Refresh
              </Button>
              <Button size="sm" onClick={() => setShowUploader(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Upload Asset
              </Button>
            </>
          }
        />
      }
      alerts={
        error ? (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null
      }
      filters={
        <SectionPanel>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setSearchQuery(e.target.value)}
                placeholder="Search assets..."
                className="h-8 pl-9 text-sm"
              />
            </div>

            <Button
              variant={showFilters ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] text-white">
                  {(selectedCategory ? 1 : 0) + selectedTags.length}
                </span>
              )}
            </Button>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}

            <div className="ml-auto flex items-center overflow-hidden rounded-md border border-border bg-muted/20">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="icon"
                className="h-8 w-8 rounded-none"
                onClick={() => setViewMode("grid")}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="icon"
                className="h-8 w-8 rounded-none"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SectionPanel>
      }
      footer={stats}
    >
      {showFilters && (
        <SectionPanel>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-muted-foreground">Category</label>
              <select
                value={selectedCategory ?? ""}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>): void => setSelectedCategory(e.target.value || null)}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              >
                <option value="">All categories</option>
                {categories.map((cat: string) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-muted-foreground">Tags</label>
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag: string) => (
                  <Button
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setSelectedTags((prev: string[]) =>
                        prev.includes(tag) ? prev.filter((t: string) => t !== tag) : [...prev, tag]
                      )
                    }
                    className="h-7 px-2 text-xs"
                  >
                    {tag}
                  </Button>
                ))}
                {allTags.length === 0 && (
                  <span className="text-sm text-muted-foreground">No tags available</span>
                )}
              </div>
            </div>
          </div>
        </SectionPanel>
      )}

      {showUploader && (
        <SectionPanel>
          <div className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Upload 3D Asset</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowUploader(false)}>
                Cancel
              </Button>
            </div>
            <Asset3DUploader
              onUpload={handleUpload}
              onCancel={() => setShowUploader(false)}
              existingCategories={categories}
              existingTags={allTags}
            />
          </div>
        </SectionPanel>
      )}

      {loading && (
        <div className="flex items-center justify-center rounded-md border border-dashed border-border py-16 text-muted-foreground">
          <Loader2 className="h-7 w-7 animate-spin text-blue-400" />
        </div>
      )}

      {!loading && assets.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border bg-card/50 py-12 text-muted-foreground">
          <Box className="mb-4 h-12 w-12 opacity-60" />
          <p className="text-base font-medium text-foreground">
            {hasActiveFilters ? "No matching assets" : "No 3D assets yet"}
          </p>
          <p className="text-sm text-muted-foreground">
            {hasActiveFilters
              ? "Try adjusting your filters"
              : "Upload your first .glb or .gltf file"}
          </p>
          {!hasActiveFilters && (
            <Button className="mt-4" onClick={() => setShowUploader(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Upload Asset
            </Button>
          )}
        </div>
      )}

      {!loading && assets.length > 0 && viewMode === "grid" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {assets.map((asset: Asset3DRecord) => (
            <Asset3DCard
              key={asset.id}
              asset={asset}
              onPreview={setPreviewAsset}
              onEdit={setEditAsset}
              onDelete={(a: Asset3DRecord) => void handleDelete(a)}
              isDeleting={deleteMutation.isPending && deleteMutation.variables === asset.id}
            />
          ))}
        </div>
      )}

      {!loading && assets.length > 0 && viewMode === "list" && (
        <Table className="text-sm text-foreground">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden sm:table-cell">Category</TableHead>
              <TableHead className="hidden md:table-cell">Tags</TableHead>
              <TableHead className="hidden lg:table-cell">Size</TableHead>
              <TableHead className="hidden lg:table-cell">Date</TableHead>
              <TableHead className="w-36 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.map((asset: Asset3DRecord) => (
              <TableRow key={asset.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-border bg-muted/40"
                      onClick={() => setPreviewAsset(asset)}
                    >
                      <Box className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="text-sm font-medium text-foreground truncate">
                      {asset.name || asset.filename}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {asset.category ? (
                    <span className="rounded bg-blue-500/10 px-2 py-0.5 text-xs text-blue-300">
                      {asset.category}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {asset.tags.slice(0, 2).map((tag: string) => (
                      <span
                        key={tag}
                        className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                    {asset.tags.length > 2 && (
                      <span className="text-xs text-muted-foreground">
                        +{asset.tags.length - 2}
                      </span>
                    )}
                    {asset.tags.length === 0 && (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell text-muted-foreground">
                  {formatFileSize(asset.size)}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-muted-foreground">
                  {formatDate(asset.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPreviewAsset(asset)}>
                      Preview
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setEditAsset(asset)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300"
                      onClick={() => void handleDelete(asset)}
                      disabled={deleteMutation.isPending && deleteMutation.variables === asset.id}
                    >
                      {deleteMutation.isPending && deleteMutation.variables === asset.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Delete"
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {previewAsset && (
        <Asset3DPreviewModal
          open={true}
          onClose={() => setPreviewAsset(null)}
          asset={previewAsset}
        />
      )}

      {editAsset && (
        <Asset3DEditModal
          open={true}
          onClose={() => setEditAsset(null)}
          asset={editAsset}
          onSave={handleEdit}
          existingCategories={categories}
          existingTags={allTags}
        />
      )}
    </ListPanel>
  );
}