"use client";

import { Button, Input, Label, Textarea, SectionHeader } from "@/shared/ui";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";




import { useCmsBlock, useUpdateBlock } from "@/features/cms/hooks/useCmsQueries";
import type { BlockForm } from "@/features/cms/types";

export default function EditBlockPageLoader() {
  const params = useParams();
  const id = params.id as string;
  const blockQuery = useCmsBlock(id);

  if (blockQuery.isLoading || !blockQuery.data) {
    return <div>Loading...</div>;
  }

  const initialBlock: BlockForm = {
    id: blockQuery.data.id,
    name: blockQuery.data.name,
    content:
      typeof blockQuery.data.content === "string"
        ? blockQuery.data.content
        : JSON.stringify(blockQuery.data.content, null, 2),
  };

  return <EditBlockForm initialBlock={initialBlock} id={id} />;
}

function EditBlockForm({ initialBlock, id }: { initialBlock: BlockForm; id: string }) {
  const [block, setBlock] = useState<BlockForm>(initialBlock);
  const router = useRouter();
  const updateBlock = useUpdateBlock();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void (async () => {
      await updateBlock.mutateAsync({
        id,
        input: {
          name: block.name,
          content: JSON.parse(block.content) as unknown,
        },
      });
      router.push("/admin/cms/blocks");
    })();
  };

  return (
    <div className="container mx-auto py-10">
      <SectionHeader title="Edit Block" className="mb-6" />
      <form onSubmit={handleSubmit}>
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
