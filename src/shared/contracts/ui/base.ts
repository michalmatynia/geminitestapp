import type { ReactNode, MouseEvent } from 'react';

export type {
  LabeledOptionDto,
  LabeledOption,
  IdLabelOptionDto,
  IdLabelOption,
  LabelValueOptionDto,
  LabelValueOption,
  IdLabeledOptionDto,
  IdLabeledOption,
  LabeledOptionWithDescriptionDto,
  LabeledOptionWithDescription,
  LabeledOptionWithDisabledDto,
  LabeledOptionWithDisabled,
  ListResponse,
  IdDataDto,
  OptionalIdDataDto,
} from '../base';

/**
 * Unified modal component prop types
 */
export interface ModalStateProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export type DataAttributesDto = {
  'data-testid'?: string;
  'data-doc-id'?: string;
  'data-doc-alias'?: string;
};
export type DataAttributes = DataAttributesDto;

export type BreadcrumbItemDto = {
  label: string;
  href?: string;
  onClick?: (e: MouseEvent) => void;
};
export type BreadcrumbItem = BreadcrumbItemDto;

export type AdminBreadcrumbNodeDto = {
  label: string;
  href?: string;
};
export type AdminBreadcrumbNode = AdminBreadcrumbNodeDto;

export type AdminSectionBreadcrumbsConfigDto = {
  section: AdminBreadcrumbNode;
  current: string;
  parent?: AdminBreadcrumbNode;
};
export type AdminSectionBreadcrumbsConfig = AdminSectionBreadcrumbsConfigDto;

export type AdminSectionBreadcrumbWrapperPropsDto = {
  current: string;
  parent?: AdminBreadcrumbNode;
  className?: string;
};
export type AdminSectionBreadcrumbWrapperProps = AdminSectionBreadcrumbWrapperPropsDto;

export type AdminSectionBreadcrumbsPropsDto = DataAttributesDto & {
  section: AdminBreadcrumbNode;
  current: string;
  parent?: AdminBreadcrumbNode;
  className?: string;
  baseClassName?: string;
};
export type AdminSectionBreadcrumbsProps = AdminSectionBreadcrumbsPropsDto;

export type FileUploadHelpersDto = {
  setProgress: (value: number) => void;
  reportProgress: (loaded: number, total?: number) => void;
};
export type FileUploadHelpers = FileUploadHelpersDto;

export type FileUploadButtonPropsDto = {
  accept?: string;
  multiple?: boolean;
  enableDrop?: boolean;
  enablePaste?: boolean;
  showProgress?: boolean;
  onFilesSelected: (files: File[], helpers?: FileUploadHelpers) => void | Promise<void>;
  onError?: (error: unknown) => void;
};
export type FileUploadButtonProps = FileUploadButtonPropsDto;

export type FileUploadTriggerPropsDto = {
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  asChild?: boolean;
  preserveChildSemantics?: boolean;
  className?: string;
  enableDrop?: boolean;
  enablePaste?: boolean;
  showProgress?: boolean;
  onFilesSelected: (files: File[], helpers?: FileUploadHelpers) => void | Promise<void>;
  onError?: (error: unknown) => void;
  children: ReactNode;
};
export type FileUploadTriggerProps = FileUploadTriggerPropsDto;

export type CardVariant =
  | 'default'
  | 'compact'
  | 'subtle'
  | 'subtle-compact'
  | 'glass'
  | 'danger'
  | 'warning'
  | 'info'
  | 'success'
  | 'outline'
  | 'none';

export type CardPadding = 'default' | 'none' | 'sm' | 'md' | 'lg';

export type NavigationCardHeadingTag = 'h2' | 'h3' | 'p';

export type NavigationCardPropsDto = {
  description?: ReactNode;
  href: string;
  leading?: ReactNode;
  linkClassName?: string;
  title: ReactNode;
  ariaLabel?: string;
  titleAs?: NavigationCardHeadingTag;
  titleClassName?: string;
  descriptionClassName?: string;
  contentClassName?: string;
  trailing?: ReactNode;
  className?: string;
  variant?: CardVariant;
  padding?: CardPadding;
};
export type NavigationCardProps = NavigationCardPropsDto;

export type AlertVariant = 'default' | 'error' | 'warning' | 'success' | 'info';

export type DocumentationListVariant =
  | 'default'
  | 'warning'
  | 'recommendation'
  | 'error'
  | 'info';

export type DocumentationListItemDto = {
  label: ReactNode;
  value?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
};
export type DocumentationListItem = DocumentationListItemDto;

export type ToastVariant = 'success' | 'error' | 'info' | 'warning' | 'default';

export type ToastOptions = {
  variant?: ToastVariant;
  duration?: number;
  error?: unknown;
};

export type Toast = (message: string, options?: ToastOptions) => void;

export type StatusVariant =
  | 'pending'
  | 'active'
  | 'failed'
  | 'removed'
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'processing';
