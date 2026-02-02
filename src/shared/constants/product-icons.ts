import {
  Package,
  ShoppingCart,
  Tag,
  Star,
  Heart,
  Zap,
  Gift,
  Truck,
  DollarSign,
  Award,
  Box,
  Sparkles,
  Pin,
  type LucideIcon,
} from "lucide-react";

export const PRODUCT_ICONS = [
  { id: "package", icon: Package, label: "Package" },
  { id: "shopping-cart", icon: ShoppingCart, label: "Shopping Cart" },
  { id: "tag", icon: Tag, label: "Tag" },
  { id: "star", icon: Star, label: "Star" },
  { id: "heart", icon: Heart, label: "Heart" },
  { id: "zap", icon: Zap, label: "Lightning" },
  { id: "gift", icon: Gift, label: "Gift" },
  { id: "truck", icon: Truck, label: "Truck" },
  { id: "dollar-sign", icon: DollarSign, label: "Dollar" },
  { id: "award", icon: Award, label: "Award" },
  { id: "box", icon: Box, label: "Box" },
  { id: "sparkles", icon: Sparkles, label: "Sparkles" },
  { id: "pin", icon: Pin, label: "Pin" },
] as const;

export const PRODUCT_ICON_MAP: Record<string, LucideIcon> = PRODUCT_ICONS.reduce(
  (acc: Record<string, LucideIcon>, { id, icon }: { id: string; icon: LucideIcon }) => ({ ...acc, [id]: icon }),
  {} as Record<string, LucideIcon>
);

export type ProductIconId = (typeof PRODUCT_ICONS)[number]["id"];
