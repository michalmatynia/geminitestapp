"use client";

import { Input, useToast } from "@/shared/ui";
import { useState, useEffect, useRef, KeyboardEvent, memo } from "react";


type EditableCellProps = {
  value: number | null;
  productId: string;
  field: "price" | "stock";
  onUpdate: () => void;
};

export const EditableCell = memo(function EditableCell({
  value,
  productId,
  field,
  onUpdate,
}: EditableCellProps): React.JSX.Element {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value ?? ""));
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect((): void => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = (): void => {
    setIsEditing(true);
    setEditValue(String(value ?? ""));
  };

  const handleSave = async (): Promise<void> => {
    if (isSaving) return;

    const numValue = parseFloat(editValue);
    if (isNaN(numValue) || numValue < 0) {
      toast(`Invalid ${field} value`, { variant: "error" });
      setEditValue(String(value ?? ""));
      setIsEditing(false);
      return;
    }

    // Don't save if value hasn't changed
    if (numValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);

    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: numValue }),
      });

      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(error.error || `Failed to update ${field}`);
      }

      toast(`${field.charAt(0).toUpperCase() + field.slice(1)} updated`, { variant: "success" });
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error(`Failed to update ${field}:`, error);
      toast(error instanceof Error ? error.message : `Failed to update ${field}`, { variant: "error" });
      setEditValue(String(value ?? ""));
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") {
      void handleSave();
    } else if (e.key === "Escape") {
      setEditValue(String(value ?? ""));
      setIsEditing(false);
    }
  };

  const handleBlur = (): void => {
    if (!isSaving) {
      setEditValue(String(value ?? ""));
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        type="number"
        step={field === "price" ? "0.01" : "1"}
        min="0"
        value={editValue}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        disabled={isSaving}
        className="h-8 w-24 text-sm"
      />
    );
  }

  return (
    <div
      onDoubleClick={handleDoubleClick}
      className="cursor-pointer rounded px-2 py-1 hover:bg-muted/50/50 transition-colors"
      title={`Double-click to edit ${field}`}
    >
      {value !== null ? (field === "price" ? value.toFixed(2) : value) : "-"}
    </div>
  );
},
(prev: EditableCellProps, next: EditableCellProps): boolean =>
  prev.value === next.value &&
  prev.productId === next.productId &&
  prev.field === next.field
);
