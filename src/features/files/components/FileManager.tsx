"use client";
import { FilePreviewModal, Button, useToast, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Tabs, TabsContent, TabsList, TabsTrigger, AppModal } from "@/shared/ui";
import Image from "next/image";
import Link from "next/link";
import { useState, useMemo } from "react";
import type { ImageFileSelection } from "@/shared/types/files";
import type { ExpandedImageFile } from "@/features/products";
import { useFiles, useDeleteFile, useUpdateFileTags } from "@/features/files/hooks/useFiles";
import { useAssets3D } from "@/features/viewer3d/hooks/useAsset3dQueries";
import type { Asset3DRecord } from "@/features/viewer3d/types";

interface FileManagerProps {
  onSelectFile?: (files: ImageFileSelection[]) => void;
  mode?: "view" | "select";
  showFileManager?: boolean;
  selectionMode?: "single" | "multiple";
  autoConfirmSelection?: boolean;
  showFolderFilter?: boolean;
  defaultFolder?: string;
  showBulkActions?: boolean;
  showTagSearch?: boolean;
}

// This component provides a UI for browsing and selecting existing image files.
// It fetches the list of files from the API and allows the user to filter them.
const normalizeTag = (tag: string): string => tag.trim().toLowerCase();
const parseTagInput = (input: string): string[] => {
  const raw = input.split(",").map(normalizeTag).filter(Boolean);
  return Array.from(new Set(raw));
};

export default function FileManager({
  onSelectFile,
  mode = "select",
  selectionMode = "multiple",
  autoConfirmSelection = false,
  showFolderFilter = false,
  defaultFolder,
  showBulkActions = false,
  showTagSearch = false,
}: FileManagerProps): React.JSX.Element {
  const [filenameSearch, setFilenameSearch] = useState("");
  const [productNameSearch, setProductNameSearch] = useState("");
  const [tagSearch, setTagSearch] = useState("");
  const [bulkTagInput, setBulkTagInput] = useState("");
  const [bulkTagMode, setBulkTagMode] = useState<"add" | "replace">("add");
  const [localFolderFilter, setLocalFolderFilter] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<ExpandedImageFile | null>(null);
  const [previewAsset, setPreviewAsset] = useState<Asset3DRecord | null>(null);
  const [activeTab, setActiveTab] = useState<"files" | "assets3d">("files");
  const { toast } = useToast();
  const deleteFileMutation = useDeleteFile();
  const updateTagsMutation = useUpdateFileTags();

  const enableTagSearch = showTagSearch || showBulkActions;
  const tagSearchList = useMemo((): string[] => parseTagInput(tagSearch), [tagSearch]);

  const queryParams = useMemo((): string => {
    const query = new URLSearchParams();
    if (filenameSearch) {
      query.append("filename", filenameSearch);
    }
    if (productNameSearch) {
      query.append("productName", productNameSearch);
    }
    if (enableTagSearch && tagSearchList.length > 0) {
      query.append("tags", tagSearchList.join(","));
    }
    return query.toString();
  }, [filenameSearch, productNameSearch, tagSearchList, enableTagSearch]);

  const { data: files = [] } = useFiles(queryParams);
  const assetFilters = useMemo(() => ({
    search: filenameSearch || null,
    tags: enableTagSearch && tagSearchList.length > 0 ? tagSearchList : undefined,
  }), [enableTagSearch, filenameSearch, tagSearchList]);
  const { data: assets3d = [] } = useAssets3D(assetFilters);

  const resolveFolder = (filepath: string): string => {
    const clean = filepath.replace(/^\/+/, "");
    const parts = clean.split("/");
    if (parts.length === 0) return "uploads";
    if (parts[0] === "uploads") {
      return parts[1] ?? "uploads";
    }
    return parts[0] || "uploads";
  };

  const folderOptions = useMemo((): string[] => {
    const folders = new Set<string>();
    files.forEach((file: ExpandedImageFile) => {
      if (file.filepath) {
        folders.add(resolveFolder(file.filepath));
      }
    });
    return ["all", ...Array.from(folders).sort()];
  }, [files]);

  const initialFolderFilter = useMemo((): string => {
    if (defaultFolder && folderOptions.includes(defaultFolder)) {
      return defaultFolder;
    }
    return "all";
  }, [defaultFolder, folderOptions]);

  const folderFilter = localFolderFilter ?? initialFolderFilter;

  const tagOptions = useMemo((): string[] => {
    const tags = new Set<string>();
    files.forEach((file: ExpandedImageFile) => {
      (file.tags ?? []).forEach((tag: string) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [files]);

  const filteredFiles = useMemo((): ExpandedImageFile[] => {
    if (folderFilter === "all") return files;
    return files.filter((file: ExpandedImageFile) => resolveFolder(file.filepath) === folderFilter);
  }, [files, folderFilter]);

  const fileById = useMemo((): Map<string, ExpandedImageFile> => {
    return new Map(files.map((file: ExpandedImageFile) => [file.id, file]));
  }, [files]);

  const [selectedFiles, setSelectedFiles] = useState<ImageFileSelection[]>([]);

  const handleClick = (file: ExpandedImageFile): void => {
    if (mode === "select") {
      handleToggleSelect({ id: file.id, filepath: file.filepath });
    } else {
      setPreviewFile(file);
    }
  };

  // This function toggles the selection of a file.
  const handleToggleSelect = (file: ImageFileSelection): void => {
    setSelectedFiles((prev: ImageFileSelection[]) =>
      selectionMode === "single"
        ? [file]
        : prev.some((f: ImageFileSelection) => f.id === file.id)
        ? prev.filter((f: ImageFileSelection) => f.id !== file.id)
        : [...prev, file]
    );
    if (selectionMode === "single" && autoConfirmSelection && onSelectFile) {
      onSelectFile([file]);
    }
  };

  // This function is called when the user confirms their selection.
  // It calls the onSelectFile callback with the selected files.
  const handleConfirmSelection = (): void => {
    if (onSelectFile) {
      onSelectFile(selectedFiles);
    }
  };

  const handleSelectAll = (): void => {
    const toSelect = filteredFiles.map((file: ExpandedImageFile) => ({ id: file.id, filepath: file.filepath }));
    setSelectedFiles(toSelect);
  };

  const handleClearSelection = (): void => {
    setSelectedFiles([]);
  };

  const handleDeleteSelected = async (): Promise<void> => {
    if (selectedFiles.length === 0) return;
    if (!confirm(`Delete ${selectedFiles.length} selected file(s)?`)) return;
    try {
      for (const file of selectedFiles) {
        await deleteFileMutation.mutateAsync(file.id);
      }
      setSelectedFiles([]);
      toast("Selected files deleted.", { variant: "success" });
    } catch (error) {
      console.error("Failed to delete files:", error);
      toast("Failed to delete selected files.", { variant: "error" });
    }
  };

  const handleApplyTags = async (): Promise<void> => {
    const tags = parseTagInput(bulkTagInput);
    if (selectedFiles.length === 0) {
      toast("Select at least one file to tag.", { variant: "info" });
      return;
    }
    if (tags.length === 0) {
      toast("Enter at least one tag.", { variant: "info" });
      return;
    }
    try {
      await Promise.all(
        selectedFiles.map((file: ImageFileSelection) => {
          const existing = fileById.get(file.id)?.tags ?? [];
          const nextTags = bulkTagMode === "replace"
            ? tags
            : Array.from(new Set([...existing, ...tags]));
          return updateTagsMutation.mutateAsync({ id: file.id, tags: nextTags });
        })
      );
      toast("Tags updated.", { variant: "success" });
      setBulkTagInput("");
    } catch (error) {
      console.error("Failed to update tags:", error);
      toast("Failed to update tags.", { variant: "error" });
    }
  };

  // This function sends a DELETE request to the API to delete a file.
  const handleDelete = async (fileId: string): Promise<void> => {
    if (confirm("Are you sure you want to delete this file?")) {
      try {
        await deleteFileMutation.mutateAsync(fileId);
        toast("File deleted successfully.", { variant: "success" });
      } catch (error) {
        console.error("Failed to delete file:", error);
        toast("Failed to delete file.", { variant: "error" });
      }
    }
  };

  const showTabs = mode === "view";

  return (
    <div className="p-4 bg-gray-900 text-white">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">File Manager</h2>
        {mode === "select" && onSelectFile && !autoConfirmSelection && (
          <Button onClick={handleConfirmSelection}>
            Confirm Selection ({selectedFiles.length})
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-3 mb-4">
        <Input
          type="text"
          placeholder="Search by filename"
          value={filenameSearch}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setFilenameSearch(e.target.value)}
          className="w-full md:w-64 p-2 bg-gray-800 rounded"
        />
        <Input
          type="text"
          placeholder="Search by product name"
          value={productNameSearch}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setProductNameSearch(e.target.value)}
          className="w-full md:w-64 p-2 bg-gray-800 rounded"
        />
        {enableTagSearch && (
          <Input
            type="text"
            placeholder="Search by tags (comma-separated)"
            value={tagSearch}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setTagSearch(e.target.value)}
            className="w-full md:w-64 p-2 bg-gray-800 rounded"
          />
        )}
        {showFolderFilter && (
          <Select value={folderFilter} onValueChange={(value: string): void => setLocalFolderFilter(value)}>
            <SelectTrigger className="w-full md:w-48 text-sm">
              <SelectValue placeholder="All folders" />
            </SelectTrigger>
            <SelectContent>
              {folderOptions.map((folder: string) => (
                <SelectItem key={folder} value={folder}>
                  {folder === "all" ? "All folders" : folder}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {mode === "select" && selectionMode === "multiple" && showBulkActions && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              Select all
            </Button>
            <Button variant="outline" size="sm" onClick={handleClearSelection}>
              Clear
            </Button>
            <Button variant="destructive" size="sm" onClick={(): void => { void handleDeleteSelected(); }}>
              Delete selected
            </Button>
          </div>
        )}
      </div>
      {(showFolderFilter || (enableTagSearch && tagOptions.length > 0)) && (
        <div className="mb-4 space-y-2">
          {showFolderFilter && (
            <div className="flex flex-wrap gap-2">
              {folderOptions.map((folder: string) => (
                <button
                  key={folder}
                  type="button"
                  onClick={(): void => setLocalFolderFilter(folder)}
                  className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${
                    folderFilter === folder
                      ? "border-blue-500 bg-blue-500/10 text-blue-300"
                      : "border-border/40 bg-gray-900/40 text-gray-400 hover:border-border/60"
                  }`}
                >
                  {folder === "all" ? "All folders" : folder}
                </button>
              ))}
            </div>
          )}
          {enableTagSearch && tagOptions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tagOptions.slice(0, 20).map((tag: string) => (
                <button
                  key={tag}
                  type="button"
                  onClick={(): void => setTagSearch(tag)}
                  className="rounded-full border border-border/40 bg-gray-900/40 px-2.5 py-0.5 text-[10px] text-gray-400 hover:border-border/60"
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {mode === "select" && selectionMode === "multiple" && showBulkActions && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Input
            type="text"
            placeholder="Tags to apply (comma-separated)"
            value={bulkTagInput}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setBulkTagInput(e.target.value)}
            className="w-full md:w-72 p-2 bg-gray-800 rounded"
          />
          <Select value={bulkTagMode} onValueChange={(value: string): void => setBulkTagMode(value as "add" | "replace")}>
            <SelectTrigger className="w-full md:w-32 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="add">Add</SelectItem>
              <SelectItem value="replace">Replace</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={(): void => { void handleApplyTags(); }}
            disabled={updateTagsMutation.isPending}
          >
            {updateTagsMutation.isPending ? "Saving..." : "Apply tags"}
          </Button>
        </div>
      )}
      {showTabs ? (
        <Tabs value={activeTab} onValueChange={(value: string): void => setActiveTab(value as "files" | "assets3d")}>
          <TabsList className="mb-4">
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="assets3d">3D Assets</TabsTrigger>
          </TabsList>
          <TabsContent value="files">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredFiles.map((file: ExpandedImageFile) => (
                <div
                  key={file.id}
                  className={`relative border-2 ${
                    selectedFiles.some((f: ImageFileSelection) => f.id === file.id)
                      ? "border-blue-500"
                      : "border-transparent"
                  }`}
                  onClick={(): void => handleClick(file)}
                >
                  <div className="absolute left-2 top-2 rounded bg-gray-900/80 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gray-300">
                    {resolveFolder(file.filepath)}
                  </div>
                  <Image
                    src={file.filepath}
                    alt={file.filename}
                    width={150}
                    height={150}
                    className="object-cover rounded"
                  />
                  <p className="mt-2 px-2 text-center text-sm whitespace-normal break-words">
                    {file.filename}
                  </p>
                  {(file.tags ?? []).length > 0 && (
                    <div className="mt-1 flex flex-wrap justify-center gap-1 px-2">
                      {(file.tags ?? []).slice(0, 4).map((tag: string) => (
                        <span key={tag} className="rounded-full bg-gray-800/70 px-2 py-0.5 text-[10px] text-gray-400">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="px-2 text-center text-xs text-gray-400">
                    {file.products.map(({ product }: { product: { id: string; name: string } }) => (
                      <Link
                        key={product.id}
                        href={`/admin/products/${product.id}/edit`}
                        className="hover:underline"
                      >
                        {product.name}
                      </Link>
                    ))}
                  </div>
                  <div className="mt-2 flex justify-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e: React.MouseEvent<HTMLButtonElement>): void => {
                        e.stopPropagation();
                        setPreviewFile(file);
                      }}
                    >
                      View
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e: React.MouseEvent<HTMLButtonElement>): void => {
                        e.stopPropagation();
                        void handleDelete(file.id);
                      }}
                    >
                      X
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="assets3d">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {assets3d.map((asset: Asset3DRecord) => (
                <div key={asset.id} className="rounded-md border border-border/60 bg-gray-900/40 p-3">
                  <div className="text-xs uppercase tracking-wide text-gray-400">3D Asset</div>
                  <div className="mt-2 text-sm font-semibold text-white break-words">{asset.name ?? asset.filename}</div>
                  <div className="text-xs text-gray-400 break-words">{asset.filename}</div>
                  {(asset.tags ?? []).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {asset.tags.slice(0, 4).map((tag: string) => (
                        <span key={tag} className="rounded-full bg-gray-800/70 px-2 py-0.5 text-[10px] text-gray-400">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                    <span>{(asset.size / 1024).toFixed(1)} KB</span>
                    {asset.category && <span>{asset.category}</span>}
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(): void => setPreviewAsset(asset)}
                    >
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredFiles.map((file: ExpandedImageFile) => (
            <div
              key={file.id}
              className={`relative border-2 ${
                selectedFiles.some((f: ImageFileSelection) => f.id === file.id) && mode === "select"
                  ? "border-blue-500"
                  : "border-transparent"
              }`}
              onClick={(): void => handleClick(file)}
            >
              <div className="absolute left-2 top-2 rounded bg-gray-900/80 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gray-300">
                {resolveFolder(file.filepath)}
              </div>
              <Image
                src={file.filepath}
                alt={file.filename}
                width={150}
                height={150}
                className="object-cover rounded"
              />
              <p className="mt-2 px-2 text-center text-sm whitespace-normal break-words">
                {file.filename}
              </p>
              {(file.tags ?? []).length > 0 && (
                <div className="mt-1 flex flex-wrap justify-center gap-1 px-2">
                  {(file.tags ?? []).slice(0, 4).map((tag: string) => (
                    <span key={tag} className="rounded-full bg-gray-800/70 px-2 py-0.5 text-[10px] text-gray-400">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="px-2 text-center text-xs text-gray-400">
                {file.products.map(({ product }: { product: { id: string; name: string } }) => (
                  <Link
                    key={product.id}
                    href={`/admin/products/${product.id}/edit`}
                    className="hover:underline"
                  >
                    {product.name}
                  </Link>
                ))}
              </div>
              <div className="mt-2 flex justify-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e: React.MouseEvent<HTMLButtonElement>): void => {
                    e.stopPropagation();
                    setPreviewFile(file);
                  }}
                >
                  View
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={(e: React.MouseEvent<HTMLButtonElement>): void => {
                    e.stopPropagation();
                    void handleDelete(file.id);
                  }}
                >
                  X
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={(): void => setPreviewFile(null)}
        >
          <h3 className="text-xl font-bold mt-8 mb-4">Linked Products</h3>
          <div className="flex flex-wrap gap-2">
            {previewFile.products.map(({ product }: { product: { id: string; name: string } }) => (
              <Link
                key={product.id}
                href={`/admin/products/${product.id}/edit`}
                className="bg-gray-700 text-white px-3 py-1 rounded-full text-sm hover:bg-gray-600"
              >
                {product.name}
              </Link>
            ))}
          </div>
        </FilePreviewModal>
      )}
      {previewAsset && (
        <AppModal
          open={true}
          onOpenChange={(open: boolean): void => {
            if (!open) setPreviewAsset(null);
          }}
          title={previewAsset.name ?? previewAsset.filename}
        >
          <div className="space-y-4 text-sm text-gray-200">
            <div className="space-y-1">
              <div><strong>Filename:</strong> {previewAsset.filename}</div>
              <div><strong>Path:</strong> {previewAsset.filepath}</div>
              <div><strong>MIME Type:</strong> {previewAsset.mimetype}</div>
              <div><strong>Size:</strong> {(previewAsset.size / 1024).toFixed(2)} KB</div>
              <div><strong>Category:</strong> {previewAsset.category ?? "—"}</div>
              <div><strong>Public:</strong> {previewAsset.isPublic ? "Yes" : "No"}</div>
              <div><strong>Added:</strong> {new Date(previewAsset.createdAt).toLocaleString()}</div>
              <div><strong>Modified:</strong> {new Date(previewAsset.updatedAt).toLocaleString()}</div>
              {(previewAsset.tags ?? []).length > 0 && (
                <div><strong>Tags:</strong> {previewAsset.tags.join(", ")}</div>
              )}
            </div>
            {previewAsset.description && (
              <div>
                <strong>Description:</strong>
                <div className="mt-1 whitespace-pre-wrap text-gray-300">{previewAsset.description}</div>
              </div>
            )}
            <div className="rounded-md border border-border/60 bg-black/30 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Metadata
              </div>
              <pre className="mt-2 max-h-56 overflow-auto text-[11px] text-gray-300">
                {JSON.stringify(previewAsset.metadata ?? {}, null, 2)}
              </pre>
            </div>
          </div>
        </AppModal>
      )}
    </div>
  );
}
