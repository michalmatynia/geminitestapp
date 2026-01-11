"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

const traderaIntegration = {
  name: "Tradera",
  slug: "tradera",
  description:
    "Sync and list products on Tradera with pricing and inventory rules.",
};

export default function IntegrationsAddPage() {
  const router = useRouter();

  const handleAdd = async () => {
    const res = await fetch("/api/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: traderaIntegration.name,
        slug: traderaIntegration.slug,
      }),
    });
    if (!res.ok) {
      const error = (await res.json()) as { error?: string };
      alert(error.error || "Failed to add integration.");
      return;
    }
    router.push("/admin/integrations");
  };

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
          <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {traderaIntegration.name}
                </h2>
                <p className="mt-2 text-sm text-gray-400">
                  {traderaIntegration.description}
                </p>
              </div>
              <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-xs text-emerald-200">
                Marketplace
              </span>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200"
                type="button"
                onClick={handleAdd}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
