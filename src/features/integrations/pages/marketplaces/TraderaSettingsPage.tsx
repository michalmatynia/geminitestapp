"use client";



import React from "react";

export default function TraderaSettingsPage(): React.JSX.Element {
  return (
    <div className="container mx-auto py-10">
      <SectionPanel className="p-6">
        <SectionHeader
          title="Tradera Settings"
          description="Manage Tradera integration settings, sync rules, and credentials."
          className="mb-6"
        />
        <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          Settings panel coming soon.
        </div>
      </SectionPanel>
    </div>
  );
}
import { SectionHeader, SectionPanel } from "@/shared/ui";
