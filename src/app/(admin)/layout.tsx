import { JSX } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminLayout } from "@/features/admin/layout/AdminLayout";
import { SettingsStoreProvider } from "@/shared/providers/SettingsStoreProvider";
import { auth } from "@/features/auth/server";

export const dynamic = "force-dynamic";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}): Promise<JSX.Element> {
  let initialMenuCollapsed = false;
  let session = null;
  try {
    session = await auth();
    if (!session?.user) {
      redirect("/auth/signin");
    }
    if (session.user.accountDisabled || session.user.accountBanned) {
      redirect("/auth/signin?error=AccountDisabled");
    }
    const cookieStore = await cookies();
    const cookieValue = cookieStore.get("adminMenuCollapsed")?.value;
    if (cookieValue === "true" || cookieValue === "1") {
      initialMenuCollapsed = true;
    }
  } catch {
    redirect("/auth/signin");
  }
  return (
    <SettingsStoreProvider mode="admin">
      <AdminLayout session={session} initialMenuCollapsed={initialMenuCollapsed}>
        {children}
      </AdminLayout>
    </SettingsStoreProvider>
  );
}
