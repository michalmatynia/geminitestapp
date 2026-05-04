/**
 * UI Primitives - Public API
 * 
 * Centralized export of all UI primitive components for public consumption.
 * Provides:
 * - Consistent component API across the application
 * - Type-safe component props and variants
 * - Reusable design system components
 * - Accessibility-compliant implementations
 * - Standardized styling and behavior patterns
 * 
 * This module serves as the single source of truth for UI components,
 * ensuring consistency and maintainability across all features.
 */

// Dialog and Modal Components
export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from './alert-dialog';

// Notification and Feedback Components
export { Alert } from './alert';
export type { AlertVariant } from './alert';

// User Interface Elements
export { Avatar, AvatarImage, AvatarFallback } from './avatar';
export { Button, buttonVariants } from './button';
export type { ButtonProps } from './button';

// Layout and Container Components
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card';
export type { CardProps } from './card';
export { ClientOnly } from './client-only';
export { Checkbox } from './checkbox';
export {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
  CollapsibleSection,
} from './collapsible';
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  dialogOverlayClasses,
  dialogContentClasses,
} from './dialog';
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from './dropdown-menu';
export { Input, inputVariants } from './input';
export type { InputProps } from './input';
export { Label } from './label';
export { RadioGroup, RadioGroupItem } from './radio-group';
export {
  shouldUseNativeSelectMode,
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
} from './select';
export { Skeleton } from './skeleton';
export { Switch } from './switch';
export { Separator } from './separator';
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from './table';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';
export { Textarea } from './textarea';
export type { TextareaProps } from './textarea';
export { ToastProvider, useToast, useOptionalToast, useToastSettings } from './toast';
export type { Toast, ToastVariant, ToastOptions } from './toast';
export { Tooltip } from './tooltip';
export { Badge, badgeVariants } from './badge';
export type { BadgeProps } from './badge';
