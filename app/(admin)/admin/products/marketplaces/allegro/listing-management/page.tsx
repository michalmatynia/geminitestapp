import Link from "next/link";

export default function AllegroListingManagementPage() {
  return (
    <div className="rounded-lg bg-gray-950 p-6 shadow-lg">
      <div className="mb-6">
        <Link
          href="/admin/products/marketplaces/allegro"
          className="text-xs font-semibold uppercase tracking-wide text-gray-400 hover:text-gray-200"
        >
          ← Allegro
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-white">
          Listing Management
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Track listing status, syncs, and actions for Allegro.
        </p>
      </div>

      <div className="rounded-md border border-dashed border-gray-800 bg-gray-900 p-4 text-sm text-gray-400">
        Listing management controls will appear here.
      </div>
    </div>
  );
}
