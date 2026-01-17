import Link from "next/link";

const sections = [
  {
    name: "Parameter mapping",
    description: "Map product fields to Allegro parameters.",
    href: "/admin/products/marketplaces/allegro/parameter-mapping",
  },
  {
    name: "Listing management",
    description: "Monitor and manage active listings.",
    href: "/admin/products/marketplaces/allegro/listing-management",
  },
  {
    name: "Shipping price management",
    description: "Set shipping price rules and profiles.",
    href: "/admin/products/marketplaces/allegro/shipping-price-management",
  },
  {
    name: "Listing templates",
    description: "Create reusable listing templates.",
    href: "/admin/products/marketplaces/allegro/listing-templates",
  },
  {
    name: "Connections",
    description: "Configure Allegro accounts and tokens.",
    href: "/admin/products/marketplaces/allegro/connections",
  },
  {
    name: "Messages",
    description: "View marketplace communication and inquiries.",
    href: "/admin/products/marketplaces/allegro/messages",
  },
];

export default function AllegroMarketplacePage() {
  return (
    <div className="rounded-lg bg-gray-950 p-6 shadow-lg">
      <div className="mb-6">
        <Link
          href="/admin/products/marketplaces"
          className="text-xs font-semibold uppercase tracking-wide text-gray-400 hover:text-gray-200"
        >
          ← Marketplaces
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-white">Allegro</h1>
        <p className="mt-1 text-sm text-gray-400">
          Configure Allegro integrations and listing workflows.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => (
          <Link
            key={section.name}
            href={section.href}
            className="rounded-md border border-gray-800 bg-gray-900 p-4 transition hover:border-gray-600"
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
    </div>
  );
}
