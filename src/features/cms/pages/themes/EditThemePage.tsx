"use client";

import React, { useState } from "react";
import { Button, Input, Label, SectionHeader } from "@/shared/ui";
import { useRouter, useParams } from "next/navigation";
import { useCmsTheme, useUpdateTheme } from "@/features/cms/hooks/useCmsQueries";
import type { CmsThemeColors, CmsThemeTypography, CmsThemeSpacing, CmsTheme } from "@/features/cms/types";

function ThemeEditor({ theme, id }: { theme: CmsTheme; id: string }): React.JSX.Element {
  const router = useRouter();
  const updateTheme = useUpdateTheme();

  const [name, setName] = useState<string>(() => theme.name);
  const [colors, setColors] = useState<CmsThemeColors>(() => theme.colors);
  const [typography, setTypography] = useState<CmsThemeTypography>(() => theme.typography);
  const [spacing, setSpacing] = useState<CmsThemeSpacing>(() => theme.spacing);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    await updateTheme.mutateAsync({ id, input: { name, colors, typography, spacing } });
    router.push("/admin/cms/themes");
  };

  const updateColor = (key: keyof CmsThemeColors, value: string): void => {
    setColors((prev: CmsThemeColors) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="container mx-auto max-w-2xl py-10">
      <SectionHeader title="Edit Theme" className="mb-6" />
      <form onSubmit={(e: React.FormEvent) => { void handleSubmit(e); }} className="space-y-6">
        <div className="space-y-1.5">
          <Label>Theme Name</Label>
          <Input value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} required />
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-gray-300">Colors</legend>
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(colors) as Array<keyof CmsThemeColors>).map((key: keyof CmsThemeColors) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs capitalize">{key}</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={colors[key]}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateColor(key, e.target.value)}
                    className="h-8 w-10 cursor-pointer rounded border border-border/50 bg-transparent p-0.5"
                  />
                  <Input
                    value={colors[key]}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateColor(key, e.target.value)}
                    className="flex-1 text-xs font-mono"
                    maxLength={7}
                  />
                </div>
              </div>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-gray-300">Typography</legend>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Heading Font</Label>
              <Input
                value={typography.headingFont}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTypography((p: CmsThemeTypography) => ({ ...p, headingFont: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Body Font</Label>
              <Input
                value={typography.bodyFont}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTypography((p: CmsThemeTypography) => ({ ...p, bodyFont: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Base Size (px)</Label>
              <Input
                type="number"
                value={typography.baseSize}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTypography((p: CmsThemeTypography) => ({ ...p, baseSize: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Heading Weight</Label>
              <Input
                type="number"
                value={typography.headingWeight}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTypography((p: CmsThemeTypography) => ({ ...p, headingWeight: Number(e.target.value) }))}
                min={100}
                max={900}
                step={100}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Body Weight</Label>
              <Input
                type="number"
                value={typography.bodyWeight}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTypography((p: CmsThemeTypography) => ({ ...p, bodyWeight: Number(e.target.value) }))}
                min={100}
                max={900}
                step={100}
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-gray-300">Spacing</legend>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Section Padding</Label>
              <Input
                value={spacing.sectionPadding}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSpacing((p: CmsThemeSpacing) => ({ ...p, sectionPadding: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Container Max Width</Label>
              <Input
                value={spacing.containerMaxWidth}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSpacing((p: CmsThemeSpacing) => ({ ...p, containerMaxWidth: e.target.value }))}
              />
            </div>
          </div>
        </fieldset>

        <Button type="submit" disabled={updateTheme.isPending || !name.trim()}>
          {updateTheme.isPending ? "Saving..." : "Save Theme"}
        </Button>
      </form>
    </div>
  );
}

export default function EditThemePage(): React.JSX.Element {
  const params = useParams();
  const id = params.id as string;
  const themeQuery = useCmsTheme(id);

  if (themeQuery.isLoading) {
    return (
      <div className="container mx-auto py-10">
        <p className="text-gray-500">Loading theme...</p>
      </div>
    );
  }

  if (!themeQuery.data) {
    return (
      <div className="container mx-auto py-10">
        <p className="text-red-500">Theme not found.</p>
      </div>
    );
  }

  return <ThemeEditor theme={themeQuery.data} id={id} />;
}