"use client";

import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronRightIcon } from "lucide-react";
import { useState } from "react";
import { useAdminLayout } from "@/lib/context/AdminLayoutContext";
import { useRouter } from "next/navigation";

interface CollapsibleMenuProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  href?: string;
}

export default function CollapsibleMenu({
  title,
  icon,
  children,
  href,
}: CollapsibleMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { isMenuCollapsed } = useAdminLayout();
  const router = useRouter();

  return (
    <Collapsible.Root
      open={isOpen}
      onOpenChange={(nextOpen) => {
        setIsOpen(nextOpen);
        if (nextOpen && href) {
          router.push(href);
        }
      }}
    >
      <Collapsible.Trigger
        className="flex items-center justify-between w-full hover:bg-gray-700 p-2 rounded"
      >
        <div className="flex items-center">
          {icon}
          {!isMenuCollapsed && <span className="ml-2">{title}</span>}
        </div>
        {!isMenuCollapsed && (
          <ChevronRightIcon
            className={`transition-transform duration-200 ${
              isOpen ? "rotate-90" : ""
            }`}
          />
        )}
      </Collapsible.Trigger>
      <Collapsible.Content
        className={`pl-4 ${isMenuCollapsed ? "hidden" : ""}`}
      >
        {children}
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
