"use client";

import { Button } from "@/shared/ui";
import { ChevronLeftIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { SessionProvider, useSession } from "next-auth/react";
import type { Session } from "next-auth";
import { AdminLayoutProvider, useAdminLayout } from "@/features/admin/context/AdminLayoutContext";
import { NoteSettingsProvider } from "@/features/notesapp/hooks/NoteSettingsContext";
import { usePathname } from "next/navigation";
import { UserNav } from "@/features/admin/components/UserNav";
import { useUserPreferences, useUpdateUserPreferencesMutation } from "@/features/auth/hooks/useUserPreferences";
import { AiInsightsNotificationsDrawer } from "@/features/admin/components/AiInsightsNotificationsDrawer";

import Menu from "@/features/admin/components/Menu";

function AdminLayoutContent({ children }: { children: React.ReactNode }): React.ReactNode {
  const {
    isMenuCollapsed,
    setIsMenuCollapsed,
    isProgrammaticallyCollapsed,
    setIsProgrammaticallyCollapsed,
  } = useAdminLayout();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const didUserToggleRef = useRef(false);
  const preferredMenuCollapsedRef = useRef(isMenuCollapsed);
  const programmaticCollapsedRef = useRef(false);
  const hydratedUserRef = useRef<string | null>(null);
  const menuCookieKey = "adminMenuCollapsed";
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);

  const { data: preferences } = useUserPreferences();
  const updatePreferencesMutation = useUpdateUserPreferencesMutation();

  const setMenuCookie = useCallback((collapsed: boolean): void => {
    if (typeof document === "undefined") return;
    const maxAge = 60 * 60 * 24 * 365;
    document.cookie = `${menuCookieKey}=${collapsed ? "true" : "false"}; path=/; max-age=${maxAge}; samesite=lax`;
  }, []);

  const persistMenuCollapsed = useCallback(async (collapsed: boolean): Promise<void> => {
    try {
      await updatePreferencesMutation.mutateAsync({ adminMenuCollapsed: collapsed });
    } catch (error) {
      console.warn("Failed to persist menu collapse preference.", error);
    }
  }, [updatePreferencesMutation]);

  useEffect(() => {
    programmaticCollapsedRef.current = isProgrammaticallyCollapsed;
  }, [isProgrammaticallyCollapsed]);

  useEffect(() => {
    const userId = session?.user?.id ?? null;
    if (status !== "authenticated" || !userId || hydratedUserRef.current === userId) return;

    if (preferences && typeof preferences.adminMenuCollapsed === "boolean") {
      if (didUserToggleRef.current || programmaticCollapsedRef.current) return;
      preferredMenuCollapsedRef.current = preferences.adminMenuCollapsed;
      setIsMenuCollapsed(preferences.adminMenuCollapsed);
      setMenuCookie(preferences.adminMenuCollapsed);
      hydratedUserRef.current = userId;
    }
  }, [session, status, preferences, setIsMenuCollapsed, setMenuCookie]);

  useEffect(() => {
    if (isProgrammaticallyCollapsed && pathname !== "/admin/cms/pages/create") {
      setIsMenuCollapsed(preferredMenuCollapsedRef.current);
      setIsProgrammaticallyCollapsed(false);
    }
  }, [
    pathname,
    isProgrammaticallyCollapsed,
    setIsMenuCollapsed,
    setIsProgrammaticallyCollapsed,
  ]);

  const handleToggleCollapse = (): void => {
    const nextCollapsed = !isMenuCollapsed;
    didUserToggleRef.current = true;
    preferredMenuCollapsedRef.current = nextCollapsed;
    setIsMenuCollapsed(nextCollapsed);
    setIsProgrammaticallyCollapsed(false);
    setMenuCookie(nextCollapsed);
    void persistMenuCollapsed(nextCollapsed);
  };

  return (
    <div className="dark flex h-screen bg-gray-900 text-white">
      <aside
        className={`flex h-full flex-col transition-all duration-300 bg-gray-800 p-4 ${
          isMenuCollapsed ? "w-20" : "w-64"
        }`}
      >
        <div className={`flex items-center mb-4 ${isMenuCollapsed ? "justify-center" : "justify-end"}`}>
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
            <div className="flex items-center gap-2">
              <UserNav onOpenAiWarnings={() => setAiDrawerOpen(true)} />
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 overflow-y-auto">{children}</main>
        <AiInsightsNotificationsDrawer open={aiDrawerOpen} onClose={() => setAiDrawerOpen(false)} />
      </div>
    </div>
  );
}

export function AdminLayout({
  children,
  initialMenuCollapsed = false,
  session = null,
}: {
  children: React.ReactNode;
  initialMenuCollapsed?: boolean;
  session?: Session | null;
}): React.ReactNode {
  return (
    <SessionProvider session={session}>
      <AdminLayoutProvider initialMenuCollapsed={initialMenuCollapsed}>
        <NoteSettingsProvider>
          <AdminLayoutContent>{children}</AdminLayoutContent>
        </NoteSettingsProvider>
      </AdminLayoutProvider>
    </SessionProvider>
  );
}
