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

export const PLAYWRIGHT_SEQUENCER_ACTION_SLOTS: SequencerActionSlot[] = [];
