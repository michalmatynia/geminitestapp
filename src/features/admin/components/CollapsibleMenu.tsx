'use client';

import * as Collapsible from '@radix-ui/react-collapsible';
import { ChevronRightIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useAdminLayoutState } from '@/features/admin/context/AdminLayoutContext';

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
}: CollapsibleMenuProps): React.ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  const { isMenuCollapsed } = useAdminLayoutState();
  const router = useRouter();

  return (
    <Collapsible.Root
      open={isOpen}
      onOpenChange={(nextOpen: boolean) => {
        setIsOpen(nextOpen);
        if (nextOpen && href) {
          router.push(href);
        }
      }}
    >
      <Collapsible.Trigger className='flex items-center justify-between w-full hover:bg-gray-700 p-2 rounded'>
        <div className='flex items-center'>
          {icon}
          {!isMenuCollapsed && <span className='ml-2'>{title}</span>}
        </div>
        {!isMenuCollapsed && (
          <ChevronRightIcon
            className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
          />
        )}
      </Collapsible.Trigger>
      <Collapsible.Content className={`pl-4 ${isMenuCollapsed ? 'hidden' : ''}`}>
        {children}
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
