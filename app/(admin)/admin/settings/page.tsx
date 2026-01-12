"use client";

import Link from "next/link";
import { BellIcon, SparklesIcon } from "lucide-react";

export default function SettingsHomePage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="mb-6 text-3xl font-bold text-white">Settings</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <Link
          href="/admin/settings/notifications"
          className="group rounded-lg border border-gray-800 bg-gray-950 p-6 shadow-lg transition hover:border-gray-700"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-200">
              <BellIcon className="size-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Notifications</h2>
              <p className="text-sm text-gray-400">
                Manage toast position, accent, and preview behavior.
              </p>
            </div>
          </div>
        </Link>
        <Link
          href="/admin/settings/ai"
          className="group rounded-lg border border-gray-800 bg-gray-950 p-6 shadow-lg transition hover:border-gray-700"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-200">
              <SparklesIcon className="size-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">AI</h2>
              <p className="text-sm text-gray-400">
                Configure GPT keys, model, and prompt templates.
              </p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
