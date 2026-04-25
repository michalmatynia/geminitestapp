import { TRADERA_SETTINGS_KEYS } from '@/features/integrations/constants/tradera';

export type SequencerVariantKey = string;

export interface SequencerVariant {
  key: SequencerVariantKey;
  label: string;
  description: string;
  requiresAuth?: boolean;
  requiresApiCredentials?: boolean;
}

export interface SequencerActionSlot {
  /** Unique identifier for this action slot */
  key: string;
  label: string;
  description: string;
  /** Settings key used to persist the active variant */
  settingsKey: string;
  defaultVariant: SequencerVariantKey;
  variants: SequencerVariant[];
}

export const PLAYWRIGHT_SEQUENCER_ACTION_SLOTS: SequencerActionSlot[] = [
  {
    key: 'tradera_category_fetch',
    label: 'Tradera: Fetch Categories',
    description:
      'Controls which sequencer runs when categories are fetched for a Tradera connection.',
    settingsKey: TRADERA_SETTINGS_KEYS.categoryFetchMethod,
    defaultVariant: 'playwright_listing_form',
    variants: [
      {
        key: 'playwright_listing_form',
        label: 'Listing form picker',
        description:
          'Extracts categories from the dropdown on the Create Listing form. Requires an active authenticated session.',
        requiresAuth: true,
      },
    ],
  },
];
