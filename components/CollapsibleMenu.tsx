"use client";

import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface CollapsibleMenuProps {
  title: string;
  children: React.ReactNode;
}

export default function CollapsibleMenu({
  title,
  children,
}: CollapsibleMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible.Root open={isOpen} onOpenChange={setIsOpen}>
      <Collapsible.Trigger className="flex items-center justify-between w-full hover:bg-gray-700 p-2 rounded">
        <span>{title}</span>
        <ChevronRightIcon
          className={`transition-transform duration-200 ${
            isOpen ? "rotate-90" : ""
          }`}
        />
      </Collapsible.Trigger>
      <Collapsible.Content className="pl-4">{children}</Collapsible.Content>
    </Collapsible.Root>
  );
}
