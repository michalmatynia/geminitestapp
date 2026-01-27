"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { fetchBlock, updateBlock } from "@/features/cms/api/blocks";
import type { BlockForm } from "@/features/cms/types";

export default function EditBlockPage() {
  const [block, setBlock] = useState<BlockForm | null>(null);
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  useEffect(() => {
    if (id) {
      void fetchBlock(id).then((data) => {
        setBlock({
          id: data.id,
          name: data.name,
          content:
            typeof data.content === "string"
              ? data.content
              : JSON.stringify(data.content, null, 2),
        });
      });
    }
  }, [id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void (async () => {
      if (!block) return;

      await updateBlock(id, {
        name: block.name,
        content: JSON.parse(block.content) as unknown,
      });
      router.push("/admin/cms/blocks");
    })();
  };

  if (!block) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold">Edit Block</h1>
      <form onSubmit={handleSubmit} className="mt-6">
        <div className="mb-4">
          <Label htmlFor="name">Block Name</Label>
          <Input
            id="name"
            value={block.name}
            onChange={(e) => setBlock({ ...block, name: e.target.value })}
            required
          />
        </div>
        <div className="mb-4">
          <Label htmlFor="content">Content (JSON)</Label>
          <Textarea
            id="content"
            value={block.content}
            onChange={(e) => setBlock({ ...block, content: e.target.value })}
            rows={10}
            required
          />
        </div>
        <Button type="submit">Update</Button>
      </form>
    </div>
  );
}
