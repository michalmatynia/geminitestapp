import Link from "next/link";
import { SectionHeader } from "@/shared/ui/section-header";
import { SectionPanel } from "@/shared/ui/section-panel";

export default function AllegroShippingPriceManagementPage() {
  return (
    <div className="container mx-auto py-10">
      <SectionPanel className="p-6">
        <SectionHeader
          title="Shipping Price Management"
          description="Configure shipping price rules and profiles for Allegro listings."
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
          Shipping price rules will appear here.
        </div>
      </SectionPanel>
    </div>
  );
}
