"use client";

import { Button, Label, UnifiedSelect, useToast, useToastSettings, SectionHeader, SectionPanel } from "@/shared/ui";
import Link from "next/link";
import React, { useState } from "react";

const positionOptions = [
  { value: "top-right", label: "Top Right", description: "Corner top right" },
  { value: "top-left", label: "Top Left", description: "Corner top left" },
  { value: "bottom-right", label: "Bottom Right", description: "Corner bottom right" },
  { value: "bottom-left", label: "Bottom Left", description: "Corner bottom left" },
] as const;

const accentOptions = [
  { value: "emerald", label: "Emerald", color: "bg-emerald-500" },
  { value: "blue", label: "Blue", color: "bg-blue-500" },
  { value: "amber", label: "Amber", color: "bg-amber-500" },
  { value: "rose", label: "Rose", color: "bg-rose-500" },
  { value: "slate", label: "Slate", color: "bg-slate-500" },
] as const;

type PositionType = (typeof positionOptions)[number]["value"];
type AccentType = (typeof accentOptions)[number]["value"];

export function AdminNotificationsSettingsPage(): React.JSX.Element {
  const { settings, updateSettings } = useToastSettings();
  const { toast } = useToast();
  const [position, setPosition] = useState<PositionType>("top-right");
  const [accent, setAccent] = useState<AccentType>("emerald");

  const [prevSettings, setPrevSettings] = useState(settings);

  if (settings !== prevSettings) {
    setPrevSettings(settings);
    setPosition(settings.position ?? "top-right");
    setAccent(settings.accent ?? "emerald");
  }

  const handleSave = (): void => {
    updateSettings({ position, accent });
    toast("Notification settings saved successfully", { variant: "success" });
  };

  const showPreview = (variant: "success" | "error" | "info"): void => {
    const messages = {
      success: "This is a success notification",
      error: "This is an error notification",
      info: "This is an info notification",
    };
    toast(messages[variant], { variant });
  };

  const positionPreview: Record<PositionType, { x: string; y: string }> = {
    "top-right": { x: "right", y: "top" },
    "top-left": { x: "left", y: "top" },
    "bottom-right": { x: "right", y: "bottom" },
    "bottom-left": { x: "left", y: "bottom" },
  };

  const preview = positionPreview[position];
  const accentColor = accentOptions.find((option: { value: string; color: string }) => option.value === accent)?.color ?? "bg-emerald-500";

  return (
    <div className="container mx-auto py-10">
      <SectionHeader
        title="Notifications"
        description="Customize toast position, accent color, and preview behavior."
        eyebrow={(
          <Link href="/admin/settings" className="text-blue-300 hover:text-blue-200">
            ← Back to settings
          </Link>
        )}
        className="mb-8"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Settings Panel */}
        <div className="lg:col-span-2 space-y-6">
          <SectionPanel className="p-6">
            <div className="space-y-6">
              {/* Position Setting */}
              <div>
                <Label htmlFor="position" className="mb-3 block text-sm font-semibold">
                  Toast Position
                </Label>
                <UnifiedSelect
                  value={position}
                  onValueChange={(val: string) => setPosition(val as PositionType)}
                  options={positionOptions.map((opt: { value: string; label: string; description: string }) => ({
                    value: opt.value,
                    label: opt.label,
                    description: opt.description
                  }))}
                  placeholder="Select position"
                />
                <p className="mt-2 text-xs text-gray-400">
                  Choose where notifications appear on your screen.
                </p>
              </div>

              {/* Accent Color Setting */}
              <div className="pt-2">
                <Label htmlFor="accent" className="mb-3 block text-sm font-semibold">
                  Accent Color
                </Label>
                <UnifiedSelect
                  value={accent}
                  onValueChange={(val: string) => setAccent(val as AccentType)}
                  options={accentOptions.map((opt: { value: string; label: string; color: string }) => ({
                    value: opt.value,
                    label: opt.label,
                    description: opt.value === accent ? "Currently selected" : undefined
                  }))}
                  placeholder="Select accent color"
                />
                <p className="mt-2 text-xs text-gray-400">
                  Select the primary color for success notifications.
                </p>
              </div>

              {/* Color Palette Preview */}
              <div className="pt-2">
                <Label className="mb-3 block text-sm font-semibold">Available Colors</Label>
                <div className="grid grid-cols-5 gap-2">
                  {accentOptions.map((option: { value: string; label: string; color: string }) => (
                    <Button
                      key={option.value}
                      onClick={() => setAccent(option.value as AccentType)}
                      className={`group relative flex items-center justify-center rounded-lg px-3 py-2 transition-all ${
                        accent === option.value
                          ? "ring-2 ring-offset-2 ring-offset-gray-950 ring-white"
                          : "border hover:border-border/60"
                      }`}
                    >
                      <div className={`size-6 rounded-md ${option.color}`} />
                      <span className="absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-800 px-2 py-1 text-xs font-medium text-white group-hover:block">
                        {option.label}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 border-t border-border pt-6">
                <Button onClick={handleSave} className="gap-2">
                  Save Settings
                </Button>
                <Button variant="outline" onClick={() => showPreview("success")}>
                  Preview Success
                </Button>
                <Button variant="outline" onClick={() => showPreview("info")}>
                  Preview Info
                </Button>
                <Button variant="outline" onClick={() => showPreview("error")}>
                  Preview Error
                </Button>
              </div>
            </div>
          </SectionPanel>
        </div>

        {/* Preview Panel */}
        <div>
          <SectionPanel className="sticky top-6 p-6">
            <h2 className="mb-4 text-sm font-semibold text-white">Position Preview</h2>
            <SectionPanel variant="subtle" className="relative aspect-video w-full bg-gray-900">
              {/* Position indicator */}
              <div
                className={`absolute size-10 rounded-lg border-2 border-dashed border-emerald-400/50 bg-emerald-400/10 ${preview.x}-3 ${preview.y}-3 flex items-center justify-center`}
              >
                <div className="size-1 rounded-full bg-emerald-400" />
              </div>

              {/* Corner labels */}
              <div className="absolute left-2 top-2 text-xs text-gray-500">TL</div>
              <div className="absolute right-2 top-2 text-xs text-gray-500">TR</div>
              <div className="absolute bottom-2 left-2 text-xs text-gray-500">BL</div>
              <div className="absolute bottom-2 right-2 text-xs text-gray-500">BR</div>
            </SectionPanel>

            <SectionPanel variant="subtle-compact" className="mt-4 space-y-2 bg-gray-900 p-3">
              <p className="text-xs font-medium text-gray-300">Current Settings:</p>
              <div className="space-y-1">
                <p className="flex items-center justify-between text-xs text-gray-400">
                  <span>Position:</span>
                  <span className="font-mono text-gray-300 capitalize">{position}</span>
                </p>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Accent:</span>
                  <span className="flex items-center gap-1">
                    <span className={`size-2 rounded-full ${accentColor}`} aria-hidden="true" />
                    <span className="font-mono text-gray-300 capitalize">{accent}</span>
                  </span>
                </div>
              </div>
            </SectionPanel>

            <SectionPanel variant="subtle-compact" className="mt-4 border-blue-500/20 bg-blue-500/5 p-3">
              <p className="text-xs text-blue-200">
                💡 Click the preview buttons to see how notifications appear with your settings.
              </p>
            </SectionPanel>
          </SectionPanel>
        </div>
      </div>
    </div>
  );
}
