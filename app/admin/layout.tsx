import Link from "next/link";
import { ModeToggle } from "@/components/theme-toggle";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="w-64 bg-muted/40 p-6 border-r">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/admin" className="text-2xl font-bold text-primary hover:text-primary/80">
            Admin
          </Link>
          <ModeToggle />
        </div>
        <nav className="flex flex-col gap-4">
          <Link href="/admin" className="text-lg font-semibold text-muted-foreground hover:text-foreground">
            Dashboard
          </Link>
          <Link href="/admin/products/create" className="text-lg font-semibold text-muted-foreground hover:text-foreground">
            Create Product
          </Link>
          <Link href="/admin/files" className="text-lg font-semibold text-muted-foreground hover:text-foreground">
            File Manager
          </Link>
          <Link href="/admin/settings" className="text-lg font-semibold text-muted-foreground hover:text-foreground">
            Settings
          </Link>
        </nav>
      </aside>
      <main className="flex-1 bg-background p-6">{children}</main>
    </div>
  );
}