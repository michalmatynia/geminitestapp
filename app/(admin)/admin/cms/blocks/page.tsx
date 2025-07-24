"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Block {
  id: string;
  name: string;
}

export default function BlocksPage() {
  const [blocks, setBlocks] = useState<Block[]>([]);

  useEffect(() => {
    void fetch("/api/cms/blocks")
      .then((res) => res.json())
      .then(setBlocks);
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this block?")) {
      await fetch(`/api/cms/blocks/${id}`, {
        method: "DELETE",
      });
      setBlocks(blocks.filter((block) => block.id !== id));
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Blocks</h1>
        <Button asChild>
          <Link href="/admin/cms/blocks/create">Create Block</Link>
        </Button>
      </div>
      <div className="rounded-lg bg-gray-950 p-6 shadow-lg">
        <ul>
          {blocks.map((block) => (
            <li key={block.id} className="flex justify-between items-center py-2 border-b border-gray-700">
              <Link href={`/admin/cms/blocks/${block.id}/edit`}>
                <span className="hover:underline">{block.name}</span>
              </Link>
              <Button variant="destructive" onClick={() => handleDelete(block.id)}>Delete</Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
