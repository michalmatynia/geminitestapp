import { AdminLayout } from "@/features/admin";

export default function Layout({ children }: { children: React.ReactNode }): JSX.Element {
  return <AdminLayout>{children}</AdminLayout>;
}
