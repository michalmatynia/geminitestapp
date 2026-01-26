import Link from "next/link";

export default function CmsPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold">CMS</h1>
      <p className="mt-4">Welcome to the Content Management System.</p>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href="/admin/cms/slugs" className="block p-6 bg-gray-800 rounded-lg hover:bg-gray-700">
          <h2 className="text-xl font-bold">Manage Slugs</h2>
          <p className="mt-2 text-gray-400">Create and manage URL slugs for your pages.</p>
        </Link>
        <Link href="/admin/cms/pages" className="block p-6 bg-gray-800 rounded-lg hover:bg-gray-700">
          <h2 className="text-xl font-bold">Manage Pages</h2>
          <p className="mt-2 text-gray-400">Create and manage the content of your pages.</p>
        </Link>
      </div>
    </div>
  );
}
