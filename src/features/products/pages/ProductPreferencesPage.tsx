"use client";

import { Button, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Input, useToast, SectionHeader, SectionPanel } from "@/shared/ui";
import { useEffect, useState } from "react";





import { useRouter } from "next/navigation";
import { UserPreferences } from "@/features/products/types";


type Catalog = {
  id: string;
  name: string;
  currencyCode?: string;
};

const DEFAULT_PREFERENCES: UserPreferences = {
  productListNameLocale: "name_en",
  productListCatalogFilter: "all",
  productListCurrencyCode: null,
  productListPageSize: 50,
  aiPathsActivePathId: null,
  aiPathsExpandedGroups: ["Triggers"],
};

export function ProductPreferencesPage() {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Load preferences
        const prefsRes = await fetch("/api/user/preferences");
        if (prefsRes.ok) {
          const prefsData = (await prefsRes.json()) as Partial<UserPreferences>;
          setPreferences({
            productListNameLocale: prefsData.productListNameLocale || "name_en",
            productListCatalogFilter: prefsData.productListCatalogFilter || "all",
            productListCurrencyCode: prefsData.productListCurrencyCode || null,
            productListPageSize: prefsData.productListPageSize || 50,
            aiPathsActivePathId: prefsData.aiPathsActivePathId ?? null,
            aiPathsExpandedGroups: prefsData.aiPathsExpandedGroups ?? ["Triggers"],
          });
        }

        // Load catalogs
        const catalogsRes = await fetch("/api/catalogs");
        if (catalogsRes.ok) {
          const catalogsData = (await catalogsRes.json()) as Catalog[];
          setCatalogs(catalogsData);
        }
      } catch (error) {
        console.error("Failed to load preferences:", error);
        toast("Failed to load preferences", { variant: "error" });
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [toast]);

  const handleSave = async () => {
    try {
      setSaving(true);

      const res = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });

      if (!res.ok) {
        throw new Error("Failed to save preferences");
      }

      toast("Preferences saved successfully", { variant: "success" });
      router.push("/admin/products");
    } catch (error) {
      console.error("Failed to save preferences:", error);
      toast("Failed to save preferences", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefault = async () => {
    try {
      setSaving(true);

      const res = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(DEFAULT_PREFERENCES),
      });

      if (!res.ok) {
        throw new Error("Failed to reset preferences");
      }

      setPreferences(DEFAULT_PREFERENCES);
      toast("Preferences reset to default", { variant: "success" });
    } catch (error) {
      console.error("Failed to reset preferences:", error);
      toast("Failed to reset preferences", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <div className="rounded-lg bg-card p-6 shadow-lg">
          <p className="text-sm text-gray-400">Loading preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <SectionPanel className="p-6">
        <SectionHeader
          title="Product Preferences"
          size="md"
          description="Manage your product list display and navigation preferences"
          actions={
            <Button
              variant="outline"
              onClick={() => router.push("/admin/products")}
            >
              Back to Products
            </Button>
          }
          className="mb-6"
        />

        <div className="space-y-6">
          {/* Product List Section */}
          <SectionPanel className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">Product List Settings</h2>

            <div className="space-y-4">
              {/* Name Locale */}
              <div className="space-y-2">
                <Label htmlFor="nameLocale">Product Name Language</Label>
                <Select
                  value={preferences.productListNameLocale || "name_en"}
                  onValueChange={(value) =>
                    setPreferences((prev) => ({
                      ...prev,
                      productListNameLocale: value,
                    }))
                  }
                >
                  <SelectTrigger id="nameLocale">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name_en">English</SelectItem>
                    <SelectItem value="name_pl">Polish</SelectItem>
                    <SelectItem value="name_de">German</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Default language for product names in the list
                </p>
              </div>

              {/* Default Catalog Filter */}
              <div className="space-y-2">
                <Label htmlFor="catalogFilter">Default Catalog Filter</Label>
                <Select
                  value={preferences.productListCatalogFilter || "all"}
                  onValueChange={(value) =>
                    setPreferences((prev) => ({
                      ...prev,
                      productListCatalogFilter: value,
                    }))
                  }
                >
                  <SelectTrigger id="catalogFilter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Catalogs</SelectItem>
                    {catalogs.map((catalog) => (
                      <SelectItem key={catalog.id} value={catalog.id}>
                        {catalog.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Default catalog filter when opening the product list
                </p>
              </div>

              {/* Currency Code */}
              <div className="space-y-2">
                <Label htmlFor="currencyCode">Preferred Currency</Label>
                <Input
                  id="currencyCode"
                  value={preferences.productListCurrencyCode || ""}
                  onChange={(e) =>
                    setPreferences((prev) => ({
                      ...prev,
                      productListCurrencyCode: e.target.value || null,
                    }))
                  }
                  placeholder="EUR, USD, PLN, etc."
                />
                <p className="text-xs text-gray-500">
                  Preferred currency code for price display (leave empty for catalog default)
                </p>
              </div>

              {/* Page Size */}
              <div className="space-y-2">
                <Label htmlFor="pageSize">Products Per Page</Label>
                <Select
                  value={String(preferences.productListPageSize || 50)}
                  onValueChange={(value) =>
                    setPreferences((prev) => ({
                      ...prev,
                      productListPageSize: parseInt(value, 10),
                    }))
                  }
                >
                  <SelectTrigger id="pageSize">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Number of products to display per page
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => void handleResetToDefault()}
              disabled={saving}
              className="border-yellow-600 text-yellow-600 hover:bg-yellow-600/10"
            >
              Reset to Default
            </Button>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => router.push("/admin/products")}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button onClick={() => void handleSave()} disabled={saving}>
                {saving ? "Saving..." : "Save Preferences"}
              </Button>
            </div>
          </SectionPanel>
        </div>
      </SectionPanel>
    </div>
  );
}
