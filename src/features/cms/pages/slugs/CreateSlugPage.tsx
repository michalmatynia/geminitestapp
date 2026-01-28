"use client";

import { Button, Input, Label, SectionHeader } from "@/shared/ui";
import { useState } from "react";
import { useRouter } from "next/navigation";



import { useCreateSlug } from "@/features/cms/hooks/useCmsQueries";
import { SLUG_REGEX } from "@/features/cms/validations/slug";

export default function CreateSlugPage() {
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const createSlug = useCreateSlug();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!SLUG_REGEX.test(slug)) {
      setError(
        "Invalid slug format. Use only lowercase letters, numbers, and hyphens."
      );
      return;
    }

    try {
      await createSlug.mutateAsync({ slug });
      router.push("/admin/cms/slugs");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    }
  };

  return (
    <div className="container mx-auto py-10">
      <SectionHeader title="Create Slug" className="mb-6" />
      <form onSubmit={(e) => void handleSubmit(e)}>
        <div className="mb-4">
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="e.g., my-awesome-page"
            required
          />
          {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
        <Button type="submit">Create</Button>
      </form>
    </div>
  );
}
