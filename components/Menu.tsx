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
  StickyNoteIcon,
} from "lucide-react";
import CollapsibleMenu from "@/components/CollapsibleMenu";
import { useAdminLayout } from "@/lib/context/AdminLayoutContext";
import { useRouter } from "next/navigation";

export default function Menu() {
  const { isMenuCollapsed, setIsMenuCollapsed, setIsProgrammaticallyCollapsed } = useAdminLayout();
  const router = useRouter();

  const handleOpenChat = async (
    event: React.MouseEvent<HTMLAnchorElement>
  ) => {
    if (typeof window === "undefined") return;
    event.preventDefault();
    const storedSession = window.localStorage.getItem("chatbotSessionId");
    if (storedSession) {
      router.push(`/admin/chatbot?session=${storedSession}`);
      return;
    }
    try {
      const listRes = await fetch("/api/chatbot/sessions");
      if (listRes.ok) {
        const data = (await listRes.json()) as {
          sessions?: Array<{ id: string }>;
        };
        const latestId = data.sessions?.[0]?.id;
        if (latestId) {
          window.localStorage.setItem("chatbotSessionId", latestId);
          router.push(`/admin/chatbot?session=${latestId}`);
          return;
        }
      }
      const createRes = await fetch("/api/chatbot/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!createRes.ok) {
        router.push("/admin/chatbot");
        return;
      }
      const created = (await createRes.json()) as { sessionId?: string };
      if (created.sessionId) {
        window.localStorage.setItem("chatbotSessionId", created.sessionId);
        router.push(`/admin/chatbot?session=${created.sessionId}`);
      } else {
        router.push("/admin/chatbot");
      }
    } catch {
      router.push("/admin/chatbot");
    }
  };

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
      <CollapsibleMenu
        title="Notes"
        icon={<StickyNoteIcon />}
        href="/admin/notes"
      >
        <Link
          href="/admin/notes"
          className="block hover:bg-gray-700 p-2 rounded"
        >
          Note List
        </Link>
        <Link
          href="/admin/notes/notebooks"
          className="block hover:bg-gray-700 p-2 rounded"
        >
          Notebooks
        </Link>
        <Link
          href="/admin/notes/tags"
          className="block hover:bg-gray-700 p-2 rounded"
        >
          Tags
        </Link>
        <Link
          href="/admin/notes/themes"
          className="block hover:bg-gray-700 p-2 rounded"
        >
          Themes
        </Link>
        <Link
          href="/admin/notes/settings"
          className="block hover:bg-gray-700 p-2 rounded"
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
      <CollapsibleMenu title="Chatbot" icon={<MessageCircleIcon />} href="/admin/chatbot">
        <Link
          href="/admin/chatbot/sessions"
          className="block hover:bg-gray-700 p-2 rounded"
        >
          Sessions
        </Link>
        <Link
          href="/admin/chatbot/jobs"
          className="block hover:bg-gray-700 p-2 rounded"
        >
          Jobs
        </Link>
        <Link
          href="/admin/chatbot"
          className="block hover:bg-gray-700 p-2 rounded"
          onClick={handleOpenChat}
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
