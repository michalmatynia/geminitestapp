"use client";

import React, { useCallback } from "react";
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
} from "@/shared/ui";
import { Upload, FolderOpen } from "lucide-react";
import type { SettingsField, SettingsFieldOption } from "../../types/page-builder";

const COLOR_SCHEME_OPTIONS: SettingsFieldOption[] = [
  { label: "Scheme 1", value: "scheme-1" },
  { label: "Scheme 2", value: "scheme-2" },
  { label: "Scheme 3", value: "scheme-3" },
  { label: "Scheme 4", value: "scheme-4" },
  { label: "Scheme 5", value: "scheme-5" },
];

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
  const handleChange = useCallback(
    (newValue: unknown) => {
      onChange(field.key, newValue);
    },
    [field.key, onChange]
  );

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {field.label}
      </Label>

      {field.type === "text" && (
        <Input
          value={(value as string) ?? ""}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(e.target.value)}
          className="text-sm"
        />
      )}

      {field.type === "number" && (
        <Input
          type="number"
          value={(value as number) ?? 0}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(Number(e.target.value))}
          className="text-sm"
        />
      )}

      {field.type === "select" && (
        <Select
          value={(value as string) ?? ""}
          onValueChange={(v: string) => handleChange(v)}
        >
          <SelectTrigger className="w-full text-sm">
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

      {field.type === "radio" && (
        <RadioGroup
          value={(value as string) ?? ""}
          onValueChange={(v: string) => handleChange(v)}
          className="space-y-1"
        >
          {(field.options ?? []).map((opt: SettingsFieldOption) => (
            <div key={opt.value} className="flex items-center gap-2">
              <RadioGroupItem value={opt.value} id={`${field.key}-${opt.value}`} />
              <Label htmlFor={`${field.key}-${opt.value}`} className="text-sm text-gray-300 cursor-pointer">
                {opt.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      )}

      {field.type === "image" && (
        <div className="space-y-2">
          <div className="flex h-24 items-center justify-center rounded border border-dashed border-border/50 bg-gray-800/30">
            {value ? (
              <span className="text-xs text-gray-400">Image selected</span>
            ) : (
              <span className="text-xs text-gray-500">No image</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1 text-xs">
              <Upload className="mr-1.5 size-3" />
              Upload image
            </Button>
            <Button size="sm" variant="outline" className="flex-1 text-xs">
              <FolderOpen className="mr-1.5 size-3" />
              Image Manager
            </Button>
          </div>
        </div>
      )}

      {field.type === "range" && (
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={field.min ?? 1}
            max={field.max ?? 12}
            value={(value as number) ?? field.min ?? 1}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(Number(e.target.value))}
            className="flex-1 accent-blue-500"
          />
          <span className="w-8 text-center text-sm font-medium text-gray-300">
            {(value as number) ?? field.min ?? 1}
          </span>
        </div>
      )}

      {field.type === "color-scheme" && (
        <Select
          value={(value as string) ?? "scheme-1"}
          onValueChange={(v: string) => handleChange(v)}
        >
          <SelectTrigger className="w-full text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COLOR_SCHEME_OPTIONS.map((opt: SettingsFieldOption) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
