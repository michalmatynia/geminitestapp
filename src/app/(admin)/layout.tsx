import { JSX } from "react";
import { AdminLayout } from "@/features/admin";
import { auth } from "@/features/auth/server";
import { getUserPreferences } from "@/features/auth/server";

export const dynamic = "force-dynamic";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}): Promise<JSX.Element> {
  let initialMenuCollapsed = false;
  try {
    const session = await auth();
    const userId = session?.user?.id ?? "default-user";
    const preferences = await getUserPreferences(userId);
    initialMenuCollapsed = Boolean(preferences.adminMenuCollapsed);
  } catch {
    initialMenuCollapsed = false;
  }
  return <AdminLayout initialMenuCollapsed={initialMenuCollapsed}>{children}</AdminLayout>;
}
