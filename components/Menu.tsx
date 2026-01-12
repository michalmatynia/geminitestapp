"use client";

import Link from "next/link";
import {
  PackageIcon,
  FileIcon,
  DatabaseIcon,
  BookOpenIcon,
  SettingsIcon,
  UploadIcon,
  PlugIcon,
  MessageCircleIcon,
} from "lucide-react";
import CollapsibleMenu from "@/components/CollapsibleMenu";
import { useAdminLayout } from "@/lib/context/AdminLayoutContext";
import { useRouter } from "next/navigation";

export default function Menu() {
  const { isMenuCollapsed, setIsMenuCollapsed, setIsProgrammaticallyCollapsed } = useAdminLayout();
  const router = useRouter();

  const handleCreatePageClick = () => {
    setIsMenuCollapsed(true);
    setIsProgrammaticallyCollapsed(true);
    router.push("/admin/cms/pages/create");
  };

  return (
    <nav className="flex flex-col space-y-2">
      <CollapsibleMenu
        title="Products"
        icon={<PackageIcon />}
        href="/admin/products"
      >
        <Link
          href="/admin/products"
          className="block hover:bg-gray-700 p-2 rounded"
        >
          All Products
        </Link>
        <Link
          href="/admin/products/settings"
          className="block w-full text-left hover:bg-gray-700 p-2 rounded"
        >
          Settings
        </Link>
      </CollapsibleMenu>
      <Link
        href="/admin/files"
        className="flex items-center hover:bg-gray-700 p-2 rounded"
      >
        <FileIcon className="mr-2" />
        {!isMenuCollapsed && "Files"}
      </Link>
      <Link
        href="/admin/databases"
        className="flex items-center hover:bg-gray-700 p-2 rounded"
      >
        <DatabaseIcon className="mr-2" />
        {!isMenuCollapsed && "Databases"}
      </Link>
      <CollapsibleMenu title="CMS" icon={<BookOpenIcon />}>
        <Link
          href="/admin/cms/slugs"
          className="block hover:bg-gray-700 p-2 rounded"
        >
          Slugs
        </Link>
        <Link
          href="/admin/cms/slugs/create"
          className="block w-full text-left hover:bg-gray-700 p-2 rounded"
        >
          Create Slug
        </Link>
        <Link
          href="/admin/cms/pages"
          className="block hover:bg-gray-700 p-2 rounded"
        >
          Pages
        </Link>
        <button
          onClick={handleCreatePageClick}
          className="block w-full text-left hover:bg-gray-700 p-2 rounded"
        >
          Create Page
        </button>
        <Link
          href="/admin/cms/blocks"
          className="block hover:bg-gray-700 p-2 rounded"
        >
          Blocks
        </Link>
        <Link
          href="/admin/cms/blocks/create"
          className="block w-full text-left hover:bg-gray-700 p-2 rounded"
        >
          Create Block
        </Link>
      </CollapsibleMenu>
      <CollapsibleMenu title="Settings" icon={<SettingsIcon />}>
        <Link
          href="/admin/settings/notifications"
          className="block hover:bg-gray-700 p-2 rounded"
        >
          Notifications
        </Link>
        <Link
          href="/admin/settings/ai"
          className="block hover:bg-gray-700 p-2 rounded"
        >
          AI
        </Link>
      </CollapsibleMenu>
      <Link
        href="/admin/import"
        className="flex items-center hover:bg-gray-700 p-2 rounded"
      >
        <UploadIcon className="mr-2" />
        {!isMenuCollapsed && "Import"}
      </Link>
      <Link
        href="/admin/integrations"
        className="flex items-center hover:bg-gray-700 p-2 rounded"
      >
        <PlugIcon className="mr-2" />
        {!isMenuCollapsed && "Integrations"}
      </Link>
      <CollapsibleMenu title="Chatbot" icon={<MessageCircleIcon />}>
        <Link
          href="/admin/chatbot/sessions"
          className="block hover:bg-gray-700 p-2 rounded"
        >
          Sessions
        </Link>
        <Link
          href="/admin/chatbot"
          className="block hover:bg-gray-700 p-2 rounded"
        >
          Chat
        </Link>
        <Link
          href="/admin/chatbot/context"
          className="block hover:bg-gray-700 p-2 rounded"
        >
          Global Context
        </Link>
      </CollapsibleMenu>
    </nav>
  );
}
