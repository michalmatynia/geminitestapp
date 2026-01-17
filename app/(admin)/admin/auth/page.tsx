"use client";

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

export default function AuthPage() {
  return (
    <div className="rounded-lg bg-gray-950 p-6 shadow-lg">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">Auth</h1>
        <p className="mt-1 text-sm text-gray-400">
          Start building your authentication system.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="rounded-md border border-gray-800 bg-gray-900 p-4 text-left transition hover:border-gray-700 hover:bg-gray-900/80"
          >
            <h2 className="text-lg font-semibold text-white">{card.title}</h2>
            <p className="mt-1 text-sm text-gray-400">{card.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
