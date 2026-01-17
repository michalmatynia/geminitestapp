"use client";

import Link from "next/link";
import { PlusIcon, SettingsIcon } from "lucide-react";
import { Integration, integrationDefinitions } from "../types";

type IntegrationListProps = {
  integrations: Integration[];
  onIntegrationClick: (definition: (typeof integrationDefinitions)[number]) => void;
};

export function IntegrationList({
  integrations,
  onIntegrationClick,
}: IntegrationListProps) {
  const integrationSlugs = integrations.map((integration) => integration.slug);
  const hasIntegrations = integrations.length > 0;

  return (
    <div className="rounded-lg bg-gray-950 p-6 shadow-lg">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Integrations</h1>
          <p className="mt-1 text-sm text-gray-400">
            Visualize and manage marketplace and platform connections.
          </p>
        </div>
        <Link
          href="/admin/integrations/add"
          className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200"
        >
          <PlusIcon className="size-4" />
          Add Integration
        </Link>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-gray-800 bg-gray-900/60 p-6">
        <div className="absolute -left-20 -top-20 size-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-24 right-10 size-72 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute -right-16 top-20 size-48 rounded-full bg-purple-500/10 blur-3xl" />

        <div className="relative mx-auto flex min-h-[420px] max-w-5xl items-center justify-center">
          <div className="relative z-10 flex flex-col items-center gap-6">
            <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-6 py-5 text-center text-white shadow-lg">
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">
                Core
              </p>
              <p className="mt-2 text-xl font-semibold">Stardb Hub</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {integrationSlugs.includes("tradera") && (
                <div className="flex items-center gap-2 rounded-full border border-sky-400/50 bg-sky-500/10 px-3 py-1.5 text-xs text-sky-200">
                  <span className="rounded bg-orange-500/30 px-1 py-0.5 text-[9px] uppercase tracking-wider text-orange-100">
                    Browser
                  </span>
                  Tradera
                  <button
                    type="button"
                    onClick={() => onIntegrationClick(integrationDefinitions[0])}
                    className="rounded-full border border-white/20 bg-white/10 p-1 text-white hover:bg-white/20"
                    aria-label="Manage Tradera settings"
                  >
                    <SettingsIcon className="size-3.5" />
                  </button>
                </div>
              )}
              {integrationSlugs.includes("allegro") && (
                <div className="flex items-center gap-2 rounded-full border border-amber-400/50 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200">
                  <span className="rounded bg-blue-500/30 px-1 py-0.5 text-[9px] uppercase tracking-wider text-blue-100">
                    API
                  </span>
                  Allegro
                  <button
                    type="button"
                    onClick={() => onIntegrationClick(integrationDefinitions[1])}
                    className="rounded-full border border-white/20 bg-white/10 p-1 text-white hover:bg-white/20"
                    aria-label="Manage Allegro settings"
                  >
                    <SettingsIcon className="size-3.5" />
                  </button>
                </div>
              )}
              {integrationSlugs.includes("baselinker") && (
                <div className="flex items-center gap-2 rounded-full border border-purple-400/50 bg-purple-500/10 px-3 py-1.5 text-xs text-purple-200">
                  <span className="rounded bg-purple-500/30 px-1 py-0.5 text-[9px] uppercase tracking-wider text-purple-100">
                    Platform
                  </span>
                  Baselinker
                  <button
                    type="button"
                    onClick={() => onIntegrationClick(integrationDefinitions[2])}
                    className="rounded-full border border-white/20 bg-white/10 p-1 text-white hover:bg-white/20"
                    aria-label="Manage Baselinker settings"
                  >
                    <SettingsIcon className="size-3.5" />
                  </button>
                </div>
              )}
              {!hasIntegrations && (
                <div className="text-xs text-gray-500">
                  No integrations added yet.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 text-xs text-gray-500 md:grid-cols-3">
          <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-3">
            Connect marketplaces and automate listings.
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-3">
            Monitor sync status and data flow.
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-3">
            Add new nodes to expand your stack.
          </div>
        </div>
      </div>
    </div>
  );
}
