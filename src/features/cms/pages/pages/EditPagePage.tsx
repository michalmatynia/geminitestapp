"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/shared/ui/button";
import CmsEditorLayout from "@/features/cms/components/CmsEditorLayout";
import { fetchPage, updatePage } from "@/features/cms/api/pages";
import type { Page } from "@/features/cms/types";

export default function EditPagePage() {
  const [page, setPage] = useState<Page | null>(null);
  const router = useRouter();
  const { id } = useParams();

  useEffect(() => {
    if (!id) return;
    const loadPage = async () => {
      const data = await fetchPage(id as string);
      setPage(data);
    };
    void loadPage();
  }, [id]);

  const handleSave = async () => {
    if (!page || !id) return;

    await updatePage(id as string, page);
    router.push("/admin/cms/pages");
  };

  if (!page) {
    return <div>Loading...</div>;
  }

  return (
    <CmsEditorLayout>
      {/* Page preview will go here */}
      <div className="flex justify-end">
        <Button onClick={() => { void handleSave(); }}>Save</Button>
      </div>
    </CmsEditorLayout>
  );
}
