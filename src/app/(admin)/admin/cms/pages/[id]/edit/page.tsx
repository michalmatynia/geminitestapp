"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/shared/ui/button";
import CmsLayout from "./layout";

interface Page {
  id: string;
  name: string;
  components: unknown[];
}

export default function EditPagePage() {
  const [page, setPage] = useState<Page | null>(null);
  const router = useRouter();
  const { id } = useParams();

  useEffect(() => {
    if (!id) return;
    const fetchPage = async () => {
      const res = await fetch(`/api/cms/pages/${id as string}`);
      const data = (await res.json()) as Page;
      setPage(data);
    };
    void fetchPage();
  }, [id]);

  const handleSave = async () => {
    if (!page || !id) return;

    await fetch(`/api/cms/pages/${id as string}`, {
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
    <CmsLayout>
      {/* Page preview will go here */}
      <div className="flex justify-end">
        <Button onClick={() => { void handleSave(); }}>Save</Button>
      </div>
    </CmsLayout>
  );
}
