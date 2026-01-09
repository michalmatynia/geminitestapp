"use client";

import AdminLayout from "@/app/(admin)/layout";
import CmsSideMenu from "@/components/cms/CmsSideMenu";

interface Page {
  id: string;
  name: string;
  components: any[];
}

export default function CmsLayout({
  children,
  page,
  setPage,
}: {
  children: React.ReactNode;
  page: Page;
  setPage: React.Dispatch<React.SetStateAction<Page | null>>;
}) {
  return (
    <AdminLayout isCollapsed={true}>
      <div className="flex h-screen bg-gray-900 text-white">
        <CmsSideMenu page={page} setPage={setPage} />
        <main className="flex-1 p-4 overflow-y-auto">{children}</main>
      </div>
    </AdminLayout>
  );
}
