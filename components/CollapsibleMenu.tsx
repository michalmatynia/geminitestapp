"use client";

import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronRightIcon } from "lucide-react";
import { useState } from "react";

interface CollapsibleMenuProps {
  title: string;
  icon: React.ReactNode;
  isMenuCollapsed: boolean;
  children: React.ReactNode;
}

export default function CollapsibleMenu({
  title,
  icon,
  isMenuCollapsed,
  children,
}: CollapsibleMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible.Root open={isOpen} onOpenChange={setIsOpen}>
      <Collapsible.Trigger className="flex items-center justify-between w-full hover:bg-gray-700 p-2 rounded">
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
      {!isMenuCollapsed && (
        <Collapsible.Content className="pl-4">{children}</Collapsible.Content>
      )}
    </Collapsible.Root>
  );
}
