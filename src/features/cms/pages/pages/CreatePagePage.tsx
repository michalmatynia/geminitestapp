"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { createPage } from "@/features/cms/api/pages";
import { fetchSlugs } from "@/features/cms/api/slugs";
import type { Slug } from "@/features/cms/types";
import { SectionHeader } from "@/shared/ui/section-header";

export default function CreatePagePage() {
  const [name, setName] = useState("");
  const [slugIds, setSlugIds] = useState<string[]>([]);
  const [slugs, setSlugs] = useState<Slug[]>([]);
  const router = useRouter();

  useEffect(() => {
    void fetchSlugs().then(setSlugs);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createPage({ name, slugIds });
    router.push("/admin/cms/pages");
  };

  return (
    <div className="container mx-auto py-10">
      <SectionHeader title="Create Page" className="mb-6" />
      <form onSubmit={(e) => { void handleSubmit(e); }}>
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
