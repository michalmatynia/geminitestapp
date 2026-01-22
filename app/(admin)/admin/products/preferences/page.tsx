"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { UserPreferences } from "@/types/products";

type Catalog = {
  id: string;
  name: string;
  currencyCode?: string;
};

export default function ProductPreferencesPage() {
  const [preferences, setPreferences] = useState<UserPreferences>({
    productListNameLocale: "name_en",
    productListCatalogFilter: "all",
    productListCurrencyCode: null,
    productListPageSize: 50,
  });
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
          const prefsData = await prefsRes.json();
          setPreferences({
            productListNameLocale: prefsData.productListNameLocale || "name_en",
            productListCatalogFilter: prefsData.productListCatalogFilter || "all",
            productListCurrencyCode: prefsData.productListCurrencyCode,
            productListPageSize: prefsData.productListPageSize || 50,
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

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <div className="rounded-lg bg-gray-950 p-6 shadow-lg">
          <p className="text-sm text-gray-400">Loading preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="rounded-lg bg-gray-950 p-6 shadow-lg">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Product Preferences</h1>
            <p className="mt-1 text-sm text-gray-400">
              Manage your product list display and navigation preferences
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push("/admin/products")}
          >
            Back to Products
          </Button>
        </div>

        <div className="space-y-6">
          {/* Product List Section */}
          <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-6">
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

          {/* Save Button */}
          <div className="flex justify-end gap-3">
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
        </div>
      </div>
    </div>
  );
}
