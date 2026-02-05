import { SectionHeader } from "./section-header";
import { Button } from "./button";
import { SectionPanel } from "./section-panel";
import type { ReactNode } from "react";

interface SettingsPageLayoutProps {
  title: string;
  description?: string;
  actions?: ReactNode; // For buttons in the header
  children: ReactNode; // The actual content of the settings page
  onSave?: () => Promise<void>;
  isSaving?: boolean;
}

export function SettingsPageLayout({
  title,
  description,
  actions,
  children,
  onSave,
  isSaving,
}: SettingsPageLayoutProps): React.JSX.Element {
  return (
    <div className="container mx-auto py-10">
      <SectionHeader
        title={title}
        className="mb-6"
        {...(description ? { description } : {})}
        {...(actions ? { actions } : {})}
      />
      <SectionPanel className="p-6">
        {children}
      </SectionPanel>
      {onSave && (
        <div className="flex justify-end mt-6">
          <Button onClick={() => void onSave()} disabled={isSaving} className="bg-white text-black hover:bg-gray-200">
            {isSaving ? "Saving..." : "Save Configuration"}
          </Button>
        </div>
      )}
    </div>
  );
}
