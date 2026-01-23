"use client";

import Link from "next/link";

export default function AuthSettingsPage() {
  return (
    <div className="rounded-lg bg-gray-950 p-6 shadow-lg">
      <h1 className="text-3xl font-bold text-white">Auth Settings</h1>
      <p className="mt-2 text-sm text-gray-400">
        Authentication data source is managed globally.
      </p>
      <div className="mt-6 rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
        Go to Settings → Database to choose the global provider for the entire app.
      </div>
      <div className="mt-4">
        <Link
          href="/admin/settings/database"
          className="text-sm font-semibold text-blue-400 underline"
        >
          Open Database Settings
        </Link>
      </div>
    </div>
  );
}
