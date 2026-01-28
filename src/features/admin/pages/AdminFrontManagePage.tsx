"use client";

import { Button, useToast, SectionHeader, SectionPanel } from "@/shared/ui";
import { useMemo, useState } from "react";
import { SaveIcon } from "lucide-react";
import Link from "next/link";


import { cn } from "@/shared/utils";
import { useSettingsMap, useUpdateSetting } from "@/shared/hooks/useSettings";


type FrontAppOption = "products" | "chatbot" | "notes";

const FRONT_PAGE_SETTING_KEY = "front_page_app";

export function AdminFrontManagePage() {
  const settingsQuery = useSettingsMap();

  if (settingsQuery.isPending || !settingsQuery.data) {
    return (
      <div className="container mx-auto py-10">
        <div className="text-white">Loading front page settings...</div>
      </div>
    );
  }

  const current = settingsQuery.data.get(FRONT_PAGE_SETTING_KEY);
  const initialSelected: FrontAppOption =
    current === "products" || current === "chatbot" || current === "notes"
      ? current
      : "products";

  return <AdminFrontManageContent initialSelected={initialSelected} />;
}

function AdminFrontManageContent({
  initialSelected,
}: {
  initialSelected: FrontAppOption;
}) {
  const { toast } = useToast();
  const [selected, setSelected] = useState<FrontAppOption>(initialSelected);
  const updateSetting = useUpdateSetting();

  const options = useMemo(
    () => [
      {
        id: "products" as const,
        title: "Products",
        description: "Show the public product listing when visitors open the site.",
        route: "/",
      },
      {
        id: "chatbot" as const,
        title: "Chatbot",
        description: "Open the admin chatbot workspace on the home page.",
        route: "/admin/chatbot",
      },
      {
        id: "notes" as const,
        title: "Notes",
        description: "Open the admin notes workspace on the home page.",
        route: "/admin/notes",
      },
    ],
    []
  );

  const handleSave = async () => {
    try {
      await updateSetting.mutateAsync({
        key: FRONT_PAGE_SETTING_KEY,
        value: selected,
      });
      toast("Front page updated", { variant: "success" });
    } catch (error) {
      console.error("Failed to save front page setting:", error);
      toast("Failed to save front page setting", { variant: "error" });
    }
  };

  return (
    <div className="container mx-auto max-w-4xl py-10">
      <SectionHeader
        title="Front Manage"
        description="Pick which app should open when users land on the home page."
        eyebrow={(
          <Link href="/admin" className="text-blue-300 hover:text-blue-200">
            ← Back to dashboard
          </Link>
        )}
        className="mb-6"
      />

      <SectionPanel className="p-6">
        <SectionHeader
          title="Front Page Destination"
          description="Choose one application to serve as the entry point for your site."
          size="sm"
          className="mb-6"
        />
        <div className="space-y-4">
          <div className="grid gap-3">
            {options.map((option) => (
              <Button
                key={option.id}
                type="button"
                onClick={() => setSelected(option.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors",
                  selected === option.id
                    ? "border-blue-500/60 bg-blue-500/10 text-white"
                    : "border-border bg-card/40 text-gray-200 hover:border"
                )}
              >
                <div>
                  <div className="text-base font-semibold">{option.title}</div>
                  <div className="text-xs text-gray-400">{option.description}</div>
                </div>
                <div
                  className={cn(
                    "rounded-full border px-2 py-1 text-[10px] uppercase tracking-wide",
                    selected === option.id
                      ? "border-blue-500/60 text-blue-200"
                      : "border text-gray-400"
                  )}
                >
                  {option.route}
                </div>
              </Button>
            ))}
          </div>

          <div className="flex justify-end pt-4">
            <Button
              onClick={() => void handleSave()}
              disabled={updateSetting.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]"
            >
              {updateSetting.isPending ? "Saving..." : (
                <>
                  <SaveIcon className="mr-2 size-4" />
                  Save Selection
                </>
              )}
            </Button>
          </div>
        </div>
      </SectionPanel>
    </div>
  );
}
