"use client";

import React from "react";
import { Label } from "@/shared/ui";

export function ColorPickerField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}): React.JSX.Element {
  const resolved = value || "#ffffff";
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-wider text-gray-500">
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <label className="relative flex size-8 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded border border-border/50">
          <input
            type="color"
            value={resolved}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => onChange(e.target.value)}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
          <div className="size-full rounded" style={{ backgroundColor: resolved }} />
        </label>
        <div className="text-xs text-gray-400">{resolved}</div>
      </div>
    </div>
  );
}
