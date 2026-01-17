"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";

const integrations = [
  {
    name: "Tradera",
    slug: "tradera",
    type: "marketplace" as const,
    method: "browser" as const,
    description:
      "Sync and list products on Tradera via browser automation (Playwright).",
  },
  {
    name: "Allegro",
    slug: "allegro",
    type: "marketplace" as const,
    method: "api" as const,
    description:
      "List and sync products on Allegro using the official OAuth API.",
  },
  {
    name: "Baselinker",
    slug: "baselinker",
    type: "platform" as const,
    method: "api" as const,
    description:
      "Import products and sync inventory with Baselinker warehouse management.",
  },
];

export default function IntegrationsAddPage() {
  const router = useRouter();
  const [integrationCounts, setIntegrationCounts] = useState<
    Record<string, number>
  >({});
  const { toast } = useToast();

  const handleAdd = async (integration: (typeof integrations)[number]) => {
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: integration.name,
          slug: integration.slug,
        }),
      });
      if (!res.ok) {
        const error = (await res.json()) as { error?: string; errorId?: string };
        const message = error.error || "Failed to add integration.";
        const suffix = error.errorId ? ` (Error ID: ${error.errorId})` : "";
        toast(`${message}${suffix}`, { variant: "error" });
        return;
      }
      router.push("/admin/integrations");
    } catch (error) {
      console.error("Failed to add integration:", error);
      toast("Failed to add integration.", { variant: "error" });
    }
  };

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res = await fetch("/api/integrations");
        if (!res.ok) {
          const error = (await res.json()) as { error?: string; errorId?: string };
          const message = error.error || "Failed to load integrations.";
          const suffix = error.errorId ? ` (Error ID: ${error.errorId})` : "";
          toast(`${message}${suffix}`, { variant: "error" });
          return;
        }
        const data = (await res.json()) as { id: string; slug: string }[];
        const counts = data.reduce<Record<string, number>>((acc, integration) => {
          acc[integration.slug] = (acc[integration.slug] || 0) + 1;
          return acc;
        }, {});
        setIntegrationCounts(counts);
      } catch (error) {
        console.error("Failed to load integrations:", error);
        toast("Failed to load integrations.", { variant: "error" });
      }
    };

    void fetchCounts();
  }, [toast]);

  return (
    <div className="container mx-auto py-10">
      <div className="rounded-lg bg-gray-950 p-6 shadow-lg">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Add Integrations
            </h1>
            <p className="mt-1 text-sm text-gray-400">
              Select a marketplace connection to add to your map.
            </p>
          </div>
          <Link
            href="/admin/integrations"
            className="text-sm text-gray-300 hover:text-white"
          >
            Back to Integrations
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {integrations.map((integration) => (
            <div
              key={integration.slug}
              className="rounded-xl border border-gray-800 bg-gray-900/70 p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    {integration.name}
                  </h2>
                  <p className="mt-2 text-sm text-gray-400">
                    {integration.description}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`rounded-full px-2 py-1 text-xs ${
                      integration.type === "marketplace"
                        ? "bg-emerald-500/20 text-emerald-200"
                        : "bg-purple-500/20 text-purple-200"
                    }`}
                  >
                    {integration.type === "marketplace" ? "Marketplace" : "Platform"}
                  </span>
                  <span
                    className={`rounded-full px-2 py-1 text-xs ${
                      integration.method === "api"
                        ? "bg-blue-500/20 text-blue-200"
                        : "bg-orange-500/20 text-orange-200"
                    }`}
                  >
                    {integration.method === "api" ? "API" : "Browser"}
                  </span>
                  <span className="rounded-full bg-gray-800 px-2 py-1 text-xs text-gray-300">
                    Added: {integrationCounts[integration.slug] ?? 0}
                  </span>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200"
                  type="button"
                  onClick={() => handleAdd(integration)}
                >
                  Add
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
