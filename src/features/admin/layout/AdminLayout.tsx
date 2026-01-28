"use client";

import { Button } from "@/shared/ui";
import Link from "next/link";
import { ChevronLeftIcon } from "lucide-react";
import { useEffect } from "react";
import { AdminLayoutProvider, useAdminLayout } from "@/features/admin/context/AdminLayoutContext";
import { NoteSettingsProvider } from "@/features/notesapp";
import { usePathname } from "next/navigation";
import { UserNav } from "@/features/admin/components/UserNav";

import Menu from "@/features/admin/components/Menu";

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const {
    isMenuCollapsed,
    setIsMenuCollapsed,
    isProgrammaticallyCollapsed,
    setIsProgrammaticallyCollapsed,
  } = useAdminLayout();
  const pathname = usePathname();

  useEffect(() => {
    if (isProgrammaticallyCollapsed && pathname !== "/admin/cms/pages/create") {
      setIsMenuCollapsed(false);
      setIsProgrammaticallyCollapsed(false);
    }
  }, [
    pathname,
    isProgrammaticallyCollapsed,
    setIsMenuCollapsed,
    setIsProgrammaticallyCollapsed,
  ]);

  const handleToggleCollapse = () => {
    setIsMenuCollapsed(!isMenuCollapsed);
    setIsProgrammaticallyCollapsed(false);
  };

  return (
    <div className="dark flex h-screen bg-gray-900 text-white">
      <aside
        className={`flex h-full flex-col transition-all duration-300 bg-gray-800 p-4 ${
          isMenuCollapsed ? "w-20" : "w-64"
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          {!isMenuCollapsed && (
            <h1 className="text-2xl font-bold">
              <Link href="/admin">Admin</Link>
            </h1>
          )}
          <Button
            onClick={handleToggleCollapse}
            className="p-2 rounded-full hover:bg-gray-700"
          >
            <ChevronLeftIcon
              className={`transition-transform duration-300 ${
                isMenuCollapsed ? "rotate-180" : ""
              }`}
            />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto pr-1">
          <Menu />
        </div>
      </aside>
      <div className="relative flex-1 flex flex-col min-w-0">
        <header className="absolute top-0 right-0 z-10 flex h-14 items-center px-6 pointer-events-none">
          <div className="pointer-events-auto">
            <UserNav />
          </div>
        </header>
        <main className="flex-1 p-4 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminLayoutProvider>
      <NoteSettingsProvider>
        <AdminLayoutContent>{children}</AdminLayoutContent>
      </NoteSettingsProvider>
    </AdminLayoutProvider>
  );
}
