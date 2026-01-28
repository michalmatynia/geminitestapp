"use client";

import { Button } from "@/shared/ui";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";

import CmsEditorLayout from "@/features/cms/components/CmsEditorLayout";
import { useCmsPage, useUpdatePage } from "@/features/cms/hooks/useCmsQueries";
import type { Page } from "@/features/cms/types";

export default function EditPagePageLoader() {
  const { id } = useParams();
  const pageQuery = useCmsPage(id as string | undefined);

  if (pageQuery.isLoading || !pageQuery.data) {
    return <div>Loading...</div>;
  }

  return <EditPageContent initialPage={pageQuery.data} id={id as string} />;
}

function EditPageContent({ initialPage, id }: { initialPage: Page; id: string }) {
  const [page] = useState<Page>(initialPage);
  const router = useRouter();
  const updatePage = useUpdatePage();

  const handleSave = async () => {
    if (!page) return;

    await updatePage.mutateAsync({ id, input: page });
    router.push("/admin/cms/pages");
  };

  return (
    <CmsEditorLayout>
      {/* Page preview will go here */}
      <div className="flex justify-end">
        <Button onClick={() => { void handleSave(); }}>Save</Button>
      </div>
    </CmsEditorLayout>
  );
}
