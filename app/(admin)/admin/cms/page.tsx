import Link from "next/link";

export default function CmsPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold">CMS</h1>
      <p className="mt-4">Welcome to the Content Management System.</p>
      <div className="mt-6">
        <Link href="/admin/cms/slugs" className="text-lg font-semibold text-blue-500 hover:underline">
          Manage Slugs
        </Link>
      </div>
    </div>
  );
}
