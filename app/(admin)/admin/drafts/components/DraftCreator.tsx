"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { ProductDraft, CreateProductDraftInput } from "@/types/drafts";
import type { CatalogRecord, PriceGroupWithDetails } from "@/types";
import type { ProductCategory, ProductTag } from "@/types/products";

interface DraftCreatorProps {
  draftId: string | null;
  onSaveSuccess: () => void;
  onCancel: () => void;
}

export function DraftCreator({ draftId, onSaveSuccess, onCancel }: DraftCreatorProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Form fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sku, setSku] = useState("");
  const [identifierType, setIdentifierType] = useState<"ean" | "gtin" | "asin">("ean");
  const [ean, setEan] = useState("");
  const [gtin, setGtin] = useState("");
  const [asin, setAsin] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [namePl, setNamePl] = useState("");
  const [nameDe, setNameDe] = useState("");
  const [descEn, setDescEn] = useState("");
  const [descPl, setDescPl] = useState("");
  const [descDe, setDescDe] = useState("");
  const [weight, setWeight] = useState("");
  const [sizeLength, setSizeLength] = useState("");
  const [sizeWidth, setSizeWidth] = useState("");
  const [length, setLength] = useState("");
  const [price, setPrice] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierLink, setSupplierLink] = useState("");
  const [priceComment, setPriceComment] = useState("");
  const [stock, setStock] = useState("");
  const [baseProductId, setBaseProductId] = useState("");
  const [active, setActive] = useState(true);
  const [imageLinks, setImageLinks] = useState<string[]>(Array(15).fill(""));

  // Metadata
  const [catalogs, setCatalogs] = useState<CatalogRecord[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [tags, setTags] = useState<ProductTag[]>([]);
  const [priceGroups, setPriceGroups] = useState<PriceGroupWithDetails[]>([]);

  const [selectedCatalogIds, setSelectedCatalogIds] = useState<string[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedPriceGroupId, setSelectedPriceGroupId] = useState<string>("");

  // Load metadata
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [catalogsRes, priceGroupsRes] = await Promise.all([
          fetch("/api/catalogs"),
          fetch("/api/price-groups"),
        ]);

        if (catalogsRes.ok) {
          const catalogsData = (await catalogsRes.json()) as CatalogRecord[];
          setCatalogs(catalogsData);
        }

        if (priceGroupsRes.ok) {
          const pgData = (await priceGroupsRes.json()) as PriceGroupWithDetails[];
          setPriceGroups(pgData);
        }
      } catch (error) {
        console.error("Failed to load metadata:", error);
      }
    };

    void loadMetadata();
  }, []);

  // Load categories when catalogs are selected
  useEffect(() => {
    if (selectedCatalogIds.length === 0) {
      setCategories([]);
      return;
    }

    const loadCategories = async () => {
      try {
        const categoryPromises = selectedCatalogIds.map((catalogId) =>
          fetch(`/api/products/categories?catalogId=${catalogId}`).then((res) => res.json())
        );
        const categoryArrays = await Promise.all(categoryPromises);
        const allCategories = categoryArrays.flat() as ProductCategory[];
        setCategories(allCategories);
      } catch (error) {
        console.error("Failed to load categories:", error);
      }
    };

    void loadCategories();
  }, [selectedCatalogIds]);

  // Load tags when catalogs are selected
  useEffect(() => {
    if (selectedCatalogIds.length === 0) {
      setTags([]);
      return;
    }

    const loadTags = async () => {
      try {
        const tagPromises = selectedCatalogIds.map((catalogId) =>
          fetch(`/api/products/tags?catalogId=${catalogId}`).then((res) => res.json())
        );
        const tagArrays = await Promise.all(tagPromises);
        const allTags = tagArrays.flat() as ProductTag[];
        setTags(allTags);
      } catch (error) {
        console.error("Failed to load tags:", error);
      }
    };

    void loadTags();
  }, [selectedCatalogIds]);

  // Load existing draft
  useEffect(() => {
    if (!draftId) {
      // Reset form for new draft
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
      setImageLinks(Array(15).fill(""));
      setSelectedCatalogIds([]);
      setSelectedCategoryIds([]);
      setSelectedTagIds([]);
      setSelectedPriceGroupId("");
      return;
    }

    const loadDraft = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/drafts/${draftId}`);
        if (!res.ok) throw new Error("Failed to load draft");

        const draft = (await res.json()) as ProductDraft;
        setName(draft.name);
        setDescription(draft.description || "");
        setSku(draft.sku || "");
        setEan(draft.ean || "");
        setGtin(draft.gtin || "");
        setAsin(draft.asin || "");
        // Set identifier type based on what's filled
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
        const links = draft.imageLinks && draft.imageLinks.length > 0 ? draft.imageLinks : [];
        setImageLinks([...links, ...(Array(Math.max(0, 15 - links.length)).fill("") as string[])]);
        setSelectedCatalogIds(draft.catalogIds || []);
        setSelectedCategoryIds(draft.categoryIds || []);
        setSelectedTagIds(draft.tagIds || []);
        setSelectedPriceGroupId(draft.defaultPriceGroupId || "");
      } catch (error) {
        console.error("Failed to load draft:", error);
        toast("Failed to load draft", { variant: "error" });
      } finally {
        setLoading(false);
      }
    };

    void loadDraft();
  }, [draftId, toast]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast("Draft name is required", { variant: "error" });
      return;
    }

    try {
      setSaving(true);

      const data: CreateProductDraftInput = {
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
        defaultPriceGroupId: selectedPriceGroupId || null,
        active,
        imageLinks: imageLinks.filter((link) => link.trim()),
        baseProductId: baseProductId.trim() || null,
      };

      const url = draftId ? `/api/drafts/${draftId}` : "/api/drafts";
      const method = draftId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to save draft");

      toast(draftId ? "Draft updated successfully" : "Draft created successfully", {
        variant: "success",
      });
      onSaveSuccess();
    } catch (error) {
      console.error("Failed to save draft:", error);
      toast("Failed to save draft", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const toggleCatalog = (catalogId: string) => {
    setSelectedCatalogIds((prev) =>
      prev.includes(catalogId) ? prev.filter((id) => id !== catalogId) : [...prev, catalogId]
    );
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]
    );
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  if (loading) {
    return (
      <div className="rounded-lg bg-gray-950 p-6">
        <p className="text-sm text-gray-400">Loading draft...</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-gray-950 p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">
          {draftId ? "Edit Draft" : "Create New Draft"}
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          Set up default values for new products
        </p>
      </div>

      <div className="space-y-6">
        {/* Draft Info */}
        <div className="space-y-4 rounded-lg border border-gray-800 bg-gray-900/50 p-4">
          <h3 className="text-sm font-semibold text-white">Draft Information</h3>

          <div className="space-y-2">
            <Label htmlFor="name">
              Draft Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Standard Product Template"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Draft Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this draft is for..."
              rows={2}
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={active} onCheckedChange={setActive} id="active" />
            <Label htmlFor="active" className="cursor-pointer">
              Active (products will be active by default)
            </Label>
          </div>
        </div>

        {/* Product Fields */}
        <div className="space-y-4 rounded-lg border border-gray-800 bg-gray-900/50 p-4">
          <h3 className="text-sm font-semibold text-white">Default Product Values</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Product SKU"
              />
            </div>
            <div className="space-y-2">
              <Label>Product Identifier</Label>
              <div className="flex gap-2">
                <Select
                  value={identifierType}
                  onValueChange={(value) =>
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
                    onChange={(e) => setEan(e.target.value)}
                    placeholder="Enter EAN"
                  />
                )}
                {identifierType === "gtin" && (
                  <Input
                    id="gtin"
                    value={gtin}
                    onChange={(e) => setGtin(e.target.value)}
                    placeholder="Enter GTIN"
                  />
                )}
                {identifierType === "asin" && (
                  <Input
                    id="asin"
                    value={asin}
                    onChange={(e) => setAsin(e.target.value)}
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
                onChange={(e) => setWeight(e.target.value)}
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
                onChange={(e) => setSizeLength(e.target.value)}
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
                onChange={(e) => setSizeWidth(e.target.value)}
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
                onChange={(e) => setLength(e.target.value)}
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
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="Product name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="namePl">Name (Polish)</Label>
              <Input
                id="namePl"
                value={namePl}
                onChange={(e) => setNamePl(e.target.value)}
                placeholder="Nazwa produktu"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nameDe">Name (German)</Label>
              <Input
                id="nameDe"
                value={nameDe}
                onChange={(e) => setNameDe(e.target.value)}
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
                onChange={(e) => setDescEn(e.target.value)}
                placeholder="Product description"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descPl">Description (Polish)</Label>
              <Textarea
                id="descPl"
                value={descPl}
                onChange={(e) => setDescPl(e.target.value)}
                placeholder="Opis produktu"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descDe">Description (German)</Label>
              <Textarea
                id="descDe"
                value={descDe}
                onChange={(e) => setDescDe(e.target.value)}
                placeholder="Produktbeschreibung"
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Pricing and Supplier */}
        <div className="space-y-4 rounded-lg border border-gray-800 bg-gray-900/50 p-4">
          <h3 className="text-sm font-semibold text-white">Pricing & Supplier Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Base Price</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock">Stock</Label>
              <Input
                id="stock"
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplierName">Supplier Name</Label>
            <Input
              id="supplierName"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="Supplier name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplierLink">Supplier Link</Label>
            <Input
              id="supplierLink"
              value={supplierLink}
              onChange={(e) => setSupplierLink(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="priceComment">Price Comment</Label>
            <Input
              id="priceComment"
              value={priceComment}
              onChange={(e) => setPriceComment(e.target.value)}
              placeholder="Additional price information"
            />
          </div>
        </div>

        {/* Catalogs */}
        <div className="space-y-4 rounded-lg border border-gray-800 bg-gray-900/50 p-4">
          <h3 className="text-sm font-semibold text-white">Catalogs</h3>
          <div className="flex flex-wrap gap-2">
            {catalogs.map((catalog) => (
              <button
                key={catalog.id}
                type="button"
                onClick={() => toggleCatalog(catalog.id)}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  selectedCatalogIds.includes(catalog.id)
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {catalog.name}
              </button>
            ))}
          </div>
        </div>

        {/* Categories */}
        {categories.length > 0 && (
          <div className="space-y-4 rounded-lg border border-gray-800 bg-gray-900/50 p-4">
            <h3 className="text-sm font-semibold text-white">Categories</h3>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => toggleCategory(category.id)}
                  className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                    selectedCategoryIds.includes(category.id)
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="space-y-4 rounded-lg border border-gray-800 bg-gray-900/50 p-4">
            <h3 className="text-sm font-semibold text-white">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                    selectedTagIds.includes(tag.id)
                      ? "bg-purple-600 text-white"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Price Group */}
        {priceGroups.length > 0 && (
          <div className="space-y-4 rounded-lg border border-gray-800 bg-gray-900/50 p-4">
            <h3 className="text-sm font-semibold text-white">Default Price Group</h3>
            <div className="flex flex-wrap gap-2">
              {priceGroups.map((pg) => (
                <button
                  key={pg.id}
                  type="button"
                  onClick={() =>
                    setSelectedPriceGroupId((prev) => (prev === pg.id ? "" : pg.id))
                  }
                  className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                    selectedPriceGroupId === pg.id
                      ? "bg-yellow-600 text-white"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  {pg.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Image Links */}
        <div className="space-y-4 rounded-lg border border-gray-800 bg-gray-900/50 p-4">
          <h3 className="text-sm font-semibold text-white">Default Image Links (up to 15)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {imageLinks.map((link, index) => (
              <div key={index} className="space-y-1">
                <Label htmlFor={`image-${index}`} className="text-xs text-gray-400">
                  Image {index + 1}
                </Label>
                <Input
                  id={`image-${index}`}
                  value={link}
                  onChange={(e) => {
                    const newLinks = [...imageLinks];
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
        <div className="space-y-4 rounded-lg border border-gray-800 bg-gray-900/50 p-4">
          <h3 className="text-sm font-semibold text-white">Import Information</h3>
          <div className="space-y-2">
            <Label htmlFor="baseProductId">Base Product ID</Label>
            <Input
              id="baseProductId"
              value={baseProductId}
              onChange={(e) => setBaseProductId(e.target.value)}
              placeholder="Imported from Base.com"
            />
            <p className="text-xs text-gray-400">
              This ID is used for products imported from Base.com
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Saving..." : draftId ? "Update Draft" : "Create Draft"}
          </Button>
        </div>
      </div>
    </div>
  );
}
