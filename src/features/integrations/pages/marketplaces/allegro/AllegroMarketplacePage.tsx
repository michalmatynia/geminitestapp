import { SectionHeader, SectionPanel } from "@/shared/ui";
import Link from "next/link";


const sections = [
  {
    name: "Parameter mapping",
    description: "Map product fields to Allegro parameters.",
    href: "/admin/integrations/marketplaces/allegro/parameter-mapping",
  },
  {
    name: "Listing management",
    description: "Monitor and manage active listings.",
    href: "/admin/integrations/marketplaces/allegro/listing-management",
  },
  {
    name: "Shipping price management",
    description: "Set shipping price rules and profiles.",
    href: "/admin/integrations/marketplaces/allegro/shipping-price-management",
  },
  {
    name: "Listing templates",
    description: "Create reusable listing templates.",
    href: "/admin/integrations/marketplaces/allegro/listing-templates",
  },
  {
    name: "Connections",
    description: "Configure Allegro accounts and tokens.",
    href: "/admin/integrations/marketplaces/allegro/connections",
  },
  {
    name: "Messages",
    description: "View marketplace communication and inquiries.",
    href: "/admin/integrations/marketplaces/allegro/messages",
  },
];

export default function AllegroMarketplacePage() {
  return (
    <div className="container mx-auto py-10">
      <SectionPanel className="p-6">
        <SectionHeader
          title="Allegro"
          description="Configure Allegro integrations and listing workflows."
          eyebrow={(
            <Link
              href="/admin/integrations/marketplaces"
              className="text-blue-300 hover:text-blue-200"
            >
              ← Marketplaces
            </Link>
          )}
          className="mb-6"
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sections.map((section) => (
            <Link
              key={section.name}
              href={section.href}
              className="rounded-md border bg-card p-4 transition hover:border-border/60"
            >
              <h2 className="text-lg font-semibold text-white">
                {section.name}
              </h2>
              <p className="mt-1 text-sm text-gray-400">
                {section.description}
              </p>
            </Link>
          ))}
        </div>
      </SectionPanel>
    </div>
  );
}
