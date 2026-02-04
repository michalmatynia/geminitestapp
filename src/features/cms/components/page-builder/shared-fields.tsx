"use client";

import React, { useRef, useState } from "react";
import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Checkbox, Button, SharedModal, useToast } from "@/shared/ui";
import { cn } from "@/shared/utils";
import NextImage from "next/image";
import { Upload, FolderOpen, Loader2 } from "lucide-react";
import { MediaLibraryPanel } from "./MediaLibraryPanel";
import { useUploadCmsMedia } from "../../hooks/useCmsQueries";
import { useAssets3D, useAsset3DCategories, useAsset3DTags, useAsset3DById } from "@/features/viewer3d/hooks/useAsset3dQueries";
import type { Asset3DListFilters, Asset3DRecord } from "@/features/viewer3d/types";
import { Viewer3D } from "@/features/viewer3d";
import { Asset3DPreviewModal } from "@/features/viewer3d";

interface FieldProps<T> {
  label?: string;
  value: T;
  onChange: (value: T) => void;
  className?: string;
  disabled?: boolean;
}

export function ImagePickerField({
  label,
  value,
  onChange,
  disabled,
}: FieldProps<string>): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadMutation = useUploadCmsMedia();
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const result = await uploadMutation.mutateAsync(file);
      if (result.filepath) {
        onChange(result.filepath);
        toast("Image uploaded successfully.", { variant: "success" });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      toast(message, { variant: "error" });
    }
  };

  const isUploading = uploadMutation.isPending;

  return (
    <div className="space-y-2">
      {label && (
        <Label className="text-[10px] uppercase tracking-wider text-gray-500">
          {label}
        </Label>
      )}
      <div className="relative flex h-28 items-center justify-center overflow-hidden rounded border border-dashed border-border/50 bg-gray-800/30">
        {value ? (
          <NextImage
            src={value}
            alt="Selected"
            fill
            sizes="320px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <span className="text-xs text-gray-500">No image</span>
        )}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Loader2 className="size-6 animate-spin text-white" />
          </div>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e: React.ChangeEvent<HTMLInputElement>): void => { void handleFileUpload(e); }}
      />
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="text-xs"
          onClick={(): void => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
        >
          <Upload className="mr-1.5 size-3" />
          {value ? "Replace" : "Upload"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="text-xs"
          onClick={(): void => setOpen(true)}
          disabled={disabled || isUploading}
        >
          <FolderOpen className="mr-1.5 size-3" />
          Browse
        </Button>
      </div>
      {value ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="w-full text-xs text-gray-400 hover:text-gray-200"
          onClick={(): void => onChange("")}
          disabled={disabled || isUploading}
        >
          Clear image
        </Button>
      ) : null}
      <MediaLibraryPanel
        open={open}
        onOpenChange={setOpen}
        selectionMode="single"
        onSelect={(filepaths: string[]): void => onChange(filepaths[0] ?? "")}
      />
    </div>
  );
}

export function Asset3DPickerField({
  label,
  value,
  onChange,
  disabled,
}: FieldProps<string>): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<Asset3DRecord | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("__all__");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isPublicOnly, setIsPublicOnly] = useState<boolean>(false);

  const filters: Asset3DListFilters = {
    search: search.trim() || null,
    category: category === "__all__" ? null : category,
    tags: selectedTags.length > 0 ? selectedTags : [],
    ...(isPublicOnly ? { isPublic: true } : {}),
  };
  const assetsQuery = useAssets3D(filters);
  const categoriesQuery = useAsset3DCategories();
  const tagsQuery = useAsset3DTags();
  const selectedAssetQuery = useAsset3DById(value || null);

  const assets = assetsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const tags = tagsQuery.data ?? [];
  const selectedAsset = selectedAssetQuery.data ?? null;
  const modelUrl = selectedAsset ? `/api/assets3d/${selectedAsset.id}/file` : null;

  return (
    <div className="space-y-2">
      {label && (
        <Label className="text-[10px] uppercase tracking-wider text-gray-500">
          {label}
        </Label>
      )}
      <div className="relative flex h-40 items-center justify-center overflow-hidden rounded border border-dashed border-border/50 bg-gray-800/30">
        {selectedAsset && modelUrl ? (
          <Viewer3D
            modelUrl={modelUrl}
            backgroundColor="#111827"
            autoRotate
            autoRotateSpeed={2}
            environment="studio"
            lighting="studio"
            lightIntensity={1}
            enableShadows
            enableBloom={false}
            bloomIntensity={0.5}
            exposure={1}
            showGround={false}
            enableContactShadows
            enableVignette={false}
            autoFit
            presentationMode={false}
            className="h-full w-full"
          />
        ) : (
          <span className="text-xs text-gray-500">No 3D asset selected</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="text-xs"
          onClick={(): void => setOpen(true)}
          disabled={disabled}
        >
          Browse 3D assets
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="text-xs"
          onClick={(): void => selectedAsset && setPreviewAsset(selectedAsset)}
          disabled={disabled || !selectedAsset}
        >
          Preview
        </Button>
      </div>
      {value ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="w-full text-xs text-gray-400 hover:text-gray-200"
          onClick={(): void => onChange("")}
          disabled={disabled}
        >
          Clear asset
        </Button>
      ) : null}

      <SharedModal open={open} onClose={() => setOpen(false)} title="Select 3D asset" size="xl">
        <div className="space-y-4 text-sm text-gray-200">
          <div className="grid gap-2 md:grid-cols-[1fr_200px_200px]">
            <Input
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              placeholder="Search assets..."
              className="h-9"
            />
            <Select
              value={category}
              onValueChange={(value: string) => setCategory(value)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All categories</SelectItem>
                {categories.map((cat: string) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-xs text-gray-300">
              <Checkbox
                checked={isPublicOnly}
                onCheckedChange={(value: boolean): void => setIsPublicOnly(Boolean(value))}
              />
              Public only
            </label>
          </div>

          {tags.length > 0 ? (
            <div className="rounded border border-border/60 bg-card/40 p-2">
              <div className="text-[11px] text-gray-400">Tags</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {tags.map((tag: string) => {
                  const active = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      className={cn(
                        "rounded-full border px-2 py-1 text-[11px]",
                        active
                          ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200"
                          : "border-border/60 text-gray-300 hover:border-emerald-500/40"
                      )}
                      onClick={() => {
                        setSelectedTags((prev) =>
                          prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                        );
                      }}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-[1fr_320px]">
            <div className="space-y-2">
              {assetsQuery.isLoading ? (
                <div className="text-xs text-gray-400">Loading assets...</div>
              ) : assets.length === 0 ? (
                <div className="text-xs text-gray-400">No 3D assets found.</div>
              ) : (
                <div className="space-y-2">
                  {assets.map((asset) => (
                    <div key={asset.id} className="rounded border border-border/60 bg-card/50 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm text-gray-100">{asset.name || asset.filename}</div>
                          <div className="text-[11px] text-gray-400">
                            {asset.category ? `${asset.category} • ` : ""}
                            {asset.tags?.length ? asset.tags.join(", ") : "No tags"}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setPreviewAsset(asset)}
                          >
                            Preview
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              onChange(asset.id);
                              setOpen(false);
                            }}
                          >
                            Select
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded border border-border/60 bg-card/40 p-2">
              <div className="text-[11px] text-gray-400">Preview</div>
              {previewAsset ? (
                <div className="mt-2 h-56">
                  <Viewer3D
                    modelUrl={`/api/assets3d/${previewAsset.id}/file`}
                    backgroundColor="#111827"
                    autoRotate
                    autoRotateSpeed={2}
                    environment="studio"
                    lighting="studio"
                    lightIntensity={1}
                    enableShadows
                    enableBloom={false}
                    bloomIntensity={0.5}
                    exposure={1}
                    showGround={false}
                    enableContactShadows
                    enableVignette={false}
                    autoFit
                    presentationMode={false}
                    className="h-full w-full"
                  />
                </div>
              ) : (
                <div className="mt-2 text-xs text-gray-500">Pick an asset to preview.</div>
              )}
            </div>
          </div>
        </div>
      </SharedModal>

      {previewAsset ? (
        <Asset3DPreviewModal
          open={Boolean(previewAsset)}
          onClose={() => setPreviewAsset(null)}
          asset={previewAsset}
        />
      ) : null}
    </div>
  );
}

export function ColorField({
  label,
  value,
  onChange,
  className,
  disabled,
}: FieldProps<string>): React.JSX.Element {
  return (
    <div className={cn("space-y-1", className)}>
      {label && (
        <Label className="text-[10px] uppercase tracking-wider text-gray-500">
          {label}
        </Label>
      )}
      <div className="flex items-center gap-2">
        <label className={cn(
          "relative flex size-7 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded border border-border/50",
          disabled && "cursor-not-allowed opacity-50"
        )}>
          <input
            type="color"
            value={value || "#ffffff"}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => onChange(e.target.value)}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
            disabled={disabled}
          />
          <div
            className="size-full rounded"
            style={{ backgroundColor: value || "#ffffff" }}
          />
        </label>
        <Input
          value={value || "#ffffff"}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void => onChange(e.target.value)}
          className="h-7 flex-1 bg-gray-800/40 text-xs font-mono"
          maxLength={7}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  className,
  disabled,
  suffix,
  min,
  max,
  step,
}: FieldProps<number> & { suffix?: string; min?: number; max?: number; step?: number }): React.JSX.Element {
  return (
    <div className={cn("space-y-1", className)}>
      {label && (
        <Label className="text-[10px] uppercase tracking-wider text-gray-500">
          {label}
        </Label>
      )}
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          value={value ?? 0}
          min={min}
          max={max}
          step={step}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void => onChange(Number(e.target.value))}
          className="h-7 flex-1 bg-gray-800/40 text-xs"
          disabled={disabled}
        />
        {suffix && <span className="text-[10px] text-gray-500">{suffix}</span>}
      </div>
    </div>
  );
}

export function RangeField({
  label,
  value,
  onChange,
  className,
  disabled,
  min,
  max,
  step,
  suffix,
}: FieldProps<number> & { min: number; max: number; step?: number; suffix?: string }): React.JSX.Element {
  const safeValue = Number.isFinite(value) ? value : min;
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center justify-between">
        {label && (
          <Label className="text-[10px] uppercase tracking-wider text-gray-500">
            {label}
          </Label>
        )}
        <span className="text-[11px] text-gray-300">
          {safeValue}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={safeValue}
        onChange={(e: React.ChangeEvent<HTMLInputElement>): void => onChange(Number(e.target.value))}
        className={cn("w-full accent-blue-500", disabled && "opacity-50 cursor-not-allowed")}
        disabled={disabled}
      />
    </div>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  className,
  disabled,
  placeholder,
}: FieldProps<string> & { options: { label: string; value: string }[]; placeholder?: string }): React.JSX.Element {
  return (
    <div className={cn("space-y-1", className)}>
      {label && (
        <Label className="text-[10px] uppercase tracking-wider text-gray-500">
          {label}
        </Label>
      )}
      <Select value={value} onValueChange={onChange} disabled={disabled || false}>
        <SelectTrigger className="h-7 bg-gray-800/40 text-xs">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt: { label: string; value: string }): React.JSX.Element => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function CheckboxField({
  label,
  checked,
  onChange,
  className,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
}): React.JSX.Element {
  return (
    <label className={cn("flex items-center gap-2 cursor-pointer", disabled && "cursor-not-allowed opacity-50", className)}>
      <Checkbox
        checked={checked}
        onCheckedChange={(v: boolean | "indeterminate"): void => onChange(v === true)}
        disabled={disabled}
      />
      <span className="text-xs text-gray-300">{label}</span>
    </label>
  );
}

export function TextField({
  label,
  value,
  onChange,
  className,
  disabled,
  placeholder,
}: FieldProps<string> & { placeholder?: string }): React.JSX.Element {
  return (
    <div className={cn("space-y-1", className)}>
      {label && (
        <Label className="text-[10px] uppercase tracking-wider text-gray-500">
          {label}
        </Label>
      )}
      <Input
        value={value || ""}
        onChange={(e: React.ChangeEvent<HTMLInputElement>): void => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-7 bg-gray-800/40 text-xs"
        disabled={disabled}
      />
    </div>
  );
}
