"use client";

import Link from "next/link";
import { BellIcon, SparklesIcon, ArrowRightIcon, Database } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type SettingsOption = {
  id: string;
  href: string;
  icon: typeof BellIcon;
  title: string;
  description: string;
  color: string;
  bgColor: string;
};

const settings: SettingsOption[] = [
  {
    id: "notifications",
    href: "/admin/settings/notifications",
    icon: BellIcon,
    title: "Notifications",
    description: "Manage toast position, accent color, and preview behavior.",
    color: "emerald",
    bgColor: "bg-emerald-500/10",
  },
  {
    id: "ai",
    href: "/admin/settings/ai",
    icon: SparklesIcon,
    title: "AI Settings",
    description: "Configure GPT keys, model selection, and prompt templates.",
    color: "blue",
    bgColor: "bg-blue-500/10",
  },
  {
    id: "database",
    href: "/admin/settings/database",
    icon: Database,
    title: "Database",
    description: "Select the global database provider for the entire app.",
    color: "amber",
    bgColor: "bg-amber-500/10",
  },
];

const colorClasses: Record<string, { border: string; text: string }> = {
  emerald: {
    border: "group-hover:border-emerald-500/50",
    text: "text-emerald-400",
  },
  blue: {
    border: "group-hover:border-blue-500/50",
    text: "text-blue-400",
  },
  amber: {
    border: "group-hover:border-amber-500/50",
    text: "text-amber-400",
  },
};

export default function SettingsHomePage() {
  return (
    <div className="container mx-auto py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="mt-2 text-sm text-gray-400">
          Customize your application preferences and configuration.
        </p>
      </div>

      {/* Settings Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {settings.map((setting) => {
          const Icon = setting.icon;
          const colors = colorClasses[setting.color] || colorClasses.emerald!;

          return (
            <Link key={setting.id} href={setting.href}>
              <Card className={`group relative h-full cursor-pointer border-gray-800 bg-gray-950 p-6 transition-all duration-300 hover:border-gray-700 hover:bg-gray-900 ${colors.border}`}>
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`flex size-12 flex-shrink-0 items-center justify-center rounded-lg ${setting.bgColor} transition-transform duration-300 group-hover:scale-110`}>
                    <Icon className={`size-6 ${colors.text}`} />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h2 className="text-lg font-semibold text-white transition-colors group-hover:text-gray-100">
                          {setting.title}
                        </h2>
                        <p className="mt-1 text-sm text-gray-400 group-hover:text-gray-300">
                          {setting.description}
                        </p>
                      </div>
                      <ArrowRightIcon className="mt-1 size-4 flex-shrink-0 text-gray-600 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-gray-400" />
                    </div>
                  </div>
                </div>

                {/* Hover effect indicator */}
                <div className="absolute inset-0 rounded-lg opacity-0 shadow-lg transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Help Section */}
      <Card className="mt-8 border-gray-800 bg-gray-950/50 p-6">
        <h3 className="text-sm font-semibold text-white">Need Help?</h3>
        <p className="mt-2 text-sm text-gray-400">
          Each setting section contains detailed explanations and preview options to help you customize your preferences.
        </p>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin">Back to Admin</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
