import Link from "next/link";

const marketplaces = [
  {
    name: "Allegro",
    description:
      "Manage Allegro listings, connections, mappings, and templates.",
    href: "/admin/products/marketplaces/allegro",
  },
];

export default function MarketplacesPage() {
  return (
    <div className="rounded-lg bg-gray-950 p-6 shadow-lg">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">Marketplaces</h1>
        <p className="mt-1 text-sm text-gray-400">
          Configure and manage external marketplaces for product listings.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {marketplaces.map((marketplace) => (
          <Link
            key={marketplace.name}
            href={marketplace.href}
            className="rounded-md border border-gray-800 bg-gray-900 p-4 transition hover:border-gray-600"
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
    </div>
  );
}
