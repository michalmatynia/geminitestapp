import Link from "next/link";
import CollapsibleMenu from "@/components/CollapsibleMenu";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <aside className="w-64 bg-gray-800 p-4">
        <h1 className="text-2xl font-bold mb-4">
          <Link href="/admin">Admin Dashboard</Link>
        </h1>
        <nav className="flex flex-col space-y-2">
          <CollapsibleMenu title="Products">
            <Link href="/admin/products" className="block hover:bg-gray-700 p-2 rounded">All Products</Link>
            <Link href="/admin/products/create" className="block hover:bg-gray-700 p-2 rounded">Create Product</Link>
          </CollapsibleMenu>
          <Link href="/admin/files" className="hover:bg-gray-700 p-2 rounded">Files</Link>
          <Link href="/admin/databases" className="hover:bg-gray-700 p-2 rounded">Databases</Link>
          <CollapsibleMenu title="CMS">
            <Link href="/admin/cms/slugs" className="block hover:bg-gray-700 p-2 rounded">Slugs</Link>
            <Link href="/admin/cms/slugs/create" className="block hover:bg-gray-700 p-2 rounded">Create Slug</Link>
          </CollapsibleMenu>
          <Link href="/admin/settings" className="hover:bg-gray-700 p-2 rounded">Settings</Link>
          <Link href="/admin/import" className="hover:bg-gray-700 p-2 rounded">Import</Link>
        </nav>
      </aside>
      <main className="flex-1 p-4 overflow-y-auto">{children}</main>
    </div>
  );
}
