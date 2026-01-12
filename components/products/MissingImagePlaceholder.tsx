import { cn } from "@/lib/utils";

interface MissingImagePlaceholderProps {
  className?: string;
  label?: string;
}

export default function MissingImagePlaceholder({
  className,
  label = "No image",
}: MissingImagePlaceholderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-md border border-gray-800 bg-gray-900 text-[10px] font-medium uppercase tracking-wide text-gray-500",
        className
      )}
    >
      {label}
    </div>
  );
}
