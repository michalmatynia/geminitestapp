"use client";

import { useFormContext } from "react-hook-form";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { ProductFormData } from "@/features/products/types";

export default function ProductFormImportInfo() {
  const { register } = useFormContext<ProductFormData>();

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <Label htmlFor="baseProductId">Base ID</Label>
        <Input
          id="baseProductId"
          {...register("baseProductId")}
          disabled
          className="bg-muted cursor-not-allowed"
          placeholder="Imported from Base.com"
          aria-readonly="true"
        />
        <p className="text-muted-foreground text-xs mt-1">
          This ID is imported from Base.com and cannot be edited.
        </p>
      </div>
    </div>
  );
}
