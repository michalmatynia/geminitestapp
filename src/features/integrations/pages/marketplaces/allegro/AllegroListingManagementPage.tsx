import { SectionHeader, SectionPanel } from "@/shared/ui";
import Link from "next/link";


import React from "react";

export default function AllegroListingManagementPage(): React.JSX.Element {
  return (
    <div className="container mx-auto py-10">
      <SectionPanel className="p-6">
        <SectionHeader
          title="Listing Management"
          description="Track listing status, syncs, and actions for Allegro."
          eyebrow={(
            <Link
              href="/admin/integrations/marketplaces/allegro"
              className="text-blue-300 hover:text-blue-200"
            >
              ← Allegro
            </Link>
          )}
          className="mb-6"
        />

        <div className="rounded-md border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
          Listing management controls will appear here.
        </div>
      </SectionPanel>
    </div>
  );
}
