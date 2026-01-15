"use client";

import { Button } from "@/components/ui/button";

type ModalShellProps = {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  header?: React.ReactNode;
  bodyClassName?: string;
  size?: "md" | "lg" | "xl";
  showClose?: boolean;
};

export default function ModalShell({
  title,
  onClose,
  children,
  footer,
  header,
  bodyClassName,
  size = "xl",
  showClose = true,
}: ModalShellProps) {
  const sizeClass =
    size === "md"
      ? "max-w-2xl md:min-w-[640px]"
      : size === "lg"
        ? "max-w-4xl md:min-w-[800px]"
        : "max-w-6xl md:min-w-[960px]";

  return (
    <div className={`w-full rounded-lg bg-gray-950 p-6 shadow-lg ${sizeClass}`}>
      {header ? (
        <div className="mb-4">{header}</div>
      ) : (
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          {showClose ? (
            <Button
              type="button"
              onClick={onClose}
              className="bg-gray-800 text-white hover:bg-gray-700"
            >
              Close
            </Button>
          ) : null}
        </div>
      )}
      <div
        className={`h-[80vh] overflow-y-auto pr-2${bodyClassName ? ` ${bodyClassName}` : ""}`}
      >
        {children}
      </div>
      {footer ? <div className="mt-6 flex justify-end gap-2">{footer}</div> : null}
    </div>
  );
}
