"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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
      const res = await fetch("/api/cms/slugs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ slug }),
      });

      if (res.ok) {
        router.push("/admin/cms/slugs");
      } else {
        const data = await res.json() as { error?: string };
        setError(data.error || "Failed to create slug.");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    }
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold">Create Slug</h1>
      <form onSubmit={handleSubmit} className="mt-6">
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
