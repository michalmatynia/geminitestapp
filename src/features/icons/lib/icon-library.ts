import type { LucideIcon } from "lucide-react";
import { ICON_LIBRARY, ICON_LIBRARY_MAP, type IconLibraryId } from "./icon-sets";

export type IconLibraryItem = {
  id: string;
  label: string;
  icon: LucideIcon;
};

export { ICON_LIBRARY, ICON_LIBRARY_MAP };
export type { IconLibraryId };
