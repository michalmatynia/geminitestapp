/**
 * Unified modal component prop types
 * 
 * Consolidates common modal prop patterns to reduce duplication across 34+ modals.
 * All modals should extend ModalStateProps for state management, and EntityModalProps
 * for modals that work with entities and their related collections.
 */

/**
 * Base modal state props - common to all modals
 * 
 * @example
 * ```typescript
 * interface MyModalProps extends ModalStateProps {
 *   // additional props...
 * }
 * ```
 */
export interface ModalStateProps {
  /** Whether the modal is currently open */
  isOpen: boolean;
  /** Callback fired when user closes the modal */
  onClose: () => void;
  /** Callback fired after successful save/delete */
  onSuccess?: () => void;
}

/**
 * Entity modal props - for modals that edit/view a single entity
 * 
 * Generic parameters:
 * - T: The main entity type being edited
 * - TList: The type of supporting data items (defaults to T)
 * 
 * @example
 * ```typescript
 * // Simple entity modal
 * type ProductModalProps = EntityModalProps<Product>;
 * 
 * // Entity with different supporting data
 * type CatalogModalProps = EntityModalProps<Catalog, PriceGroup>;
 * type CountryModalProps = EntityModalProps<Country, Currency>;
 * ```
 */
export interface EntityModalProps<T, TList = T> extends ModalStateProps {
  /** The entity being edited, or undefined for create mode */
  item?: T | null;
  /** Array of supporting/related items for selection */
  items?: TList[];
  /** Whether supporting items are currently loading */
  loading?: boolean;
  /** Optional default ID for first-time initialization */
  defaultId?: string;
  /** Optional error message to display */
  error?: string | null;
}

/**
 * Reusable modal header props - for common header rendering
 */
export interface ModalHeaderProps {
  /** Title to display in modal header */
  title: string;
  /** Whether an action is in progress (e.g., saving) */
  isLoading?: boolean;
  /** Whether to show a close button */
  showClose?: boolean;
  /** Optional description or subtitle */
  subtitle?: string;
}

/**
 * Reusable modal footer props - for common action buttons
 */
export interface ModalFooterProps {
  /** Label for save/submit button */
  saveLabel?: string;
  /** Label for cancel button */
  cancelLabel?: string;
  /** Whether save button is disabled */
  isSaveDisabled?: boolean;
  /** Whether an action is in progress */
  isLoading?: boolean;
  /** Called when save button is clicked */
  onSave?: () => void | Promise<void>;
}

/**
 * Modal content wrapper props - for common content area rendering
 */
export interface ModalContentProps {
  /** Content to display */
  children: React.ReactNode;
  /** Optional CSS class name */
  className?: string;
  /** Optional loading state */
  isLoading?: boolean;
}

/**
 * Simple modal template props
 * 
 * Use this for straightforward modals with minimal customization
 * 
 * @example
 * ```typescript
 * interface DeleteConfirmModalProps extends SimpleModalProps {
 *   itemName: string;
 * }
 * ```
 */
export interface SimpleModalProps extends ModalStateProps {
  /** Modal title */
  title: string;
  /** Whether an action is in progress */
  isLoading?: boolean;
  /** Optional error message */
  error?: string | null;
  /** Modal size (optional) */
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Multi-section modal props
 * 
 * Use this for modals with multiple tabs or sections
 * 
 * @example
 * ```typescript
 * interface IntegrationModalProps extends MultiSectionModalProps {
 *   sections: 'settings' | 'connection' | 'logs';
 * }
 * ```
 */
export interface MultiSectionModalProps extends ModalStateProps {
  /** Currently active section/tab */
  activeSection?: string;
  /** Callback when section changes */
  onSectionChange?: (section: string) => void;
  /** Optional error message */
  error?: string | null;
}

/**
 * Helper type to extract entity type from EntityModalProps
 * 
 * @example
 * ```typescript
 * type CatalogEntity = ExtractEntityType<typeof CatalogModalProps>;
 * ```
 */
export type ExtractEntityType<T extends EntityModalProps<unknown, unknown>> = T extends EntityModalProps<infer E, unknown> ? E : never;

/**
 * Helper type to extract list item type from EntityModalProps
 */
export type ExtractListItemType<T extends EntityModalProps<unknown, unknown>> = T extends EntityModalProps<unknown, infer L> ? L : never;
