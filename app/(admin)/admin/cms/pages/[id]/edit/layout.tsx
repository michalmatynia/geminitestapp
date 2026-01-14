"use client";

import * as React from "react";
import AdminLayout from "@/app/(admin)/layout";
import CmsSideMenu from "@/components/cms/CmsSideMenu";
import { CmsPageProvider, useCmsPage } from "./cmsPageContext";

function CmsLayoutInner({ children }: { children: React.ReactNode }) {
  const { page, setPage } = useCmsPage();

  return (
    <AdminLayout>
      <div className="flex h-screen bg-gray-900 text-white">
        <CmsSideMenu page={page} setPage={setPage} />
        <main className="flex-1 p-4 overflow-y-auto">{children}</main>
      </div>
    </AdminLayout>
  );
}

export default function CmsLayout({ children }: { children: React.ReactNode }) {
  return (
    <CmsPageProvider>
      <CmsLayoutInner>{children}</CmsLayoutInner>
    </CmsPageProvider>
  );
}
