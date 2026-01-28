"use client";

import { Button, Input, Label, Textarea, SectionHeader } from "@/shared/ui";
import { useState } from "react";
import { useRouter } from "next/navigation";




import { createBlock } from "@/features/cms/api/blocks";

export default function CreateBlockPage() {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void (async () => {
      await createBlock({ name, content: JSON.parse(content) as unknown });
      router.push("/admin/cms/blocks");
    })();
  };

  return (
    <div className="container mx-auto py-10">
      <SectionHeader title="Create Block" className="mb-6" />
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <Label htmlFor="name">Block Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="mb-4">
          <Label htmlFor="content">Content (JSON)</Label>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            required
          />
        </div>
        <Button type="submit">Create</Button>
      </form>
    </div>
  );
}
