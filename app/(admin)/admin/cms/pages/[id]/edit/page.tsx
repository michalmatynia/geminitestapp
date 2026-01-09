"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import CmsLayout from "./layout";

interface Page {
  id: string;
  name: string;
  components: any[];
}

export default function EditPagePage() {
  const [page, setPage] = useState<Page | null>(null);
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  useEffect(() => {
    if (id) {
      void fetch(`/api/cms/pages/${id}`)
        .then((res) => res.json())
        .then(setPage);
    }
  }, [id]);

  const handleSave = async () => {
    if (!page) return;

    await fetch(`/api/cms/pages/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(page),
    });
    router.push("/admin/cms/pages");
  };

  if (!page) {
    return <div>Loading...</div>;
  }

  return (
    <CmsLayout page={page} setPage={setPage}>
      {/* Page preview will go here */}
      <div className="flex justify-end">
        <Button onClick={handleSave}>Save</Button>
      </div>
    </CmsLayout>
  );
}
