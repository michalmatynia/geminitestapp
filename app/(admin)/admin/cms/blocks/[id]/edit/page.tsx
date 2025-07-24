"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Block {
  id: string;
  name: string;
  content: any;
}

export default function EditBlockPage() {
  const [block, setBlock] = useState<Block | null>(null);
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  useEffect(() => {
    if (id) {
      void fetch(`/api/cms/blocks/${id}`)
        .then((res) => res.json())
        .then(setBlock);
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!block) return;

    await fetch(`/api/cms/blocks/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...block, content: JSON.parse(block.content) }),
    });
    router.push("/admin/cms/blocks");
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
            value={JSON.stringify(block.content, null, 2)}
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
