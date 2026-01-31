"use client";

import { Button } from "@/shared/ui";
import Link from "next/link";
import {
  PackageIcon,
  FileIcon,
  DatabaseIcon,
  BookOpenIcon,
  SettingsIcon,
  MessageCircleIcon,
  StickyNoteIcon,
  ShieldIcon,
  ActivityIcon,
  HomeIcon,
  GitBranchIcon,
  Plug,
  Box,
  AppWindow,
} from "lucide-react";
import CollapsibleMenu from "@/features/admin/components/CollapsibleMenu";
import { useAdminLayout } from "@/features/admin/context/AdminLayoutContext";
import { useRouter } from "next/navigation";

import { useEffect, useState } from "react";

export default function Menu(): React.ReactNode {
  const { isMenuCollapsed, setIsMenuCollapsed, setIsProgrammaticallyCollapsed } = useAdminLayout();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return <nav className="flex flex-col space-y-2" aria-hidden="true" />;
  }

  const handleOpenChat = (
    event: React.MouseEvent<HTMLAnchorElement>
  ): void => {
    if (typeof window === "undefined") return;
    event.preventDefault();

    const openChat = async (): Promise<void> => {
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

    void openChat();
  };

  const handleCreatePageClick = (): void => {
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
          href="/admin/drafts"
          className="block w-full text-left hover:bg-gray-700 p-2 rounded"
        >
          Drafts
        </Link>
        <Link
          href="/admin/products/constructor"
          className="block w-full text-left hover:bg-gray-700 p-2 rounded"
        >
          Constructor
        </Link>
        <Link
          href="/admin/products/settings"
          className="block w-full text-left hover:bg-gray-700 p-2 rounded"
        >
          Settings
        </Link>
      </CollapsibleMenu>
      <CollapsibleMenu
        title="Integrations"
        icon={<Plug />}
        href="/admin/integrations"
      >
        <Link
          href="/admin/integrations"
          className="block w-full text-left hover:bg-gray-700 p-2 rounded"
        >
          Connections
        </Link>
        <Link
          href="/admin/integrations/imports"
          className="block w-full text-left hover:bg-gray-700 p-2 rounded"
        >
          Imports
        </Link>
        <Link
          href="/admin/integrations/marketplaces"
          className="block w-full text-left hover:bg-gray-700 p-2 rounded"
        >
          Marketplaces
        </Link>
        <Link
          href="/admin/integrations/jobs"
          className="block w-full text-left hover:bg-gray-700 p-2 rounded"
        >
          Export Jobs
        </Link>
      </CollapsibleMenu>
      <CollapsibleMenu
        title="AI Paths"
        icon={<GitBranchIcon />}
        href="/admin/ai-paths"
      >
        <Link
          href="/admin/ai-paths"
          className="block hover:bg-gray-700 p-2 rounded"
        >
          Canvas
        </Link>
        <Link
          href="/admin/ai-paths/jobs"
          className="block hover:bg-gray-700 p-2 rounded"
        >
          AI Jobs
        </Link>
        <Link
          href="/admin/ai-paths/dead-letter"
          className="block hover:bg-gray-700 p-2 rounded"
        >
          Dead Letter Queue
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
      <CollapsibleMenu
        title="3D Assets"
        icon={<Box />}
        href="/admin/3d-assets"
      >
        <Link
          href="/admin/3d-assets"
          className="block hover:bg-gray-700 p-2 rounded"
        >
          Manage
        </Link>
        <Link
          href="/admin/3d-assets/list"
          className="block hover:bg-gray-700 p-2 rounded"
        >
          Asset List
        </Link>
      </CollapsibleMenu>
      <Link
        href="/admin/databases"
        className="flex items-center hover:bg-gray-700 p-2 rounded"
      >
        <DatabaseIcon className="mr-2" />
        {!isMenuCollapsed && "Databases"}
      </Link>
      <Link
        href="/admin/front-manage"
        className="flex items-center hover:bg-gray-700 p-2 rounded"
      >
        <HomeIcon className="mr-2" />
        {!isMenuCollapsed && "Front Manage"}
      </Link>
      <Link
        href="/admin/system/logs"
        className="flex items-center hover:bg-gray-700 p-2 rounded"
      >
        <ActivityIcon className="mr-2" />
        {!isMenuCollapsed && "System Logs"}
      </Link>
      <CollapsibleMenu title="CMS" icon={<BookOpenIcon />}>
        <Link
          href="/admin/cms/zones"
          className="block hover:bg-gray-700 p-2 rounded"
        >
          Zones
        </Link>
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
        <Link
          href="/admin/cms/builder"
          className="block hover:bg-gray-700 p-2 rounded"
        >
          Page Builder
        </Link>
        <Button
          onClick={handleCreatePageClick}
          className="block w-full text-left hover:bg-gray-700 p-2 rounded"
        >
          Create Page
        </Button>
      </CollapsibleMenu>
      <Link
        href="/admin/app-embeds"
        className="flex items-center hover:bg-gray-700 p-2 rounded"
      >
        <AppWindow className="mr-2" />
        {!isMenuCollapsed && "App Embeds"}
      </Link>
      <CollapsibleMenu title="Settings" icon={<SettingsIcon />}>
        <Link
          href="/admin/settings"
          className="block hover:bg-gray-700 p-2 rounded"
        >
          Overview
        </Link>
        <Link
          href="/admin/settings/notifications"
          className="block hover:bg-gray-700 p-2 rounded"
        >
          Notifications
        </Link>
        <Link
          href="/admin/settings/playwright"
          className="block hover:bg-gray-700 p-2 rounded"
        >
          Playwright Personas
        </Link>
        <Link
          href="/admin/settings/logging"
          className="block hover:bg-gray-700 p-2 rounded"
        >
          Logging
        </Link>
        <Link
          href="/admin/settings/recovery"
          className="block hover:bg-gray-700 p-2 rounded"
        >
          Transient Recovery
        </Link>
        <Link
          href="/admin/settings/database"
          className="block hover:bg-gray-700 p-2 rounded"
        >
          Database
        </Link>
      </CollapsibleMenu>
      <CollapsibleMenu title="Auth" icon={<ShieldIcon />} href="/admin/auth">
        <Link
          href="/admin/auth/dashboard"
          className="block hover:bg-gray-700 p-2 rounded"
        >
          Dashboard
        </Link>
        <Link
          href="/admin/auth/users"
          className="block hover:bg-gray-700 p-2 rounded"
        >
          Users
        </Link>
        <Link
          href="/admin/auth/permissions"
          className="block hover:bg-gray-700 p-2 rounded"
        >
          Permissions
        </Link>
        <Link
          href="/admin/auth/settings"
          className="block hover:bg-gray-700 p-2 rounded"
        >
          Settings
        </Link>
        <Link
          href="/admin/auth/user-pages"
          className="block hover:bg-gray-700 p-2 rounded"
        >
          User Pages
        </Link>
      </CollapsibleMenu>
      <CollapsibleMenu
        title="Agent Creator"
        icon={<ActivityIcon />}
        href="/admin/agentcreator"
      >
        <Link
          href="/admin/agentcreator/runs"
          className="block hover:bg-gray-700 p-2 rounded"
        >
          Runs
        </Link>
      </CollapsibleMenu>
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
        <Link
          href="/admin/settings/ai"
          className="block hover:bg-gray-700 p-2 rounded"
        >
          AI API Settings
        </Link>
      </CollapsibleMenu>
    </nav>
  );
}
