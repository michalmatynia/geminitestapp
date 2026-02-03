"use client";

import { SearchInput, Tooltip } from "@/shared/ui";
import Link from "next/link";
import {
  PackageIcon,
  BookOpenIcon,
  SettingsIcon,
  MessageCircleIcon,
  StickyNoteIcon,
  ShieldIcon,
  ActivityIcon,
  BarChart3Icon,
  WorkflowIcon,
  HomeIcon,
  GitBranchIcon,
  Plug,
  AppWindow,
  ChevronRightIcon,
} from "lucide-react";
import { useAdminLayout } from "@/features/admin/context/AdminLayoutContext";
import { usePathname, useRouter } from "next/navigation";

import React, { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { cn } from "@/shared/utils";

type NavItem = {
  id: string;
  label: string;
  href?: string;
  icon?: React.ReactNode;
  keywords?: string[];
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  action?: () => void;
  children?: NavItem[];
};

const OPEN_KEY = "adminMenuOpenIds.v2";

const normalizeText = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[_/\\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const stripQuery = (href: string): string => href.split("?")[0] ?? href;

const isActiveHref = (pathname: string, href: string): boolean => {
  const baseHref = stripQuery(href);
  if (!baseHref) return false;
  if (pathname === baseHref) return true;
  if (baseHref === "/admin") return pathname === "/admin";
  return pathname.startsWith(`${baseHref}/`);
};

const matchesQuery = (item: NavItem, query: string): boolean => {
  if (!query) return true;
  const haystack = normalizeText(
    [
      item.label,
      item.href ? stripQuery(item.href) : "",
      ...(item.keywords ?? []),
    ].join(" ")
  );
  return haystack.includes(query);
};

const filterTree = (items: NavItem[], query: string): NavItem[] => {
  if (!query) return items;
  const next: NavItem[] = [];
  items.forEach((item: NavItem) => {
    const children = item.children ? filterTree(item.children, query) : [];
    if (matchesQuery(item, query) || children.length > 0) {
      next.push({ ...item, ...(children.length ? { children } : {}) });
    }
  });
  return next;
};

const collectGroupIds = (items: NavItem[]): Set<string> => {
  const ids = new Set<string>();
  const walk = (node: NavItem): void => {
    if (node.children && node.children.length > 0) {
      ids.add(node.id);
      node.children.forEach(walk);
    }
  };
  items.forEach(walk);
  return ids;
};

const collectActiveGroupIds = (items: NavItem[], pathname: string): Set<string> => {
  const active = new Set<string>();
  const walk = (node: NavItem): boolean => {
    const selfActiveRaw = node.href ? isActiveHref(pathname, node.href) : false;
    // Special-case: don't auto-open "section folders" that point to /admin itself.
    // Users expect clicking "Admin" (home) to not expand Workspace unless they explicitly open it.
    const selfActive =
      selfActiveRaw &&
      !(
        (node.children?.length ?? 0) > 0 &&
        node.href &&
        stripQuery(node.href) === "/admin" &&
        pathname === "/admin"
      );
    const childActive = (node.children ?? []).some(walk);
    if ((selfActive || childActive) && node.children && node.children.length > 0) {
      active.add(node.id);
    }
    return selfActive || childActive;
  };
  items.forEach(walk);
  return active;
};

function NavTree({
  items,
  depth,
  pathname,
  isCollapsed,
  openIds,
  forcedOpenIds,
  onToggleOpen,
}: {
  items: NavItem[];
  depth: number;
  pathname: string;
  isCollapsed: boolean;
  openIds: Set<string>;
  forcedOpenIds: Set<string>;
  onToggleOpen: (id: string) => void;
}): React.ReactNode {
  return (
    <div className={cn(depth === 0 ? "space-y-1.5" : "space-y-1")}>
      {items.map((item: NavItem) => {
        const hasChildren = !!item.children?.length;
        const active = item.href ? isActiveHref(pathname, item.href) : false;
        const isOpen = !isCollapsed && hasChildren && (forcedOpenIds.has(item.id) || openIds.has(item.id));

        const rowStyle: React.CSSProperties | undefined =
          isCollapsed
            ? undefined
            : {
                paddingLeft: 10 + depth * 14,
              };

        const rowClassName = cn(
          "group flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition cursor-pointer",
          active ? "bg-gray-700/60 text-white" : "text-gray-200 hover:bg-gray-700/40"
        );

        return (
          <div key={item.id}>
            {isCollapsed && depth === 0 ? (
              <Tooltip content={item.label} side="right">
                <div>
                  {item.href ? (
                    <Link
                      href={item.href}
                      prefetch={false}
                      {...(item.onClick ? { onClick: item.onClick } : {})}
                      className={cn(
                        "flex items-center justify-center rounded-md px-2 py-2 transition",
                        active ? "bg-gray-700/60 text-white" : "text-gray-200 hover:bg-gray-700/40"
                      )}
                    >
                      <span className="text-gray-200">{item.icon ?? <AppWindow className="size-4" />}</span>
                      <span className="sr-only">{item.label}</span>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={(): void => {
                        if (item.action) item.action();
                        if (!item.href && hasChildren) onToggleOpen(item.id);
                      }}
                      className={cn(
                        "flex w-full items-center justify-center rounded-md px-2 py-2 transition",
                        active ? "bg-gray-700/60 text-white" : "text-gray-200 hover:bg-gray-700/40"
                      )}
                    >
                      <span className="text-gray-200">{item.icon ?? <AppWindow className="size-4" />}</span>
                      <span className="sr-only">{item.label}</span>
                    </button>
                  )}
                </div>
              </Tooltip>
            ) : (
              <>
                {hasChildren ? (
                  <button
                    type="button"
                    onClick={(): void => {
                      if (item.action) {
                        item.action();
                        return;
                      }
                      onToggleOpen(item.id);
                    }}
                    className={rowClassName}
                    style={rowStyle}
                    aria-expanded={isOpen}
                    aria-controls={`${item.id}-children`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      {depth === 0 && item.icon ? (
                        <span className="shrink-0 text-gray-200">{item.icon}</span>
                      ) : depth > 0 ? (
                        <span className="shrink-0 text-gray-600">•</span>
                      ) : null}

                      <span className="min-w-0 truncate text-left">{item.label}</span>
                    </div>

                    <ChevronRightIcon
                      className={cn(
                        "size-4 shrink-0 text-gray-400 transition-transform duration-200",
                        isOpen ? "rotate-90" : ""
                      )}
                      aria-hidden="true"
                    />
                  </button>
                ) : item.href ? (
                  <Link
                    href={item.href}
                    prefetch={false}
                    {...(item.onClick ? { onClick: item.onClick } : {})}
                    className={rowClassName}
                    style={rowStyle}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      {depth === 0 && item.icon ? (
                        <span className="shrink-0 text-gray-200">{item.icon}</span>
                      ) : depth > 0 ? (
                        <span className="shrink-0 text-gray-600">•</span>
                      ) : null}
                      <span className="min-w-0 truncate">{item.label}</span>
                    </div>
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={(): void => {
                      if (item.action) item.action();
                    }}
                    className={rowClassName}
                    style={rowStyle}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      {depth === 0 && item.icon ? (
                        <span className="shrink-0 text-gray-200">{item.icon}</span>
                      ) : depth > 0 ? (
                        <span className="shrink-0 text-gray-600">•</span>
                      ) : null}
                      <span className="min-w-0 truncate text-left">{item.label}</span>
                    </div>
                  </button>
                )}

                {hasChildren && isOpen ? (
                  <div className="mt-1" id={`${item.id}-children`}>
                    <NavTree
                      items={item.children ?? []}
                      depth={depth + 1}
                      pathname={pathname}
                      isCollapsed={isCollapsed}
                      openIds={openIds}
                      forcedOpenIds={forcedOpenIds}
                      onToggleOpen={onToggleOpen}
                    />
                  </div>
                ) : null}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Menu(): React.ReactNode {
  const { isMenuCollapsed, setIsMenuCollapsed, setIsProgrammaticallyCollapsed } = useAdminLayout();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(OPEN_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setOpenIds(new Set(parsed.filter((id: unknown): id is string => typeof id === "string")));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(OPEN_KEY, JSON.stringify(Array.from(openIds)));
    } catch {
      // ignore
    }
  }, [mounted, openIds]);

  const handleOpenChat = useCallback((event: React.MouseEvent<HTMLAnchorElement>): void => {
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
  }, [router]);

  const handleCreatePageClick = useCallback((): void => {
    setIsMenuCollapsed(true);
    setIsProgrammaticallyCollapsed(true);
    router.push("/admin/cms/pages/create");
  }, [router, setIsMenuCollapsed, setIsProgrammaticallyCollapsed]);

  const nav: NavItem[] = useMemo(() => ([
    {
      id: "home",
      label: "Admin",
      href: "/admin",
      icon: <HomeIcon className="size-4" />,
      keywords: ["dashboard", "home"],
    },
    {
      id: "workspace",
      label: "Workspace",
      icon: <AppWindow className="size-4" />,
      children: [
        { id: "workspace/front-manage", label: "Front Manage", href: "/admin/front-manage" },
        { id: "workspace/import", label: "Import", href: "/admin/import" },
        { id: "workspace/files", label: "Files", href: "/admin/files" },
        { id: "workspace/databases", label: "Databases", href: "/admin/databases" },
        { id: "workspace/app-embeds", label: "App Embeds", href: "/admin/app-embeds" },
      ],
    },
    {
      id: "commerce",
      label: "Commerce",
      href: "/admin/products",
      icon: <PackageIcon className="size-4" />,
      children: [
        {
          id: "commerce/products",
          label: "Products",
          href: "/admin/products",
          children: [
            { id: "commerce/products/all", label: "All Products", href: "/admin/products" },
            { id: "commerce/products/drafts", label: "Drafts", href: "/admin/drafts" },
            { id: "commerce/products/builder", label: "Builder", href: "/admin/products/builder" },
            { id: "commerce/products/producers", label: "Producers", href: "/admin/products/producers" },
            { id: "commerce/products/preferences", label: "Preferences", href: "/admin/products/preferences" },
            { id: "commerce/products/settings", label: "Settings", href: "/admin/products/settings" },
          ],
        },
        {
          id: "commerce/assets",
          label: "Assets",
          href: "/admin/3d-assets",
          children: [
            { id: "commerce/assets/3d", label: "3D Assets", href: "/admin/3d-assets" },
            { id: "commerce/assets/3d-list", label: "3D Asset List", href: "/admin/3d-assets/list" },
          ],
        },
      ],
    },
    {
      id: "integrations",
      label: "Integrations",
      href: "/admin/integrations",
      icon: <Plug className="size-4" />,
      children: [
        { id: "integrations/connections", label: "Connections", href: "/admin/integrations" },
        { id: "integrations/add", label: "Add Integration", href: "/admin/integrations/add" },
        { id: "integrations/imports", label: "Imports", href: "/admin/integrations/imports" },
        {
          id: "integrations/marketplaces",
          label: "Marketplaces",
          href: "/admin/integrations/marketplaces",
          children: [
            {
              id: "integrations/marketplaces/allegro",
              label: "Allegro",
              href: "/admin/integrations/marketplaces/allegro",
              children: [
                { id: "integrations/marketplaces/allegro/connections", label: "Connections", href: "/admin/integrations/marketplaces/allegro/connections" },
                { id: "integrations/marketplaces/allegro/listing-management", label: "Listing Management", href: "/admin/integrations/marketplaces/allegro/listing-management" },
                { id: "integrations/marketplaces/allegro/listing-templates", label: "Listing Templates", href: "/admin/integrations/marketplaces/allegro/listing-templates" },
                { id: "integrations/marketplaces/allegro/messages", label: "Messages", href: "/admin/integrations/marketplaces/allegro/messages" },
                { id: "integrations/marketplaces/allegro/parameter-mapping", label: "Parameter Mapping", href: "/admin/integrations/marketplaces/allegro/parameter-mapping" },
                { id: "integrations/marketplaces/allegro/shipping-price-management", label: "Shipping Price Management", href: "/admin/integrations/marketplaces/allegro/shipping-price-management" },
              ],
            },
            { id: "integrations/marketplaces/category-mapper", label: "Category Mapper", href: "/admin/integrations/marketplaces/category-mapper" },
            { id: "integrations/marketplaces/tradera", label: "Tradera", href: "/admin/integrations/tradera" },
          ],
        },
      ],
    },
    {
      id: "jobs",
      label: "Jobs",
      href: "/admin/products/jobs",
      icon: <WorkflowIcon className="size-4" />,
      keywords: ["queue", "runner", "workers", "background", "tasks"],
      children: [
        { id: "jobs/products", label: "Product Jobs", href: "/admin/products/jobs" },
        { id: "jobs/ai", label: "AI Jobs", href: "/admin/ai-paths/jobs" },
        { id: "jobs/queue", label: "AI Queue", href: "/admin/ai-paths/queue" },
        { id: "jobs/dead-letter", label: "Dead Letter", href: "/admin/ai-paths/dead-letter" },
        { id: "jobs/chatbot", label: "Chatbot Jobs", href: "/admin/chatbot/jobs" },
        { id: "jobs/listings", label: "Listing Jobs", href: "/admin/integrations/jobs" },
      ],
    },
    {
      id: "ai",
      label: "AI",
      href: "/admin/ai-paths",
      icon: <GitBranchIcon className="size-4" />,
      children: [
        {
          id: "ai/ai-paths",
          label: "AI Paths",
          href: "/admin/ai-paths",
          children: [
            { id: "ai/ai-paths/canvas", label: "Canvas", href: "/admin/ai-paths" },
            { id: "ai/ai-paths/trigger-buttons", label: "Trigger Buttons", href: "/admin/ai-paths/trigger-buttons" },
          ],
        },
        {
          id: "ai/agent-creator",
          label: "Agent Creator",
          href: "/admin/agentcreator",
          children: [
            {
              id: "ai/agent-creator/learners",
              label: "Learner Agents",
              href: "/admin/agentcreator/teaching",
              keywords: ["teaching", "embedding", "rag", "school"],
              children: [
                { id: "ai/agent-creator/learners/agents", label: "Agents", href: "/admin/agentcreator/teaching/agents" },
                { id: "ai/agent-creator/learners/school", label: "Embedding School", href: "/admin/agentcreator/teaching/collections" },
                { id: "ai/agent-creator/learners/chat", label: "Chat", href: "/admin/agentcreator/teaching/chat" },
              ],
            },
            { id: "ai/agent-creator/personas", label: "Personas", href: "/admin/agentcreator/personas" },
            { id: "ai/agent-creator/runs", label: "Runs", href: "/admin/agentcreator/runs" },
          ],
        },
        {
          id: "ai/chatbot",
          label: "Chatbot",
          href: "/admin/chatbot",
          children: [
            {
              id: "ai/chatbot/chat",
              label: "Chat",
              href: "/admin/chatbot",
              icon: <MessageCircleIcon className="size-4" />,
              onClick: handleOpenChat,
            },
            { id: "ai/chatbot/sessions", label: "Sessions", href: "/admin/chatbot/sessions" },
            { id: "ai/chatbot/context", label: "Global Context", href: "/admin/chatbot/context" },
            { id: "ai/chatbot/memory", label: "Memory", href: "/admin/chatbot/memory" },
          ],
        },
      ],
    },
    {
      id: "content",
      label: "Content",
      href: "/admin/notes",
      icon: <BookOpenIcon className="size-4" />,
      children: [
        {
          id: "content/notes",
          label: "Notes",
          href: "/admin/notes",
          icon: <StickyNoteIcon className="size-4" />,
          children: [
            { id: "content/notes/list", label: "Note List", href: "/admin/notes" },
            { id: "content/notes/notebooks", label: "Notebooks", href: "/admin/notes/notebooks" },
            { id: "content/notes/tags", label: "Tags", href: "/admin/notes/tags" },
            { id: "content/notes/themes", label: "Themes", href: "/admin/notes/themes" },
            { id: "content/notes/settings", label: "Settings", href: "/admin/notes/settings" },
          ],
        },
        {
          id: "content/cms",
          label: "CMS",
          href: "/admin/cms",
          children: [
            { id: "content/cms/pages", label: "Pages", href: "/admin/cms/pages" },
            {
              id: "content/cms/pages/create",
              label: "Create Page",
              keywords: ["new page"],
              href: "/admin/cms/pages/create",
              onClick: (event: React.MouseEvent<HTMLAnchorElement>): void => {
                event.preventDefault();
                handleCreatePageClick();
              },
            },
            { id: "content/cms/builder", label: "Page Builder", href: "/admin/cms/builder" },
            { id: "content/cms/zones", label: "Zones", href: "/admin/cms/zones" },
            { id: "content/cms/slugs", label: "Slugs", href: "/admin/cms/slugs" },
            { id: "content/cms/slugs/create", label: "Create Slug", href: "/admin/cms/slugs/create" },
            { id: "content/cms/themes", label: "Themes", href: "/admin/cms/themes" },
            { id: "content/cms/themes/create", label: "Create Theme", href: "/admin/cms/themes/create" },
          ],
        },
      ],
    },
    {
      id: "system",
      label: "System",
      href: "/admin/settings",
      icon: <SettingsIcon className="size-4" />,
      children: [
        {
          id: "system/settings",
          label: "Settings",
          href: "/admin/settings",
          children: [
            { id: "system/settings/overview", label: "Overview", href: "/admin/settings" },
            { id: "system/settings/ai", label: "AI API Settings", href: "/admin/settings/ai" },
            { id: "system/settings/typography", label: "Typography", href: "/admin/settings/typography" },
            { id: "system/settings/notifications", label: "Notifications", href: "/admin/settings/notifications" },
            { id: "system/settings/playwright", label: "Playwright Personas", href: "/admin/settings/playwright" },
            { id: "system/settings/logging", label: "Logging", href: "/admin/settings/logging" },
            { id: "system/settings/recovery", label: "Transient Recovery", href: "/admin/settings/recovery" },
            { id: "system/settings/sync", label: "Background Sync", href: "/admin/settings/sync" },
            { id: "system/settings/database", label: "Database", href: "/admin/settings/database" },
          ],
        },
        {
          id: "system/analytics",
          label: "Analytics",
          href: "/admin/analytics",
          icon: <BarChart3Icon className="size-4" />,
          keywords: ["page analytics", "traffic", "visitors", "referrers"],
        },
        { id: "system/logs", label: "System Logs", href: "/admin/system/logs", icon: <ActivityIcon className="size-4" /> },
        {
          id: "system/auth",
          label: "Auth",
          href: "/admin/auth",
          icon: <ShieldIcon className="size-4" />,
          children: [
            { id: "system/auth/dashboard", label: "Dashboard", href: "/admin/auth/dashboard" },
            { id: "system/auth/users", label: "Users", href: "/admin/auth/users" },
            { id: "system/auth/permissions", label: "Permissions", href: "/admin/auth/permissions" },
            { id: "system/auth/settings", label: "Settings", href: "/admin/auth/settings" },
            { id: "system/auth/user-pages", label: "User Pages", href: "/admin/auth/user-pages" },
          ],
        },
      ],
    },
  ]), [handleCreatePageClick, handleOpenChat]);

  const normalizedQuery = normalizeText(deferredQuery);
  const filteredNav = useMemo(() => filterTree(nav, normalizedQuery), [nav, normalizedQuery]);
  const activeGroupIds = useMemo(() => collectActiveGroupIds(nav, pathname), [nav, pathname]);
  const forcedOpenIds = useMemo(
    () => (normalizedQuery ? collectGroupIds(filteredNav) : new Set<string>()),
    [filteredNav, normalizedQuery]
  );

  useEffect(() => {
    if (normalizedQuery) return;
    setOpenIds((prev: Set<string>) => {
      const next = new Set(prev);
      activeGroupIds.forEach((id: string) => next.add(id));
      return next;
    });
  }, [activeGroupIds, normalizedQuery]);

  if (!mounted) {
    return <nav className="flex flex-col space-y-2" aria-hidden="true" />;
  }

  return (
    <nav className={cn("flex flex-col gap-3", isMenuCollapsed ? "items-stretch" : "")}>
      {!isMenuCollapsed ? (
        <div className="space-y-2">
          <SearchInput
            value={query}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
            placeholder="Search admin pages…"
            className="h-9 bg-gray-900/40"
            onClear={() => setQuery("")}
          />
          {normalizedQuery ? (
            <div className="text-[11px] text-gray-500">
              Filtering menu: <span className="text-gray-300">{query.trim()}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      <NavTree
        items={filteredNav}
        depth={0}
        pathname={pathname}
        isCollapsed={isMenuCollapsed}
        openIds={openIds}
        forcedOpenIds={forcedOpenIds}
        onToggleOpen={(id: string): void => {
          setOpenIds((prev: Set<string>) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
          });
        }}
      />
    </nav>
  );
}
