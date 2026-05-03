'use client';

import {
  ImageIcon,
  Languages,
  LayoutGrid,
  Link2,
  ListFilter,
  Package,
  Search,
  Settings2,
  ShieldAlert,
  Sparkles,
  Database,
  FileText,
} from 'lucide-react';
import { TabsList, TabsTrigger } from '@/shared/ui/tabs';
import type { ProductDraftOpenFormTab } from '@/shared/contracts/products';

type ProductFormTabDefinition = {
  value: ProductDraftOpenFormTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

export const PRODUCT_FORM_TABS: ProductFormTabDefinition[] = [
  { value: 'general', label: 'General', icon: Package },
  { value: 'other', label: 'Other', icon: Settings2 },
  { value: 'parameters', label: 'Parameters', icon: ListFilter },
  { value: 'images', label: 'Images', icon: ImageIcon },
  { value: 'studio', label: 'Studio', icon: Sparkles },
  { value: 'marketplace-copy', label: 'Marketplace Copy', icon: Languages },
  { value: 'custom-fields', label: 'Custom Fields', icon: LayoutGrid },
  { value: 'scans', label: 'Scans', icon: Search },
  { value: 'import-info', label: 'Import Info', icon: Database },
  { value: 'notes', label: 'Notes', icon: FileText },
  { value: 'note-link', label: 'Note Link', icon: Link2 },
  { value: 'validation', label: 'Validation', icon: ShieldAlert },
];

export function ProductFormTabsList(): React.JSX.Element {
  return (
    <TabsList
      className='h-auto w-full flex-wrap justify-start gap-2 rounded-xl border-border/60 bg-background/50 p-2'
      aria-label='Product form tabs'
    >
      {PRODUCT_FORM_TABS.map((tab) => {
        const Icon = tab.icon;
        return (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            aria-label={tab.label}
            title={tab.label}
            className='group min-w-12 justify-start gap-2 rounded-lg px-3 py-2'
          >
            <Icon className='h-4 w-4 shrink-0' />
            <span className='whitespace-nowrap text-sm leading-none opacity-90 transition-opacity duration-150 ease-out group-hover:opacity-100 group-focus-visible:opacity-100'>
              {tab.label}
            </span>
          </TabsTrigger>
        );
      })}
    </TabsList>
  );
}
