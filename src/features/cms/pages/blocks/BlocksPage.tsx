"use client";

import { Button, ListPanel, SectionHeader } from "@/shared/ui";
import { useEffect, useState } from "react";
import Link from "next/link";



import { deleteBlock, fetchBlocks } from "@/features/cms/api/blocks";
import type { Block } from "@/features/cms/types";

export default function BlocksPage() {
  const [blocks, setBlocks] = useState<Block[]>([]);

  useEffect(() => {
    void fetchBlocks().then(setBlocks);
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this block?")) {
      const result = await deleteBlock(id);
      if (result.ok) {
        setBlocks(blocks.filter((block) => block.id !== id));
      }
    }
  };

  return (
    <div className="container mx-auto py-10">
      <ListPanel
        header={
          <SectionHeader
            title="Blocks"
            actions={
              <Button asChild>
                <Link href="/admin/cms/blocks/create">Create Block</Link>
              </Button>
            }
          />
        }
      >
        <ul>
          {blocks.map((block) => (
            <li key={block.id} className="flex justify-between items-center py-2 border-b border">
              <Link href={`/admin/cms/blocks/${block.id}/edit`}>
                <span className="hover:underline">{block.name}</span>
              </Link>
              <Button variant="destructive" onClick={() => void handleDelete(block.id)}>Delete</Button>
            </li>
          ))}
        </ul>
      </ListPanel>
    </div>
  );
}
