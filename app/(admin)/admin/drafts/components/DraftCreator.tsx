"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { ProductDraft, CreateProductDraftInput } from "@/types/drafts";
import type { CatalogRecord } from "@/types";
import type { ProductCategory, ProductTag, ProductParameter, ProductParameterValue } from "@/types/products";
import {
  Package,
  ShoppingCart,
  Tag,
  Star,
  Heart,
  Zap,
  Gift,
  Truck,
  DollarSign,
  Award,
  Box,
  Sparkles,
} from "lucide-react";

interface DraftCreatorProps {
  draftId: string | null;
  onSaveSuccess: () => void;
  onCancel: () => void;
  formRef?: React.RefObject<HTMLFormElement | null>;
}

export function DraftCreator({ draftId, onSaveSuccess, onCancel, formRef }: DraftCreatorProps) {
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
  const [icon, setIcon] = useState<string | null>(null);
  const [imageLinks, setImageLinks] = useState<string[]>(Array(15).fill(""));

  // Metadata
  const [catalogs, setCatalogs] = useState<CatalogRecord[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [tags, setTags] = useState<ProductTag[]>([]);
  const [parameters, setParameters] = useState<ProductParameter[]>([]);
  const [parametersLoading, setParametersLoading] = useState(false);

  const [selectedCatalogIds, setSelectedCatalogIds] = useState<string[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [parameterValues, setParameterValues] = useState<ProductParameterValue[]>([]);

  // Load metadata
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const catalogsRes = await fetch("/api/catalogs");

        if (catalogsRes.ok) {
          const catalogsData = (await catalogsRes.json()) as CatalogRecord[];
          setCatalogs(catalogsData);
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

  // Load parameters when catalogs are selected
  useEffect(() => {
    if (selectedCatalogIds.length === 0) {
      setParameters([]);
      return;
    }

    let cancelled = false;
    const loadParameters = async () => {
      setParametersLoading(true);
      try {
        const parameterPromises = selectedCatalogIds.map((catalogId) =>
          fetch(`/api/products/parameters?catalogId=${catalogId}`).then((res) => res.json())
        );
        const parameterArrays = await Promise.all(parameterPromises);
        const allParameters = parameterArrays.flat() as ProductParameter[];
        if (!cancelled) {
          setParameters(allParameters);
        }
      } catch (error) {
        console.error("Failed to load parameters:", error);
        if (!cancelled) {
          setParameters([]);
        }
      } finally {
        if (!cancelled) {
          setParametersLoading(false);
        }
      }
    };

    void loadParameters();
    return () => {
      cancelled = true;
    };
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
      setIcon(null);
      setImageLinks(Array(15).fill(""));
      setSelectedCatalogIds([]);
      setSelectedCategoryIds([]);
      setSelectedTagIds([]);
      setParameterValues([]);
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
        setIcon(draft.icon || null);
        const links = draft.imageLinks && draft.imageLinks.length > 0 ? draft.imageLinks : [];
        setImageLinks([...links, ...(Array(Math.max(0, 15 - links.length)).fill("") as string[])]);
        setSelectedCatalogIds(draft.catalogIds || []);
        setSelectedCategoryIds(draft.categoryIds || []);
        setSelectedTagIds(draft.tagIds || []);
        setParameterValues(draft.parameters || []);
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
        parameters: parameterValues
          .map((entry) => ({
            parameterId: entry.parameterId?.trim(),
            value: typeof entry.value === "string" ? entry.value.trim() : "",
          }))
          .filter((entry) => entry.parameterId),
        active,
        icon,
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

  const addParameterValue = () => {
    setParameterValues((prev) => [...prev, { parameterId: "", value: "" }]);
  };

  const updateParameterId = (index: number, parameterId: string) => {
    setParameterValues((prev) => {
      const next = [...prev];
      if (!next[index]) return prev;
      next[index] = { ...next[index], parameterId };
      return next;
    });
  };

  const updateParameterValue = (index: number, value: string) => {
    setParameterValues((prev) => {
      const next = [...prev];
      if (!next[index]) return prev;
      next[index] = { ...next[index], value };
      return next;
    });
  };

  const removeParameterValue = (index: number) => {
    setParameterValues((prev) => prev.filter((_, i) => i !== index));
  };

  const selectedParameterIds = useMemo(
    () => parameterValues.map((entry) => entry.parameterId).filter(Boolean),
    [parameterValues]
  );

  const getParameterLabel = (parameter: ProductParameter) =>
    parameter.name_en || parameter.name_pl || parameter.name_de || "Unnamed parameter";

  // Available icons
  const availableIcons = [
    { id: "package", icon: Package, label: "Package" },
    { id: "shopping-cart", icon: ShoppingCart, label: "Shopping Cart" },
    { id: "tag", icon: Tag, label: "Tag" },
    { id: "star", icon: Star, label: "Star" },
    { id: "heart", icon: Heart, label: "Heart" },
    { id: "zap", icon: Zap, label: "Lightning" },
    { id: "gift", icon: Gift, label: "Gift" },
    { id: "truck", icon: Truck, label: "Truck" },
    { id: "dollar-sign", icon: DollarSign, label: "Dollar" },
    { id: "award", icon: Award, label: "Award" },
    { id: "box", icon: Box, label: "Box" },
    { id: "sparkles", icon: Sparkles, label: "Sparkles" },
  ];

  if (loading) {
    return (
      <div className="rounded-lg bg-gray-950 p-6">
        <p className="text-sm text-gray-400">Loading draft...</p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
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

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between rounded-md border border-gray-800 bg-gray-900 px-4 py-3">
              <div>
                <Label htmlFor="active" className="cursor-pointer">
                  Active Draft
                </Label>
                <p className="text-xs text-gray-400">
                  Show quick create button in products list
                </p>
              </div>
              <Switch id="active" checked={active} onCheckedChange={setActive} />
            </div>

            <div className="space-y-2">
              <Label>Icon</Label>
              <div className="grid grid-cols-6 gap-2">
                {availableIcons.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <Button
                      key={item.id}
                      type="button"
                      onClick={() => setIcon(icon === item.id ? null : item.id)}
                      className={`flex h-10 w-10 items-center justify-center rounded-md border transition ${
                        icon === item.id
                          ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                          : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-300"
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
              <Button
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
              </Button>
            ))}
          </div>
        </div>

        {/* Categories */}
        {categories.length > 0 && (
          <div className="space-y-4 rounded-lg border border-gray-800 bg-gray-900/50 p-4">
            <h3 className="text-sm font-semibold text-white">Categories</h3>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Button
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
                </Button>
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
                <Button
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
          </TabsContent>
          <TabsContent value="parameters" className="mt-0 space-y-4">
            <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4 space-y-4">
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
                <div className="rounded-md border border-dashed border-gray-700 p-4 text-center text-sm text-gray-400">
                  Loading parameters...
                </div>
              ) : parameters.length === 0 ? (
                <div className="rounded-md border border-dashed border-gray-700 p-4 text-center text-sm text-gray-400">
                  No parameters available for the selected catalog(s).
                </div>
              ) : parameterValues.length === 0 ? (
                <div className="rounded-md border border-dashed border-gray-700 p-4 text-center text-sm text-gray-400">
                  Add your first parameter to start defining defaults.
                </div>
              ) : (
                <div className="space-y-3">
                  {parameterValues.map((entry, index) => {
                    const availableOptions = parameters.filter(
                      (parameter) =>
                        !selectedParameterIds.includes(parameter.id) ||
                        parameter.id === entry.parameterId
                    );
                    return (
                      <div
                        key={`${entry.parameterId || "new"}-${index}`}
                        className="flex flex-col gap-3 rounded-md border border-gray-800 bg-gray-950/60 p-3 md:flex-row md:items-center"
                      >
                        <div className="w-full md:w-64">
                          <Select
                            value={entry.parameterId}
                            onValueChange={(value) => updateParameterId(index, value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select parameter" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableOptions.map((parameter) => (
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
                            onChange={(event) =>
                              updateParameterValue(index, event.target.value)
                            }
                            placeholder="Value"
                            disabled={!entry.parameterId}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => removeParameterValue(index)}
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
