"use client";

import { useToast, Button, SectionHeader, SectionPanel } from "@/shared/ui";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

import { useCreateIntegration } from "@/features/integrations/hooks/useIntegrationMutations";
import { useIntegrations } from "@/features/integrations/hooks/useIntegrationQueries";



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

export default function AddIntegrationPage() {
  const router = useRouter();
  const integrationsQuery = useIntegrations();
  const createIntegrationMutation = useCreateIntegration();
  const { toast } = useToast();

  useEffect(() => {
    if (!integrationsQuery.isError) return;
    const message =
      integrationsQuery.error instanceof Error
        ? integrationsQuery.error.message
        : "Failed to load integrations.";
    toast(message, { variant: "error" });
  }, [integrationsQuery.error, integrationsQuery.isError, toast]);

  const handleAdd = async (integration: (typeof integrations)[number]) => {
    try {
      await createIntegrationMutation.mutateAsync({
        name: integration.name,
        slug: integration.slug,
      });
      router.push("/admin/integrations");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to add integration.";
      toast(message, { variant: "error" });
    }
  };

  const integrationCounts = useMemo(() => {
    const data = integrationsQuery.data ?? [];
    return data.reduce<Record<string, number>>((acc, integration) => {
      acc[integration.slug] = (acc[integration.slug] || 0) + 1;
      return acc;
    }, {});
  }, [integrationsQuery.data]);

  return (
    <div className="container mx-auto py-10">
      <SectionPanel className="p-6">
        <SectionHeader
          title="Add Integrations"
          description="Select a marketplace connection to add to your map."
          eyebrow={(
            <Link href="/admin/integrations" className="text-blue-300 hover:text-blue-200">
              ← Back to integrations
            </Link>
          )}
          className="mb-6"
        />

        <div className="grid gap-6 md:grid-cols-2">
          {integrations.map((integration) => (
            <div
              key={integration.slug}
              className="rounded-xl border bg-card p-5"
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
                <Button
                  className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200"
                  type="button"
                  disabled={createIntegrationMutation.isPending}
                  onClick={() => { void handleAdd(integration); }}
                >
                  Add
                </Button>
              </div>
            </div>
          ))}
        </div>
      </SectionPanel>
    </div>
  );
}
