"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeftIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast, useToastSettings } from "@/components/ui/toast";

const positionOptions = [
  { value: "top-right", label: "Top right" },
  { value: "top-left", label: "Top left" },
  { value: "bottom-right", label: "Bottom right" },
  { value: "bottom-left", label: "Bottom left" },
] as const;

const accentOptions = [
  { value: "emerald", label: "Emerald" },
  { value: "blue", label: "Blue" },
  { value: "amber", label: "Amber" },
  { value: "rose", label: "Rose" },
  { value: "slate", label: "Slate" },
] as const;

export default function NotificationSettingsPage() {
  const { settings, updateSettings } = useToastSettings();
  const { toast } = useToast();
  const [position, setPosition] = useState(settings.position);
  const [accent, setAccent] = useState(settings.accent);

  const handleSave = () => {
    updateSettings({ position, accent });
    toast("Notification settings saved", { variant: "success" });
  };

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/settings" aria-label="Back to settings">
            <ChevronLeftIcon className="size-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-white">Notifications</h1>
          <p className="text-sm text-gray-400">
            Control toast placement and styling.
          </p>
        </div>
      </div>
      <div className="max-w-xl rounded-lg border border-gray-800 bg-gray-950 p-6 shadow-lg">
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-200">
              Toast position
            </label>
            <Select
              value={position}
              onValueChange={(value) =>
                setPosition(value as typeof settings.position)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select position" />
              </SelectTrigger>
              <SelectContent>
                {positionOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-200">
              Accent color
            </label>
            <Select
              value={accent}
              onValueChange={(value) =>
                setAccent(value as typeof settings.accent)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select accent" />
              </SelectTrigger>
              <SelectContent>
                {accentOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={handleSave}>Save settings</Button>
          <Button
            variant="outline"
            onClick={() =>
              toast("This is a preview notification", { variant: "info" })
            }
          >
            Preview toast
          </Button>
        </div>
      </div>
    </div>
  );
}
