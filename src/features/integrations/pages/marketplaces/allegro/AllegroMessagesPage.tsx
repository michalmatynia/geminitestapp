import { SectionHeader, SectionPanel } from "@/shared/ui";
import Link from "next/link";


export default function AllegroMessagesPage() {
  return (
    <div className="container mx-auto py-10">
      <SectionPanel className="p-6">
        <SectionHeader
          title="Messages"
          description="View Allegro buyer messages and inquiries."
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
          Messaging tools will appear here.
        </div>
      </SectionPanel>
    </div>
  );
}
