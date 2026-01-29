import { AdminLayout } from "@/features/admin";
import type { JSX } from "react";

export default function Layout({ children }: { children: React.ReactNode }): JSX.Element {
  return <AdminLayout>{children}</AdminLayout>;
}
