import Link from 'next/link';
import React from 'react';

import { SectionHeader, SectionPanel } from '@/shared/ui';

export default function AllegroParameterMappingPage(): React.JSX.Element {
  return (
    <div className="container mx-auto py-10">
      <SectionPanel className="p-6">
        <SectionHeader
          title="Parameter Mapping"
          description="Define how product fields map to Allegro listing parameters."
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
          Mapping rules will appear here.
        </div>
      </SectionPanel>
    </div>
  );
}
