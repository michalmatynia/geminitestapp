import Link from "next/link";
import { SectionHeader } from "@/shared/components/section-header";
import { SectionPanel } from "@/shared/components/section-panel";

export const dynamic = "force-dynamic";

const marketplaces = [
  {
    name: "Allegro",
    description:
      "Manage Allegro listings, connections, mappings, and templates.",
    href: "/admin/integrations/marketplaces/allegro",
  },
  {
    name: "Category Mapper",
    description:
      "Map external marketplace categories to your internal product categories for import/export.",
    href: "/admin/integrations/marketplaces/category-mapper",
  },
];

export default function MarketplacesPage() {
  return (
    <SectionPanel className="p-6">
      <SectionHeader
        title="Marketplaces"
        description="Configure and manage external marketplaces for product listings."
        className="mb-6"
      />

      <div className="grid gap-4 md:grid-cols-2">
        {marketplaces.map((marketplace) => (
          <Link
            key={marketplace.name}
            href={marketplace.href}
            className="rounded-md border border-border bg-gray-900 p-4 transition hover:border-border/60"
          >
            <h2 className="text-lg font-semibold text-white">
              {marketplace.name}
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              {marketplace.description}
            </p>
          </Link>
        ))}
      </div>
    </SectionPanel>
  );
}
