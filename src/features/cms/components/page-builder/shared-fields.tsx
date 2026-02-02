"use client";

import React, { useState } from "react";
import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Checkbox, Button } from "@/shared/ui";
import { cn } from "@/shared/utils";
import NextImage from "next/image";
import { Upload, FolderOpen } from "lucide-react";
import { MediaLibraryPanel } from "./MediaLibraryPanel";

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
          <Upload className="mr-1.5 size-3" />
          {value ? "Replace" : "Upload"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="text-xs"
          onClick={(): void => setOpen(true)}
          disabled={disabled}
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
          disabled={disabled}
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