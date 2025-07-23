import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <nav className="bg-gray-800 text-white p-4">
        <div className="container mx-auto flex justify-between">
          <Link href="/admin" className="font-bold">
            Admin Dashboard
          </Link>
          <div className="space-x-4">
            <Link href="/admin/products">Products</Link>
            <Link href="/admin/files">Files</Link>
            <Link href="/admin/databases">Databases</Link>
            <Link href="/admin/settings">Settings</Link>
            <Link href="/admin/import">Import</Link>
          </div>
        </div>
      </nav>
      <main className="p-4">{children}</main>
    </div>
  );
}
