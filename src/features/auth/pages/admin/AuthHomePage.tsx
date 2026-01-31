"use client";

import React from "react";
import { SectionHeader, SectionPanel } from "@/shared/ui";
import Link from "next/link";


const cards = [
  {
    title: "Dashboard",
    description: "Overview of auth activity, sign-ins, and health.",
    href: "/admin/auth/dashboard",
  },
  {
    title: "Users",
    description: "Manage users, profiles, and account states.",
    href: "/admin/auth/users",
  },
  {
    title: "Permissions",
    description: "Roles, policies, and access controls.",
    href: "/admin/auth/permissions",
  },
  {
    title: "Settings",
    description: "Providers, sessions, and security settings.",
    href: "/admin/auth/settings",
  },
  {
    title: "User Pages",
    description: "Login, signup, and account flows.",
    href: "/admin/auth/user-pages",
  },
];

export default function AuthPage(): React.JSX.Element {
  return (
    <SectionPanel className="p-6">
      <SectionHeader
        title="Auth"
        description="Start building your authentication system."
        className="mb-6"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card: { title: string; description: string; href: string }) => (
          <Link
            key={card.title}
            href={card.href}
            className="rounded-md border border-border bg-gray-900 p-4 text-left transition hover:border hover:bg-muted/60"
          >
            <h2 className="text-lg font-semibold text-white">{card.title}</h2>
            <p className="mt-1 text-sm text-gray-400">{card.description}</p>
          </Link>
        ))}
      </div>
    </SectionPanel>
  );
}
