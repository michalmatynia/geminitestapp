import type { ReactNode } from "react";
import { cn } from "@/shared/utils";

type SectionHeaderSize = "lg" | "md" | "sm";

const titleSizes: Record<SectionHeaderSize, string> = {
  lg: "text-3xl",
  md: "text-2xl",
  sm: "text-xl",
};

type SectionHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  eyebrow?: ReactNode;
  icon?: ReactNode;
  size?: SectionHeaderSize;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
};

export function SectionHeader({
  title,
  description,
  actions,
  eyebrow,
  icon,
  size = "lg",
  className,
  titleClassName,
  descriptionClassName,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between",
        className
      )}
    >
      <div className="space-y-2">
        {eyebrow ? <div className="text-sm text-muted-foreground">{eyebrow}</div> : null}
        <div className="flex items-center gap-3">
          {icon ? <div className="shrink-0">{icon}</div> : null}
          <h1
            className={cn(
              "font-bold tracking-tight text-white",
              titleSizes[size],
              titleClassName
            )}
          >
            {title}
          </h1>
        </div>
        {description ? (
          <p className={cn("text-sm text-gray-400", descriptionClassName)}>
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
