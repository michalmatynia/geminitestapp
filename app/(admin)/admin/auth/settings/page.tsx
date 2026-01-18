"use client";

import { useEffect, useMemo, useState } from "react";

const AUTH_DB_PROVIDER_SETTING_KEY = "auth_db_provider";

type AuthDbProvider = "prisma" | "mongodb";

const providerOptions = [
  {
    value: "prisma",
    label: "Prisma (Postgres)",
    description: "Store users, sessions, and accounts in Postgres via Prisma.",
  },
  {
    value: "mongodb",
    label: "MongoDB",
    description: "Store users, sessions, and accounts in MongoDB collections.",
  },
];

export default function AuthSettingsPage() {
  const [provider, setProvider] = useState<AuthDbProvider>("prisma");
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const description = useMemo(
    () => providerOptions.find((option) => option.value === provider)?.description,
    [provider]
  );

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/settings");
        const data = (await response.json()) as Array<{ key: string; value: string }>;
        const match = data.find((item) => item.key === AUTH_DB_PROVIDER_SETTING_KEY);
        if (match?.value) {
          setProvider(match.value === "mongodb" ? "mongodb" : "prisma");
        }
      } catch {
        setError("Failed to load auth settings.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: AUTH_DB_PROVIDER_SETTING_KEY,
          value: provider,
        }),
      });
      if (!response.ok) {
        setError("Failed to save auth settings.");
      } else {
        setDirty(false);
      }
    } catch {
      setError("Failed to save auth settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg bg-gray-950 p-6 shadow-lg">
      <h1 className="text-3xl font-bold text-white">Auth Settings</h1>
      <p className="mt-2 text-sm text-gray-400">
        Choose which database powers authentication data.
      </p>
      {loading ? (
        <div className="mt-6 rounded-md border border-dashed border-gray-800 p-6 text-center text-gray-400">
          Loading auth settings...
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {error ? (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200">
              {error}
            </div>
          ) : null}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200" htmlFor="auth-provider">
              Database provider
            </label>
            <select
              id="auth-provider"
              className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-600"
              value={provider}
              onChange={(event) => {
                setProvider(event.target.value === "mongodb" ? "mongodb" : "prisma");
                setDirty(true);
              }}
            >
              {providerOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400">{description ?? ""}</p>
          </div>
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100">
            Switching auth data sources does not migrate existing user accounts.
          </div>
          <button
            className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200 disabled:cursor-not-allowed disabled:bg-gray-600 disabled:text-gray-300"
            type="button"
            disabled={!dirty || saving}
            onClick={handleSave}
          >
            {saving ? "Saving..." : "Save auth provider"}
          </button>
        </div>
      )}
    </div>
  );
}
