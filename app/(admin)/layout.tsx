"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ChevronLeftIcon,
  PackageIcon,
  FileIcon,
  DatabaseIcon,
  BookOpenIcon,
  SettingsIcon,
  UploadIcon,
} from "lucide-react";
import CollapsibleMenu from "@/components/CollapsibleMenu";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <aside
        className={`transition-all duration-300 bg-gray-800 p-4 ${
          isMenuCollapsed ? "w-20" : "w-64"
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          {!isMenuCollapsed && (
            <h1 className="text-2xl font-bold">
              <Link href="/admin">Admin</Link>
            </h1>
          )}
          <button
            onClick={() => setIsMenuCollapsed(!isMenuCollapsed)}
            className="p-2 rounded-full hover:bg-gray-700"
          >
            <ChevronLeftIcon
              className={`transition-transform duration-300 ${
                isMenuCollapsed ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>
        <nav className="flex flex-col space-y-2">
          <CollapsibleMenu title="Products" isMenuCollapsed={isMenuCollapsed} icon={<PackageIcon />}>
            <Link href="/admin/products" className="block hover:bg-gray-700 p-2 rounded">All Products</Link>
            <Link href="/admin/products/create" className="block hover:bg-gray-700 p-2 rounded">Create Product</Link>
          </CollapsibleMenu>
          <Link href="/admin/files" className="flex items-center hover:bg-gray-700 p-2 rounded">
            <FileIcon className="mr-2" />
            {!isMenuCollapsed && "Files"}
          </Link>
          <Link href="/admin/databases" className="flex items-center hover:bg-gray-700 p-2 rounded">
            <DatabaseIcon className="mr-2" />
            {!isMenuCollapsed && "Databases"}
          </Link>
          <CollapsibleMenu title="CMS" isMenuCollapsed={isMenuCollapsed} icon={<BookOpenIcon />}>
            <Link href="/admin/cms/slugs" className="block hover:bg-gray-700 p-2 rounded">Slugs</Link>
            <Link href="/admin/cms/slugs/create" className="block hover:bg-gray-700 p-2 rounded">Create Slug</Link>
            <Link href="/admin/cms/pages" className="block hover:bg-gray-700 p-2 rounded">Pages</Link>
            <Link href="/admin/cms/pages/create" className="block hover:bg-gray-700 p-2 rounded">Create Page</Link>
            <Link href="/admin/cms/blocks" className="block hover:bg-gray-700 p-2 rounded">Blocks</Link>
            <Link href="/admin/cms/blocks/create" className="block hover:bg-gray-700 p-2 rounded">Create Block</Link>
          </CollapsibleMenu>
          <Link href="/admin/settings" className="flex items-center hover:bg-gray-700 p-2 rounded">
            <SettingsIcon className="mr-2" />
            {!isMenuCollapsed && "Settings"}
          </Link>
          <Link href="/admin/import" className="flex items-center hover:bg-gray-700 p-2 rounded">
            <UploadIcon className="mr-2" />
            {!isMenuCollapsed && "Import"}
          </Link>
        </nav>
      </aside>
      <main className="flex-1 p-4 overflow-y-auto">{children}</main>
    </div>
  );
}
