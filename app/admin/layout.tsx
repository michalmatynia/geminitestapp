import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-black text-white">
      <aside className="w-64 bg-gray-950 p-6">
        <div className="mb-8">
          <Link href="/admin" className="text-2xl font-bold text-white hover:text-gray-300">
            Admin
          </Link>
        </div>
        <nav className="flex flex-col gap-4">
          <Link href="/admin" className="text-lg font-semibold text-gray-300 hover:text-white">
            Dashboard
          </Link>
          <Link href="/admin/products/create" className="text-lg font-semibold text-gray-300 hover:text-white">
            Create Product
          </Link>
        </nav>
      </aside>
      <main className="flex-1 bg-gray-900 p-6">{children}</main>
    </div>
  );
}