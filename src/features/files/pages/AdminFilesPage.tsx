"use client";

import FileManager from "@/features/files/components/FileManager";
import { AdminPageLayout } from "@/shared/ui";

export function AdminFilesPage(): React.JSX.Element {
  return (
    <AdminPageLayout
      title="File Manager"
      description="Manage your uploads, backups, and shared assets."
    >
      <FileManager mode="view" />
    </AdminPageLayout>
  );
}
