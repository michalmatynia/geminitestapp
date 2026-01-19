"use client";

import { useFormContext } from "react-hook-form";
import { useProductFormContext } from "@/lib/context/ProductFormContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProductFormData } from "@/types";

export default function ProductFormOther() {
  const {
    errors,
    catalogs,
    catalogsLoading,
    catalogsError,
    selectedCatalogIds,
    toggleCatalog,
    filteredPriceGroups,
  } = useProductFormContext();

  const { register, setValue, getValues } = useFormContext<ProductFormData>();

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <Label htmlFor="price">Price</Label>
        <Input
          id="price"
          type="number"
          {...register("price", { valueAsNumber: true })}
          aria-invalid={errors.price ? "true" : "false"}
        />
        {errors.price && (
          <p className="text-red-500 text-sm mt-1" role="alert">
            {errors.price.message}
          </p>
        )}
      </div>
      <div className="mb-4">
        <Label htmlFor="defaultPriceGroupId">Price Group</Label>
        <Select
          onValueChange={(value) => setValue("defaultPriceGroupId", value)}
          defaultValue={getValues("defaultPriceGroupId") || ""}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select price group" />
          </SelectTrigger>
          <SelectContent>
            {filteredPriceGroups.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                {group.name} {group.isDefault ? "(Default)" : ""}{" "}
                ({group.currency?.code ?? group.currencyCode})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="mb-4">
        <Label htmlFor="supplierName">Supplier Name</Label>
        <Input
          id="supplierName"
          {...register("supplierName")}
          aria-invalid={errors.supplierName ? "true" : "false"}
        />
        {errors.supplierName && (
          <p className="text-red-500 text-sm mt-1" role="alert">
            {errors.supplierName.message}
          </p>
        )}
      </div>
      <div className="mb-4">
        <Label htmlFor="supplierLink">Supplier Link</Label>
        <Input
          id="supplierLink"
          {...register("supplierLink")}
          aria-invalid={errors.supplierLink ? "true" : "false"}
        />
        {errors.supplierLink && (
          <p className="text-red-500 text-sm mt-1" role="alert">
            {errors.supplierLink.message}
          </p>
        )}
      </div>
      <div className="mb-4">
        <Label htmlFor="priceComment">Price Comment</Label>
        <Input
          id="priceComment"
          {...register("priceComment")}
          aria-invalid={errors.priceComment ? "true" : "false"}
        />
        {errors.priceComment && (
          <p className="text-red-500 text-sm mt-1" role="alert">
            {errors.priceComment.message}
          </p>
        )}
      </div>
      <div className="mb-4">
        <Label htmlFor="stock">Stock</Label>
        <Input
          id="stock"
          type="number"
          {...register("stock", { valueAsNumber: true })}
          aria-invalid={errors.stock ? "true" : "false"}
        />
        {errors.stock && (
          <p className="text-red-500 text-sm mt-1" role="alert">
            {errors.stock.message}
          </p>
        )}
      </div>
      <div className="mb-4">
        <Label className="mb-2 block">Catalogs</Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              {selectedCatalogIds.length > 0
                ? `${selectedCatalogIds.length} catalog(s) selected`
                : "Select catalogs"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            {catalogsLoading ? (
              <div className="p-2 text-sm text-muted-foreground">Loading...</div>
            ) : catalogsError ? (
              <div className="p-2 text-sm text-red-500">{catalogsError}</div>
            ) : catalogs.length === 0 ? (
              <div className="p-2 text-sm text-muted-foreground">No catalogs found</div>
            ) : (
              catalogs.map((catalog) => (
                <DropdownMenuCheckboxItem
                  key={catalog.id}
                  checked={selectedCatalogIds.includes(catalog.id)}
                  onCheckedChange={() => toggleCatalog(catalog.id)}
                >
                  {catalog.name}
                </DropdownMenuCheckboxItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
