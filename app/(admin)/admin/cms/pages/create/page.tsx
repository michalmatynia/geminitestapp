"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Slug {
  id: string;
  slug: string;
}

export default function CreatePagePage() {
  const [name, setName] = useState("");
  const [slugIds, setSlugIds] = useState<string[]>([]);
  const [slugs, setSlugs] = useState<Slug[]>([]);
  const router = useRouter();

  useEffect(() => {
    void fetch("/api/cms/slugs")
      .then((res) => res.json())
      .then(setSlugs);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/cms/pages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, slugIds }),
    });
    router.push("/admin/cms/pages");
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold">Create Page</h1>
      <form onSubmit={handleSubmit} className="mt-6">
        <div className="mb-4">
          <Label htmlFor="name">Page Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="mb-4">
          <Label htmlFor="slug">Slugs</Label>
          <Select onValueChange={(value) => setSlugIds([value])}>
            <SelectTrigger>
              <SelectValue placeholder="Select a slug" />
            </SelectTrigger>
            <SelectContent>
              {slugs.map((slug) => (
                <SelectItem key={slug.id} value={slug.id}>
                  /{slug.slug}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit">Create</Button>
      </form>
    </div>
  );
}
