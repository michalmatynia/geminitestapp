"use client";

import Link from "next/link";
import {
  ChevronLeftIcon,
} from "lucide-react";
import { AdminLayoutProvider, useAdminLayout } from "@/lib/context/AdminLayoutContext";
import Menu from "@/components/Menu";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const { isMenuCollapsed, setIsMenuCollapsed, isProgrammaticallyCollapsed, setIsProgrammaticallyCollapsed } = useAdminLayout();
  const pathname = usePathname();

  useEffect(() => {
    if (isProgrammaticallyCollapsed && pathname !== '/admin/cms/pages/create') {
      setIsMenuCollapsed(false);
      setIsProgrammaticallyCollapsed(false);
    }
  }, [pathname, isProgrammaticallyCollapsed, setIsMenuCollapsed, setIsProgrammaticallyCollapsed]);

  const handleToggleCollapse = () => {
    setIsMenuCollapsed(!isMenuCollapsed);
    setIsProgrammaticallyCollapsed(false);
  }

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
            onClick={handleToggleCollapse}
            className="p-2 rounded-full hover:bg-gray-700"
          >
            <ChevronLeftIcon
              className={`transition-transform duration-300 ${
                isMenuCollapsed ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>
        <Menu />
      </aside>
      <main className="flex-1 p-4 overflow-y-auto">{children}</main>
    </div>
  );
}


export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminLayoutProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AdminLayoutProvider>
  );
}



