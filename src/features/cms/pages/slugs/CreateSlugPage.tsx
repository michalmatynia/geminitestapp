"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { createSlug } from "@/features/cms/api/slugs";
import { SLUG_REGEX } from "@/features/cms/validations/slug";
import { SectionHeader } from "@/shared/ui/section-header";

export default function CreateSlugPage() {
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

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
      const { ok, payload } = await createSlug({ slug });
      if (ok) {
        router.push("/admin/cms/slugs");
      } else {
        const data = payload as { error?: string };
        setError(data.error || "Failed to create slug.");
      }
    } catch (_err) {
      setError("An unexpected error occurred.");
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
