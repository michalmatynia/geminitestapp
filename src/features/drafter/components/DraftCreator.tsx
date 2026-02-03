"use client";
import { Button, Input, Label, Textarea, Switch, Tabs, TabsContent, TabsList, TabsTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, useToast } from "@/shared/ui";
import React, { useEffect, useMemo, useState } from "react";

import { CreateProductDraftInput, UpdateProductDraftInput } from "@/features/products";
import type { CatalogRecord } from "@/features/products";
import type { ProductCategoryDto, ProductTag, ProductParameter, ProductParameterValue } from "@/features/products";
import { logClientError } from "@/shared/utils/observability/client-error-logger";
import { PRODUCT_ICONS } from "@/shared/constants/product-icons";
import { useDraft, useCreateDraft, useUpdateDraft } from "@/features/drafter/hooks/useDrafts";
import { useCatalogs } from "@/features/products/hooks/useProductMetadata";
import { useQueries } from "@tanstack/react-query";

interface DraftCreatorProps {
  draftId: string | null;
  onSaveSuccess: () => void;
  onCancel: () => void;
  formRef?: React.RefObject<HTMLFormElement | null>;
}

export function DraftCreator({ draftId, onSaveSuccess, onCancel: _onCancel, formRef }: DraftCreatorProps): React.JSX.Element {
  const { toast } = useToast();

  // Queries
  const { data: catalogs = [] } = useCatalogs();
  const draftQuery = useDraft(draftId);
  const createDraftMutation = useCreateDraft();
  const updateDraftMutation = useUpdateDraft();

  // Form fields
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [sku, setSku] = useState<string>("");
  const [identifierType, setIdentifierType] = useState<"ean" | "gtin" | "asin">("ean");
  const [ean, setEan] = useState<string>("");
  const [gtin, setGtin] = useState<string>("");
  const [asin, setAsin] = useState<string>("");
  const [nameEn, setNameEn] = useState<string>("");
  const [namePl, setNamePl] = useState<string>("");
  const [nameDe, setNameDe] = useState<string>("");
  const [descEn, setDescEn] = useState<string>("");
  const [descPl, setDescPl] = useState<string>("");
  const [descDe, setDescDe] = useState<string>("");
  const [weight, setWeight] = useState<string>("");
  const [sizeLength, setSizeLength] = useState<string>("");
  const [sizeWidth, setSizeWidth] = useState<string>("");
  const [length, setLength] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [supplierName, setSupplierName] = useState<string>("");
  const [supplierLink, setSupplierLink] = useState<string>("");
  const [priceComment, setPriceComment] = useState<string>("");
  const [stock, setStock] = useState<string>("");
  const [baseProductId, setBaseProductId] = useState<string>("");
  const [active, setActive] = useState<boolean>(true);
  const [icon, setIcon] = useState<string | null>(null);
  const [imageLinks, setImageLinks] = useState<string[]>(Array(15).fill("") as string[]);

  const [selectedCatalogIds, setSelectedCatalogIds] = useState<string[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [parameterValues, setParameterValues] = useState<ProductParameterValue[]>([]);

  // Metadata queries based on selected catalogs
  const categoryQueries = useQueries({
    queries: selectedCatalogIds.map((id: string) => ({
      queryKey: ["categories", id],
      queryFn: async (): Promise<ProductCategoryDto[]> => {
        const res = await fetch(`/api/products/categories?catalogId=${id}`);
        return (await res.json()) as ProductCategoryDto[];
      }
    }))
  });

  const tagQueries = useQueries({
    queries: selectedCatalogIds.map((id: string) => ({
      queryKey: ["tags", id],
      queryFn: async (): Promise<ProductTag[]> => {
        const res = await fetch(`/api/products/tags?catalogId=${id}`);
        return (await res.json()) as ProductTag[];
      }
    }))
  });

  const parameterQueries = useQueries({
    queries: selectedCatalogIds.map((id: string) => ({
      queryKey: ["parameters", id],
      queryFn: async (): Promise<ProductParameter[]> => {
        const res = await fetch(`/api/products/parameters?catalogId=${id}`);
        return (await res.json()) as ProductParameter[];
      }
    }))
  });

  const categories = useMemo(() => categoryQueries.flatMap((q: (typeof categoryQueries)[number]) => (q.data as ProductCategoryDto[]) || []), [categoryQueries]);
  const tags = useMemo(() => tagQueries.flatMap((q: (typeof tagQueries)[number]) => (q.data as ProductTag[]) || []), [tagQueries]);
  const parameters = useMemo(() => parameterQueries.flatMap((q: (typeof parameterQueries)[number]) => (q.data as ProductParameter[]) || []), [parameterQueries]);
  const parametersLoading = useMemo(() => parameterQueries.some((q: (typeof parameterQueries)[number]) => q.isLoading), [parameterQueries]);

  // Sync form with draft data
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (draftQuery.data) {
      const draft = draftQuery.data;
      // Use a timeout to avoid synchronous setState in effect
      timer = setTimeout((): void => {
        setName(draft.name);
        setDescription(draft.description || "");
        setSku(draft.sku || "");
        setEan(draft.ean || "");
        setGtin(draft.gtin || "");
        setAsin(draft.asin || "");
        if (draft.asin) setIdentifierType("asin");
        else if (draft.gtin) setIdentifierType("gtin");
        else setIdentifierType("ean");
        setNameEn(draft.name_en || "");
        setNamePl(draft.name_pl || "");
        setNameDe(draft.name_de || "");
        setDescEn(draft.description_en || "");
        setDescPl(draft.description_pl || "");
        setDescDe(draft.description_de || "");
        setWeight(draft.weight?.toString() || "");
        setSizeLength(draft.sizeLength?.toString() || "");
        setSizeWidth(draft.sizeWidth?.toString() || "");
        setLength(draft.length?.toString() || "");
        setPrice(draft.price?.toString() || "");
        setSupplierName(draft.supplierName || "");
        setSupplierLink(draft.supplierLink || "");
        setPriceComment(draft.priceComment || "");
        setStock(draft.stock?.toString() || "");
        setBaseProductId(draft.baseProductId || "");
        setActive(draft.active ?? true);
        setIcon(draft.icon || null);
        const links: string[] = draft.imageLinks && draft.imageLinks.length > 0 ? draft.imageLinks : [];
        setImageLinks([...links, ...(Array(Math.max(0, 15 - links.length)).fill("") as string[])]);
        setSelectedCatalogIds(draft.catalogIds || []);
        setSelectedCategoryIds(draft.categoryIds || []);
        setSelectedTagIds(draft.tagIds || []);
        setParameterValues(draft.parameters || []);
      }, 0);
    } else if (!draftId) {
      // Reset form
      timer = setTimeout((): void => {
        setName("");
        setDescription("");
        setSku("");
        setEan("");
        setGtin("");
        setAsin("");
        setNameEn("");
        setNamePl("");
        setNameDe("");
        setDescEn("");
        setDescPl("");
        setDescDe("");
        setWeight("");
        setSizeLength("");
        setSizeWidth("");
        setLength("");
        setPrice("");
        setSupplierName("");
        setSupplierLink("");
        setPriceComment("");
        setStock("");
        setBaseProductId("");
        setActive(true);
        setIcon(null);
        setImageLinks(Array(15).fill("") as string[]);
        setSelectedCatalogIds([]);
        setSelectedCategoryIds([]);
        setSelectedTagIds([]);
        setParameterValues([]);
      }, 0);
    }
    return (): void => {
      if (timer) clearTimeout(timer);
    };
  }, [draftQuery.data, draftId]);

  const handleSave = async (): Promise<void> => {
    if (!name.trim()) {
      toast("Draft name is required", { variant: "error" });
      return;
    }

    try {
      const input: UpdateProductDraftInput = {
        name: name.trim(),
        description: description.trim() || null,
        sku: sku.trim() || null,
        ean: ean.trim() || null,
        gtin: gtin.trim() || null,
        asin: asin.trim() || null,
        name_en: nameEn.trim() || null,
        name_pl: namePl.trim() || null,
        name_de: nameDe.trim() || null,
        description_en: descEn.trim() || null,
        description_pl: descPl.trim() || null,
        description_de: descDe.trim() || null,
        weight: weight ? parseFloat(weight) : null,
        sizeLength: sizeLength ? parseFloat(sizeLength) : null,
        sizeWidth: sizeWidth ? parseFloat(sizeWidth) : null,
        length: length ? parseFloat(length) : null,
        price: price ? parseFloat(price) : null,
        supplierName: supplierName.trim() || null,
        supplierLink: supplierLink.trim() || null,
        priceComment: priceComment.trim() || null,
        stock: stock ? parseInt(stock, 10) : null,
        catalogIds: selectedCatalogIds,
        categoryIds: selectedCategoryIds,
        tagIds: selectedTagIds,
        parameters: parameterValues
          .map((entry: ProductParameterValue): { parameterId: string | undefined; value: string } => ({
            parameterId: entry.parameterId?.trim(),
            value: typeof entry.value === "string" ? entry.value.trim() : "",
          }))
          .filter((entry: { parameterId: string | undefined; value: string }): entry is { parameterId: string; value: string } => !!entry.parameterId),
        active,
        icon,
        imageLinks: imageLinks.filter((link: string): boolean => !!link.trim()),
        baseProductId: baseProductId.trim() || null,
      };

      if (draftId) {
        await updateDraftMutation.mutateAsync({ id: draftId, input });
      } else {
        await createDraftMutation.mutateAsync(input as CreateProductDraftInput);
      }

      toast(draftId ? "Draft updated successfully" : "Draft created successfully", {
        variant: "success",
      });
      onSaveSuccess();
    } catch (error) {
      logClientError(error, { context: { source: "DraftCreator", action: "saveDraft", draftId } });
      toast("Failed to save draft", { variant: "error" });
    }
  };

  const toggleCatalog = (catalogId: string): void => {
    setSelectedCatalogIds((prev: string[]): string[] =>
      prev.includes(catalogId) ? prev.filter((id: string): boolean => id !== catalogId) : [...prev, catalogId]
    );
  };

  const toggleCategory = (categoryId: string): void => {
    setSelectedCategoryIds((prev: string[]): string[] =>
      prev.includes(categoryId) ? prev.filter((id: string): boolean => id !== categoryId) : [...prev, categoryId]
    );
  };

  const toggleTag = (tagId: string): void => {
    setSelectedTagIds((prev: string[]): string[] =>
      prev.includes(tagId) ? prev.filter((id: string): boolean => id !== tagId) : [...prev, tagId]
    );
  };

  const addParameterValue = (): void => {
    setParameterValues((prev: ProductParameterValue[]): ProductParameterValue[] => [...prev, { parameterId: "", value: "" }]);
  };

  const updateParameterId = (index: number, parameterId: string): void => {
    setParameterValues((prev: ProductParameterValue[]): ProductParameterValue[] => {
      const next: ProductParameterValue[] = [...prev];
      if (!next[index]) return prev;
      next[index] = { ...next[index], parameterId };
      return next;
    });
  };

  const updateParameterValue = (index: number, value: string): void => {
    setParameterValues((prev: ProductParameterValue[]): ProductParameterValue[] => {
      const next: ProductParameterValue[] = [...prev];
      if (!next[index]) return prev;
      next[index] = { ...next[index], value };
      return next;
    });
  };

  const removeParameterValue = (index: number): void => {
    setParameterValues((prev: ProductParameterValue[]): ProductParameterValue[] => prev.filter((_: ProductParameterValue, i: number): boolean => i !== index));
  };

  const selectedParameterIds: (string | undefined)[] = useMemo(
    (): (string | undefined)[] => parameterValues.map((entry: ProductParameterValue): string | undefined => entry.parameterId).filter(Boolean),
    [parameterValues]
  );

  const getParameterLabel = (parameter: ProductParameter): string =>
    parameter.name_en || parameter.name_pl || parameter.name_de || "Unnamed parameter";

  if (draftQuery.isLoading) {
    return (
      <div className="rounded-lg bg-card p-6">
        <p className="text-sm text-gray-400">Loading draft...</p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={(e: React.FormEvent): void => {
        e.preventDefault();
        void handleSave();
      }}
      className="space-y-6"
    >
      <div className="space-y-6">
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="parameters">Parameters</TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="mt-0 space-y-6">
            {/* Draft Info */}
            <div className="space-y-4 rounded-lg border border-border bg-card/50 p-4">
          <h3 className="text-sm font-semibold text-white">Draft Information</h3>

          <div className="space-y-2">
            <Label htmlFor="name">
              Draft Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setName(e.target.value)}
              placeholder="e.g., Standard Product Template"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Draft Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void => setDescription(e.target.value)}
              placeholder="Describe what this draft is for..."
              rows={2}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between rounded-md border border-border bg-gray-900 px-4 py-3">
              <div>
                <Label htmlFor="active" className="cursor-pointer">
                  Active Draft
                </Label>
                <p className="text-xs text-gray-400">
                  Show quick create button in products list
                </p>
              </div>
              <Switch id="active" checked={active} onCheckedChange={(val: boolean): void => setActive(val)} />
            </div>

            <div className="space-y-2">
              <Label>Icon</Label>
                              <div className="grid grid-cols-6 gap-2">
                                {PRODUCT_ICONS.map((item: (typeof PRODUCT_ICONS)[number]): React.JSX.Element => {
                                  const IconComponent = item.icon;                  return (
                    <Button
                      key={item.id}
                      type="button"
                      onClick={(): void => setIcon(icon === item.id ? null : item.id)}
                      className={`flex h-10 w-10 items-center justify-center rounded-md border transition ${
                        icon === item.id
                          ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                          : "border bg-gray-800 text-gray-400 hover:border-border/60 hover:text-gray-300"
                      }`}
                      title={item.label}
                    >
                      <IconComponent className="h-5 w-5" />
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Product Fields */}
        <div className="space-y-4 rounded-lg border border-border bg-card/50 p-4">
          <h3 className="text-sm font-semibold text-white">Default Product Values</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={sku}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setSku(e.target.value)}
                placeholder="Product SKU"
              />
            </div>
            <div className="space-y-2">
              <Label>Product Identifier</Label>
              <div className="flex gap-2">
                <Select
                  value={identifierType}
                  onValueChange={(value: string): void =>
                    setIdentifierType(value as "ean" | "gtin" | "asin")
                  }
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ean">EAN</SelectItem>
                    <SelectItem value="gtin">GTIN</SelectItem>
                    <SelectItem value="asin">ASIN</SelectItem>
                  </SelectContent>
                </Select>
                {identifierType === "ean" && (
                  <Input
                    id="ean"
                    value={ean}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setEan(e.target.value)}
                    placeholder="Enter EAN"
                  />
                )}
                {identifierType === "gtin" && (
                  <Input
                    id="gtin"
                    value={gtin}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setGtin(e.target.value)}
                    placeholder="Enter GTIN"
                  />
                )}
                {identifierType === "asin" && (
                  <Input
                    id="asin"
                    value={asin}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setAsin(e.target.value)}
                    placeholder="Enter ASIN"
                  />
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.01"
                value={weight}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setWeight(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sizeLength">Length (cm)</Label>
              <Input
                id="sizeLength"
                type="number"
                step="0.01"
                value={sizeLength}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setSizeLength(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sizeWidth">Width (cm)</Label>
              <Input
                id="sizeWidth"
                type="number"
                step="0.01"
                value={sizeWidth}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setSizeWidth(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="length">Height (cm)</Label>
              <Input
                id="length"
                type="number"
                step="0.01"
                value={length}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setLength(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nameEn">Name (English)</Label>
              <Input
                id="nameEn"
                value={nameEn}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setNameEn(e.target.value)}
                placeholder="Product name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="namePl">Name (Polish)</Label>
              <Input
                id="namePl"
                value={namePl}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setNamePl(e.target.value)}
                placeholder="Nazwa produktu"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nameDe">Name (German)</Label>
              <Input
                id="nameDe"
                value={nameDe}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setNameDe(e.target.value)}
                placeholder="Produktname"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="descEn">Description (English)</Label>
              <Textarea
                id="descEn"
                value={descEn}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void => setDescEn(e.target.value)}
                placeholder="Product description"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descPl">Description (Polish)</Label>
              <Textarea
                id="descPl"
                value={descPl}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void => setDescPl(e.target.value)}
                placeholder="Opis produktu"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descDe">Description (German)</Label>
              <Textarea
                id="descDe"
                value={descDe}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void => setDescDe(e.target.value)}
                placeholder="Produktbeschreibung"
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Pricing and Supplier */}
        <div className="space-y-4 rounded-lg border border-border bg-card/50 p-4">
          <h3 className="text-sm font-semibold text-white">Pricing & Supplier Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Base Price</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={price}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock">Stock</Label>
              <Input
                id="stock"
                type="number"
                value={stock}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setStock(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplierName">Supplier Name</Label>
            <Input
              id="supplierName"
              value={supplierName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setSupplierName(e.target.value)}
              placeholder="Supplier name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplierLink">Supplier Link</Label>
            <Input
              id="supplierLink"
              value={supplierLink}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setSupplierLink(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="priceComment">Price Comment</Label>
            <Input
              id="priceComment"
              value={priceComment}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setPriceComment(e.target.value)}
              placeholder="Additional price information"
            />
          </div>
        </div>

        {/* Catalogs */}
        <div className="space-y-4 rounded-lg border border-border bg-card/50 p-4">
          <h3 className="text-sm font-semibold text-white">Catalogs</h3>
          <div className="flex flex-wrap gap-2">
            {catalogs.map((catalog: CatalogRecord): React.JSX.Element => (
              <Button
                key={catalog.id}
                type="button"
                onClick={(): void => toggleCatalog(catalog.id)}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  selectedCatalogIds.includes(catalog.id)
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {catalog.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Categories */}
        {categories.length > 0 && (
          <div className="space-y-4 rounded-lg border border-border bg-card/50 p-4">
            <h3 className="text-sm font-semibold text-white">Categories</h3>
            <div className="flex flex-wrap gap-2">
              {categories.map((category: ProductCategoryDto): React.JSX.Element => (
                <Button
                  key={category.id}
                  type="button"
                  onClick={(): void => toggleCategory(category.id)}
                  className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                    selectedCategoryIds.includes(category.id)
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  {category.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="space-y-4 rounded-lg border border-border bg-card/50 p-4">
            <h3 className="text-sm font-semibold text-white">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag: ProductTag): React.JSX.Element => (
                <Button
                  key={tag.id}
                  type="button"
                  onClick={(): void => toggleTag(tag.id)}
                  className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                    selectedTagIds.includes(tag.id)
                      ? "bg-purple-600 text-white"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {tag.name}
              </Button>
            ))}
          </div>
        </div>
        )}

        {/* Price Group Info */}
        {selectedCatalogIds.length > 0 && (
          <div className="rounded-lg border border-blue-900/50 bg-blue-950/20 p-4">
            <h3 className="text-sm font-semibold text-blue-400 mb-2">Price Group Information</h3>
            <p className="text-sm text-blue-300/70">
              Products created from this draft will automatically use the default price group from the selected catalog(s).
              Price groups are configured per catalog and cannot be manually overridden in drafts.
            </p>
          </div>
        )}

        {/* Image Links */}
        <div className="space-y-4 rounded-lg border border-border bg-card/50 p-4">
          <h3 className="text-sm font-semibold text-white">Default Image Links (up to 15)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {imageLinks.map((link: string, index: number): React.JSX.Element => (
              <div key={index} className="space-y-1">
                <Label htmlFor={`image-${index}`} className="text-xs text-gray-400">
                  Image {index + 1}
                </Label>
                <Input
                  id={`image-${index}`}
                  value={link}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                    const newLinks: string[] = [...imageLinks];
                    newLinks[index] = e.target.value;
                    setImageLinks(newLinks);
                  }}
                  placeholder={`https://...`}
                  className="text-sm"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Import Info */}
        <div className="space-y-4 rounded-lg border border-border bg-card/50 p-4">
          <h3 className="text-sm font-semibold text-white">Import Information</h3>
          <div className="space-y-2">
            <Label htmlFor="baseProductId">Base Product ID</Label>
            <Input
              id="baseProductId"
              value={baseProductId}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setBaseProductId(e.target.value)}
              placeholder="Imported from Base.com"
            />
            <p className="text-xs text-gray-400">
              This ID is used for products imported from Base.com
            </p>
          </div>
        </div>
          </TabsContent>
          <TabsContent value="parameters" className="mt-0 space-y-4">
            <div className="rounded-lg border border-border bg-card/50 p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">Parameters</h3>
                  <p className="text-xs text-gray-400">
                    Set default parameter values for products created from this draft.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addParameterValue}
                  disabled={parametersLoading || parameters.length === 0}
                >
                  Add parameter
                </Button>
              </div>

              {parametersLoading ? (
                <div className="rounded-md border border-dashed border p-4 text-center text-sm text-gray-400">
                  Loading parameters...
                </div>
              ) : parameters.length === 0 ? (
                <div className="rounded-md border border-dashed border p-4 text-center text-sm text-gray-400">
                  No parameters available for the selected catalog(s).
                </div>
              ) : parameterValues.length === 0 ? (
                <div className="rounded-md border border-dashed border p-4 text-center text-sm text-gray-400">
                  Add your first parameter to start defining defaults.
                </div>
              ) : (
                <div className="space-y-3">
                  {parameterValues.map((entry: ProductParameterValue, index: number): React.JSX.Element => {
                    const availableOptions: ProductParameter[] = parameters.filter(
                      (parameter: ProductParameter): boolean =>
                        !selectedParameterIds.includes(parameter.id) ||
                        parameter.id === entry.parameterId
                    );
                    return (
                      <div
                        key={`${entry.parameterId || "new"}-${index}`}
                        className="flex flex-col gap-3 rounded-md border border-border bg-card/60 p-3 md:flex-row md:items-center"
                      >
                        <div className="w-full md:w-64">
                          <Select
                            value={entry.parameterId}
                            onValueChange={(value: string): void => updateParameterId(index, value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select parameter" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableOptions.map((parameter: ProductParameter): React.JSX.Element => (
                                <SelectItem key={parameter.id} value={parameter.id}>
                                  {getParameterLabel(parameter)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1">
                          <Input
                            value={entry.value}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                              updateParameterValue(index, event.target.value)
                            }
                            placeholder="Value"
                            disabled={!entry.parameterId}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={(): void => removeParameterValue(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </form>
  );
}
