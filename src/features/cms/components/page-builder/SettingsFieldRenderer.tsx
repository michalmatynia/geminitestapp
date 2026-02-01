"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import NextImage from "next/image";
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  RadioGroup,
  RadioGroupItem,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  useToast,
} from "@/shared/ui";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, FolderOpen, Link2, Search } from "lucide-react";
import type { SettingsField, SettingsFieldOption } from "../../types/page-builder";
import { useCmsSlugs } from "../../hooks/useCmsQueries";
import { useCmsDomainSelection } from "../../hooks/useCmsDomainSelection";
import type { Slug } from "../../types";
import { MediaLibraryPanel } from "./MediaLibraryPanel";
import { useThemeSettings } from "./ThemeSettingsContext";
import type { ColorScheme } from "@/features/cms/types/theme-settings";
import type { ImageFileRecord } from "@/shared/types/files";

const FONT_FAMILY_OPTIONS: SettingsFieldOption[] = [
  { label: "Inter", value: "Inter, sans-serif" },
  { label: "Bebas Neue", value: "'Bebas Neue', sans-serif" },
  { label: "Space Grotesk", value: "'Space Grotesk', sans-serif" },
  { label: "Manrope", value: "Manrope, sans-serif" },
  { label: "Outfit", value: "Outfit, sans-serif" },
  { label: "Plus Jakarta Sans", value: "'Plus Jakarta Sans', sans-serif" },
  { label: "DM Sans", value: "'DM Sans', sans-serif" },
  { label: "Sora", value: "Sora, sans-serif" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
  { label: "Verdana", value: "Verdana, sans-serif" },
  { label: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
  { label: "Palatino", value: "'Palatino Linotype', serif" },
  { label: "System UI", value: "system-ui, sans-serif" },
];

const FONT_WEIGHT_OPTIONS: SettingsFieldOption[] = [
  { label: "100 – Thin", value: "100" },
  { label: "200 – Extra Light", value: "200" },
  { label: "300 – Light", value: "300" },
  { label: "400 – Normal", value: "400" },
  { label: "500 – Medium", value: "500" },
  { label: "600 – Semi Bold", value: "600" },
  { label: "700 – Bold", value: "700" },
  { label: "800 – Extra Bold", value: "800" },
  { label: "900 – Black", value: "900" },
];

const BORDER_STYLE_OPTIONS: SettingsFieldOption[] = [
  { label: "Solid", value: "solid" },
  { label: "Dashed", value: "dashed" },
  { label: "Dotted", value: "dotted" },
  { label: "None", value: "none" },
];

const BG_TYPE_OPTIONS: SettingsFieldOption[] = [
  { label: "Solid", value: "solid" },
  { label: "Gradient", value: "gradient" },
  { label: "Image", value: "image" },
];

const COLOR_SCHEME_OPTIONS: SettingsFieldOption[] = [
  { label: "Scheme 1", value: "scheme-1" },
  { label: "Scheme 2", value: "scheme-2" },
  { label: "Scheme 3", value: "scheme-3" },
  { label: "Scheme 4", value: "scheme-4" },
  { label: "Scheme 5", value: "scheme-5" },
];

const MAX_IMAGE_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const readUploadError = async (res: Response): Promise<string> => {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) return data.error;
    } catch {
      // Fall back to text.
    }
  }
  try {
    const text = await res.text();
    if (text.trim().length > 0) return text;
  } catch {
    // ignore
  }
  return `Upload failed (${res.status})`;
};

interface SettingsFieldRendererProps {
  field: SettingsField;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
}

export function SettingsFieldRenderer({
  field,
  value,
  onChange,
}: SettingsFieldRendererProps): React.ReactNode {
  const { theme } = useThemeSettings();
  const isDisabled = Boolean(field.disabled);
  const colorSchemeOptions = useMemo<SettingsFieldOption[]>((): SettingsFieldOption[] => {
    const baseOptions =
      theme.colorSchemes.length === 0
        ? COLOR_SCHEME_OPTIONS
        : theme.colorSchemes.map((scheme: ColorScheme) => ({
            label: scheme.name || scheme.id,
            value: scheme.id,
          }));
    const extraOptions = field.options
      ? field.options.filter((opt: SettingsFieldOption) => !baseOptions.some((base: SettingsFieldOption) => base.value === opt.value))
      : [];
    return [...extraOptions, ...baseOptions];
  }, [field.options, theme.colorSchemes]);
  const handleChange = useCallback(
    (newValue: unknown): void => {
      onChange(field.key, newValue);
    },
    [field.key, onChange]
  );

  const [mediaOpen, setMediaOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const imageValue = typeof value === "string" ? value : "";

  const uploadSingleImage = async (file: File): Promise<ImageFileRecord> => {
    if (file.size > MAX_IMAGE_FILE_SIZE) {
      throw new Error("File exceeds 10MB limit");
    }
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/cms/media", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      throw new Error(await readUploadError(res));
    }
    return (await res.json()) as ImageFileRecord;
  };

  const handleUploadImage = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = event.target.files;
    event.target.value = "";
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const uploaded = await uploadSingleImage(file);
      handleChange(uploaded.filepath ?? "");
      toast("Upload complete.", { variant: "success" });
      await queryClient.invalidateQueries({ queryKey: ["files"] });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      toast(message, { variant: "error" });
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {field.label}
      </Label>

      {field.type === "text" && (
        <Input
          value={(value as string) ?? ""}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void => handleChange(e.target.value)}
          className="text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={isDisabled}
        />
      )}

      {field.type === "link" && (
        <LinkField value={(value as string) ?? ""} onChange={handleChange} />
      )}

      {field.type === "number" && (
        <Input
          type="number"
          value={(value as number) ?? 0}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void => handleChange(Number(e.target.value))}
          className="text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={isDisabled}
        />
      )}

      {field.type === "select" && (
        <Select
          value={(value as string) ?? ""}
          onValueChange={(v: string): void => handleChange(v)}
        >
          <SelectTrigger className="w-full text-sm" disabled={isDisabled}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((opt: SettingsFieldOption) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {field.type === "alignment" && (
        <div className="grid grid-cols-3 gap-2">
          {(field.options ?? [
            { label: "Left", value: "left" },
            { label: "Center", value: "center" },
            { label: "Right", value: "right" },
          ]).map((opt: SettingsFieldOption) => {
            const currentValue = (value as string) ?? field.options?.[0]?.value ?? "left";
            const isActive = currentValue === opt.value;
            return (
              <Button
                key={opt.value}
                type="button"
                variant="outline"
                size="sm"
                aria-pressed={isActive}
                className={`w-full justify-center ${isActive ? "border-primary/60 bg-primary/10 text-primary" : "border-foreground/20"}`}
                onClick={(): void => handleChange(opt.value)}
                disabled={isDisabled}
              >
                {opt.label}
              </Button>
            );
          })}
        </div>
      )}

      {field.type === "radio" && (
        <RadioGroup
          value={(value as string) ?? ""}
          onValueChange={(v: string): void => handleChange(v)}
          className="space-y-1"
        >
          {(field.options ?? []).map((opt: SettingsFieldOption) => (
            <div key={opt.value} className="flex items-center gap-2">
              <RadioGroupItem value={opt.value} id={`${field.key}-${opt.value}`} disabled={isDisabled} />
              <Label htmlFor={`${field.key}-${opt.value}`} className="text-sm text-gray-300 cursor-pointer">
                {opt.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      )}

      {field.type === "image" && (
        <div className="space-y-2">
          <div className="flex h-24 items-center justify-center overflow-hidden rounded border border-dashed border-border/50 bg-gray-800/30 relative">
            {imageValue ? (
              <NextImage src={imageValue} alt="Selected" className="object-cover" fill unoptimized />
            ) : (
              <span className="text-xs text-gray-500">No image</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-xs"
              onClick={(): void => fileInputRef.current?.click()}
              disabled={uploadingImage}
            >
              <Upload className="mr-1.5 size-3" />
              {uploadingImage ? "Uploading..." : imageValue ? "Replace image" : "Upload image"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => { void handleUploadImage(e); }}
            />
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-xs"
              onClick={(): void => setMediaOpen(true)}
            >
              <FolderOpen className="mr-1.5 size-3" />
              Browse
            </Button>
          </div>
          {imageValue ? (
            <Button
              size="sm"
              variant="ghost"
              className="w-full text-xs text-gray-400 hover:text-gray-200"
              onClick={(): void => handleChange("")}
            >
              Clear image
            </Button>
          ) : null}
          <MediaLibraryPanel
            open={mediaOpen}
            onOpenChange={setMediaOpen}
            selectionMode="single"
            onSelect={(filepaths: string[]): void => handleChange(filepaths[0] ?? "")}
          />
        </div>
      )}

      {field.type === "range" && (
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={field.min ?? 1}
            max={field.max ?? 12}
            value={(value as number) ?? field.min ?? 1}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => handleChange(Number(e.target.value))}
            className={`flex-1 accent-blue-500 ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={isDisabled}
          />
          <span className="w-8 text-center text-sm font-medium text-gray-300">
            {(value as number) ?? field.min ?? 1}
          </span>
        </div>
      )}

      {field.type === "color-scheme" && (
        <Select
          value={(value as string) ?? "scheme-1"}
          onValueChange={(v: string): void => handleChange(v)}
        >
          <SelectTrigger className="w-full text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {colorSchemeOptions.map((opt: SettingsFieldOption) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {field.type === "color" && (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={(value as string) ?? "#ffffff"}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => handleChange(e.target.value)}
            className="h-8 w-10 cursor-pointer rounded border border-border/50 bg-transparent p-0.5"
          />
          <Input
            value={(value as string) ?? "#ffffff"}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => handleChange(e.target.value)}
            className="flex-1 text-sm font-mono"
            maxLength={7}
          />
        </div>
      )}

      {field.type === "font-family" && (
        ((): React.ReactNode => {
          const fallback =
            (typeof field.defaultValue === "string" && field.defaultValue.trim().length > 0
              ? field.defaultValue
              : theme.bodyFont) || "Inter, sans-serif";
          const resolvedValue =
            typeof value === "string" && value.trim().length > 0 ? value : fallback;
          return (
        <Select
          value={resolvedValue}
          onValueChange={(v: string): void => handleChange(v)}
        >
          <SelectTrigger className="w-full text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_FAMILY_OPTIONS.map((opt: SettingsFieldOption) => (
              <SelectItem key={opt.value} value={opt.value}>
                <span style={{ fontFamily: opt.value }}>{opt.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
          );
        })()
      )}

      {field.type === "font-weight" && (
        <Select
          value={String((value as string | number) ?? "400")}
          onValueChange={(v: string): void => handleChange(v)}
        >
          <SelectTrigger className="w-full text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_WEIGHT_OPTIONS.map((opt: SettingsFieldOption) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {field.type === "spacing" && (
        <SpacingField value={value} onChange={handleChange} fieldKey={field.key} />
      )}

      {field.type === "border" && (
        <BorderField value={value} onChange={handleChange} fieldKey={field.key} />
      )}

      {field.type === "shadow" && (
        <ShadowField value={value} onChange={handleChange} fieldKey={field.key} />
      )}

      {field.type === "background" && (
        <BackgroundField value={value} onChange={handleChange} fieldKey={field.key} />
      )}

      {field.type === "typography" && (
        <TypographyField value={value} onChange={handleChange} fieldKey={field.key} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Composite field components
// ---------------------------------------------------------------------------

interface CompositeFieldProps {
  value: unknown;
  onChange: (value: unknown) => void;
  fieldKey: string;
}

function SpacingField({ value, onChange }: CompositeFieldProps): React.ReactNode {
  const spacing = (value as Record<string, number>) ?? { top: 0, right: 0, bottom: 0, left: 0 };
  const update = (side: string, v: number): void => {
    onChange({ ...spacing, [side]: v });
  };
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {(["top", "right", "bottom", "left"] as const).map((side: string) => (
        <div key={side} className="space-y-0.5">
          <span className="text-[10px] text-gray-500 uppercase">{side[0]}</span>
          <Input
            type="number"
            value={spacing[side] ?? 0}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => update(side, Number(e.target.value))}
            className="text-xs h-7 px-1.5"
          />
        </div>
      ))}
    </div>
  );
}

function BorderField({ value, onChange }: CompositeFieldProps): React.ReactNode {
  const border = (value as Record<string, unknown>) ?? { width: 0, style: "solid", color: "#4b5563", radius: 0 };
  const update = (key: string, v: unknown): void => {
    onChange({ ...border, [key]: v });
  };
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-0.5">
          <span className="text-[10px] text-gray-500 uppercase">Width</span>
          <Input
            type="number"
            value={(border.width as number) ?? 0}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => update("width", Number(e.target.value))}
            className="text-xs h-7"
            min={0}
          />
        </div>
        <div className="space-y-0.5">
          <span className="text-[10px] text-gray-500 uppercase">Radius</span>
          <Input
            type="number"
            value={(border.radius as number) ?? 0}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => update("radius", Number(e.target.value))}
            className="text-xs h-7"
            min={0}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-0.5">
          <span className="text-[10px] text-gray-500 uppercase">Style</span>
          <Select
            value={(border.style as string) ?? "solid"}
            onValueChange={(v: string): void => update("style", v)}
          >
            <SelectTrigger className="text-xs h-7">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BORDER_STYLE_OPTIONS.map((opt: SettingsFieldOption) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-0.5">
          <span className="text-[10px] text-gray-500 uppercase">Color</span>
          <div className="flex items-center gap-1">
            <input
              type="color"
              value={(border.color as string) ?? "#4b5563"}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => update("color", e.target.value)}
              className="h-7 w-7 cursor-pointer rounded border border-border/50 bg-transparent p-0.5"
            />
            <Input
              value={(border.color as string) ?? "#4b5563"}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => update("color", e.target.value)}
              className="text-xs h-7 font-mono flex-1"
              maxLength={7}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ShadowField({ value, onChange }: CompositeFieldProps): React.ReactNode {
  const shadow = (value as Record<string, unknown>) ?? { x: 0, y: 2, blur: 4, spread: 0, color: "#00000040" };
  const update = (key: string, v: unknown): void => {
    onChange({ ...shadow, [key]: v });
  };
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-1.5">
        {(["x", "y", "blur", "spread"] as const).map((prop: string) => (
          <div key={prop} className="space-y-0.5">
            <span className="text-[10px] text-gray-500 uppercase">{prop}</span>
            <Input
              type="number"
              value={(shadow[prop] as number) ?? 0}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => update(prop, Number(e.target.value))}
              className="text-xs h-7 px-1.5"
            />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-gray-500 uppercase w-10">Color</span>
        <input
          type="color"
          value={(shadow.color as string)?.slice(0, 7) ?? "#000000"}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void => update("color", e.target.value)}
          className="h-7 w-7 cursor-pointer rounded border border-border/50 bg-transparent p-0.5"
        />
        <Input
          value={(shadow.color as string) ?? "#00000040"}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void => update("color", e.target.value)}
          className="text-xs h-7 font-mono flex-1"
        />
      </div>
    </div>
  );
}

function BackgroundField({ value, onChange }: CompositeFieldProps): React.ReactNode {
  const bg = (value as Record<string, unknown>) ?? { type: "solid", color: "#000000" };
  const bgType = (bg.type as string) ?? "solid";
  const update = (key: string, v: unknown): void => {
    onChange({ ...bg, [key]: v });
  };
  return (
    <div className="space-y-2">
      <Select value={bgType} onValueChange={(v: string): void => update("type", v)}>
        <SelectTrigger className="text-xs h-7">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {BG_TYPE_OPTIONS.map((opt: SettingsFieldOption) => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {bgType === "solid" && (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={(bg.color as string) ?? "#000000"}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => update("color", e.target.value)}
            className="h-8 w-10 cursor-pointer rounded border border-border/50 bg-transparent p-0.5"
          />
          <Input
            value={(bg.color as string) ?? "#000000"}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => update("color", e.target.value)}
            className="flex-1 text-xs font-mono"
            maxLength={7}
          />
        </div>
      )}

      {bgType === "gradient" && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 w-10">From</span>
            <input
              type="color"
              value={(bg.gradientFrom as string) ?? "#000000"}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => update("gradientFrom", e.target.value)}
              className="h-7 w-7 cursor-pointer rounded border border-border/50 bg-transparent p-0.5"
            />
            <Input
              value={(bg.gradientFrom as string) ?? "#000000"}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => update("gradientFrom", e.target.value)}
              className="flex-1 text-xs font-mono"
              maxLength={7}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 w-10">To</span>
            <input
              type="color"
              value={(bg.gradientTo as string) ?? "#ffffff"}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => update("gradientTo", e.target.value)}
              className="h-7 w-7 cursor-pointer rounded border border-border/50 bg-transparent p-0.5"
            />
            <Input
              value={(bg.gradientTo as string) ?? "#ffffff"}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => update("gradientTo", e.target.value)}
              className="flex-1 text-xs font-mono"
              maxLength={7}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 w-10">Angle</span>
            <Input
              type="number"
              value={(bg.gradientAngle as number) ?? 180}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => update("gradientAngle", Number(e.target.value))}
              className="w-20 text-xs h-7"
              min={0}
              max={360}
            />
            <span className="text-xs text-gray-500">deg</span>
          </div>
        </div>
      )}

      {bgType === "image" && (
        <Input
          value={(bg.imageUrl as string) ?? ""}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void => update("imageUrl", e.target.value)}
          placeholder="Image URL..."
          className="text-xs"
        />
      )}
    </div>
  );
}

function TypographyField({ value, onChange }: CompositeFieldProps): React.ReactNode {
  const typo = (value as Record<string, unknown>) ?? {};
  const update = (key: string, v: unknown): void => {
    onChange({ ...typo, [key]: v });
  };
  return (
    <div className="space-y-2">
      <div className="space-y-0.5">
        <span className="text-[10px] text-gray-500 uppercase">Font Family</span>
        <Select
          value={(typo.fontFamily as string) ?? "Inter, sans-serif"}
          onValueChange={(v: string): void => update("fontFamily", v)}
        >
          <SelectTrigger className="text-xs h-7">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_FAMILY_OPTIONS.map((opt: SettingsFieldOption) => (
              <SelectItem key={opt.value} value={opt.value}>
                <span style={{ fontFamily: opt.value }}>{opt.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-0.5">
          <span className="text-[10px] text-gray-500 uppercase">Weight</span>
          <Select
            value={String((typo.fontWeight as string | number) ?? "400")}
            onValueChange={(v: string): void => update("fontWeight", v)}
          >
            <SelectTrigger className="text-xs h-7">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_WEIGHT_OPTIONS.map((opt: SettingsFieldOption) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-0.5">
          <span className="text-[10px] text-gray-500 uppercase">Size (px)</span>
          <Input
            type="number"
            value={(typo.fontSize as number) ?? 16}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => update("fontSize", Number(e.target.value))}
            className="text-xs h-7"
            min={8}
            max={200}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-0.5">
          <span className="text-[10px] text-gray-500 uppercase">Line Height</span>
          <Input
            type="number"
            value={(typo.lineHeight as number) ?? 1.5}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => update("lineHeight", Number(e.target.value))}
            className="text-xs h-7"
            min={0.5}
            max={5}
            step={0.1}
          />
        </div>
        <div className="space-y-0.5">
          <span className="text-[10px] text-gray-500 uppercase">Letter Spacing</span>
          <Input
            type="number"
            value={(typo.letterSpacing as number) ?? 0}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => update("letterSpacing", Number(e.target.value))}
            className="text-xs h-7"
            step={0.5}
          />
        </div>
      </div>
      <div className="space-y-0.5">
        <span className="text-[10px] text-gray-500 uppercase">Text Color</span>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={(typo.textColor as string) ?? "#ffffff"}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => update("textColor", e.target.value)}
            className="h-7 w-7 cursor-pointer rounded border border-border/50 bg-transparent p-0.5"
          />
          <Input
            value={(typo.textColor as string) ?? "#ffffff"}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => update("textColor", e.target.value)}
            className="flex-1 text-xs font-mono"
            maxLength={7}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Link field (manual URL + slug picker)
// ---------------------------------------------------------------------------

interface LinkFieldProps {
  value: string;
  onChange: (value: string) => void;
}

function LinkField({ value, onChange }: LinkFieldProps): React.ReactNode {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { activeDomainId } = useCmsDomainSelection();
  const slugsQuery = useCmsSlugs(activeDomainId);
  const slugs = slugsQuery.data ?? [];
  const filtered = slugs.filter((slug: Slug) =>
    slug.slug.toLowerCase().includes(query.trim().toLowerCase())
  );

  const handleSelect = (slug: Slug): void => {
    onChange(`/${slug.slug}`);
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void => onChange(e.target.value)}
          className="pr-10 text-sm"
          placeholder="https://example.com or /your-slug"
        />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1 h-7 w-7 text-gray-400 hover:text-gray-200"
              title="Pick from slugs"
            >
              <Link2 className="size-3.5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Select a slug</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-gray-500" />
                <Input
                  value={query}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setQuery(e.target.value)}
                  className="pl-8 text-sm"
                  placeholder="Search slugs..."
                />
              </div>
              <div className="max-h-64 space-y-1 overflow-y-auto rounded border border-border/50 p-2">
                {slugsQuery.isLoading && (
                  <div className="p-2 text-xs text-gray-500">Loading slugs...</div>
                )}
                {!slugsQuery.isLoading && filtered.length === 0 && (
                  <div className="p-2 text-xs text-gray-500">No slugs found.</div>
                )}
                {filtered.map((slug: Slug) => (
                  <button
                    key={slug.id}
                    type="button"
                    onClick={(): void => handleSelect(slug)}
                    className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm text-gray-200 hover:bg-foreground/5"
                  >
                    <span>/{slug.slug}</span>
                    {slug.isDefault ? (
                      <span className="text-[10px] uppercase tracking-wide text-gray-500">
                        Default
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {value ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="w-full text-xs text-gray-400 hover:text-gray-200"
          onClick={(): void => onChange("")}
        >
          Clear link
        </Button>
      ) : null}
    </div>
  );
}
