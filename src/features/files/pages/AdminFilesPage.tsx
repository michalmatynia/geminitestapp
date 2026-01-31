"use client";

import FileManager from "@/features/files/components/FileManager";

export function AdminFilesPage(): React.JSX.Element {
  return (
    <div>
      <FileManager mode="view" />
    </div>
  );
}
