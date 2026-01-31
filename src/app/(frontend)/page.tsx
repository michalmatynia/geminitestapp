import { JSX } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@/shared/lib/db/prisma";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import { productService } from "@/features/products/server";
import { ProductCard } from "@/features/products";
import type { ProductWithImages } from "@/features/products";
import { getCmsRepository } from "@/features/cms/services/cms-repository";
import { getCmsThemeSettings } from "@/features/cms/services/cms-theme-settings";
import { CmsPageRenderer } from "@/features/cms/components/frontend/CmsPageRenderer";
import type { Slug } from "@/features/cms/types";
import { getSlugsForDomain, resolveCmsDomainFromHeaders } from "@/features/cms/services/cms-domain";
import { buildColorSchemeMap, type ThemeSettings } from "@/features/cms/types/theme-settings";
import { getMediaInlineStyles, getMediaStyleVars } from "@/features/cms/components/frontend/theme-styles";
import { auth } from "@/features/auth/auth";
import type { Session } from "next-auth";
import { getUserPreferences } from "@/shared/lib/services/user-preferences-repository";
import { Facebook, Instagram, Linkedin, Twitter, Youtube } from "lucide-react";

const isAdminSession = (session: Session | null): boolean => {
  if (!session?.user) return false;
  const user = session.user as Session["user"] & { isElevated?: boolean; role?: string | null };
  if (user.isElevated) return true;
  const role = user.role ?? "";
  return ["admin", "super_admin", "superuser"].includes(role);
};

const canPreviewDrafts = async (
  session: Session | null
): Promise<boolean> => {
  if (!isAdminSession(session)) return false;
  const userId = session?.user?.id;
  if (!userId) return false;
  try {
    const prefs = await getUserPreferences(userId);
    return prefs.cmsPreviewEnabled === true;
  } catch {
    return false;
  }
};

export const dynamic = "force-dynamic";

const notNull = <T,>(value: T | null | undefined): value is T => value != null;
const FRONT_PAGE_SETTING_KEY = "front_page_app";
const FRONT_PAGE_ALLOWED = new Set(["products", "chatbot", "notes"]);

type SettingDocument = {
  _id: string;
  key?: string;
  value?: string;
};

const canUsePrismaSettings = (): boolean =>
  Boolean(process.env.DATABASE_URL) && "setting" in prisma;

const getFrontPageSetting = async (): Promise<string | null> => {
  if (process.env.MONGODB_URI) {
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection<SettingDocument>("settings")
      .findOne({ _id: FRONT_PAGE_SETTING_KEY });
    if (doc?.value) return doc.value;
  }

  if (canUsePrismaSettings()) {
    try {
      const setting = await prisma.setting.findUnique({
        where: { key: FRONT_PAGE_SETTING_KEY },
        select: { value: true },
      });
      if (setting?.value) return setting.value;
    } catch {
      // Prisma unavailable — ignore.
    }
  }

  return null;
};

export default async function Home(): Promise<JSX.Element> {
  const frontPageApp = await getFrontPageSetting();

  if (frontPageApp && FRONT_PAGE_ALLOWED.has(frontPageApp)) {
    if (frontPageApp === "chatbot") {
      redirect("/admin/chatbot");
    }
    if (frontPageApp === "notes") {
      redirect("/admin/notes");
    }
  }

  const cmsRepository = await getCmsRepository();
  const hdrs = await headers();
  const domain = await resolveCmsDomainFromHeaders(hdrs);
  const slugs = await getSlugsForDomain(domain.id, cmsRepository);
  const defaultSlug = slugs.find((s: Slug) => !!s.isDefault);
  const themeSettings = await getCmsThemeSettings();

  type MaybeImages = {
    images?: (ProductWithImages["images"][number] | null)[] | null;
    catalogs?: (ProductWithImages["catalogs"][number] | null)[] | null;
  };

  const normalizeProduct = (
    p: ProductWithImages | (ProductWithImages & MaybeImages)
  ): ProductWithImages => {
    return {
      ...p,
      images: Array.isArray(p.images) ? p.images.filter(notNull) : [],
      catalogs: Array.isArray(p.catalogs) ? p.catalogs.filter(notNull) : [],
    };
  };

  if (defaultSlug) {
    // Try to load the published CMS page linked to this slug
    const cmsPage = await cmsRepository.getPageBySlug(defaultSlug.slug);
    const session = await auth();
    const allowDrafts = await canPreviewDrafts(session);
    const hasCmsContent = cmsPage && (allowDrafts || cmsPage.status === "published") && cmsPage.components.length > 0;

    return (
      <div className="flex min-h-screen flex-col">
        <header className="flex h-14 items-center px-4 lg:px-6">
          <Link
            href="#"
            className="flex items-center justify-center"
            prefetch={false}
          >
            <MountainIcon className="size-6" />
            <span className="sr-only">Acme Inc</span>
          </Link>
          <nav className="ml-auto flex gap-4 sm:gap-6">
            <Link
              href="/admin"
              className="text-sm font-medium underline-offset-4 hover:underline"
              prefetch={false}
            >
              Admin
            </Link>
          </nav>
        </header>
        <main className="flex-1">
          {hasCmsContent ? (
            <CmsPageRenderer
              components={cmsPage.components}
              colorSchemes={buildColorSchemeMap(themeSettings)}
              layout={{ fullWidth: themeSettings.fullWidth }}
              hoverEffect={themeSettings?.enableAnimations ? themeSettings.hoverEffect : undefined}
              hoverScale={themeSettings?.enableAnimations ? themeSettings.hoverScale : undefined}
              mediaVars={getMediaStyleVars(themeSettings)}
              mediaStyles={getMediaInlineStyles(themeSettings)}
            />
          ) : (
            <section className="w-full py-12">
              <div className="container px-4 md:px-6">
                <h1 className="text-3xl font-bold">
                  Welcome to {defaultSlug.slug}
                </h1>
              </div>
            </section>
          )}
        </main>
        <footer className="flex w-full shrink-0 flex-col items-center gap-3 border-t border-gray-800 px-4 py-6 sm:flex-row md:px-6">
          <p className="text-xs text-gray-400">
            &copy; 2024 Acme Inc. All rights reserved.
          </p>
          <div className="flex flex-col items-center gap-3 sm:ml-auto sm:flex-row sm:items-center">
            <nav className="flex gap-4 sm:gap-6">
              <Link
                href="#"
                className="text-xs underline-offset-4 hover:underline"
                prefetch={false}
              >
                Terms of Service
              </Link>
              <Link
                href="#"
                className="text-xs underline-offset-4 hover:underline"
                prefetch={false}
              >
                Privacy
              </Link>
            </nav>
            <SocialLinks theme={themeSettings} />
          </div>
        </footer>
      </div>
    );
  }

  const productsRaw = await productService.getProducts({});
  const products = (
    productsRaw as (ProductWithImages | (ProductWithImages & MaybeImages))[]
  ).map(normalizeProduct);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center px-4 lg:px-6">
        <Link
          href="#"
          className="flex items-center justify-center"
          prefetch={false}
        >
          <MountainIcon className="size-6" />
          <span className="sr-only">Acme Inc</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link
            href="/admin"
            className="text-sm font-medium underline-offset-4 hover:underline"
            prefetch={false}
          >
            Admin
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        <section className="w-full py-12">
          <div className="container px-4 md:px-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product: ProductWithImages) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="flex w-full shrink-0 flex-col items-center gap-3 border-t border-gray-800 px-4 py-6 sm:flex-row md:px-6">
        <p className="text-xs text-gray-400">
          &copy; 2024 Acme Inc. All rights reserved.
        </p>
        <div className="flex flex-col items-center gap-3 sm:ml-auto sm:flex-row sm:items-center">
          <nav className="flex gap-4 sm:gap-6">
            <Link
              href="#"
              className="text-xs underline-offset-4 hover:underline"
              prefetch={false}
            >
              Terms of Service
            </Link>
            <Link
              href="#"
              className="text-xs underline-offset-4 hover:underline"
              prefetch={false}
            >
              Privacy
            </Link>
          </nav>
          <SocialLinks theme={themeSettings} />
        </div>
      </footer>
    </div>
  );
}

function MountainIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
    </svg>
  );
}

type SocialLink = {
  id: string;
  label: string;
  href: string;
  Icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  fallback: string;
};

const normalizeSocialUrl = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const buildSocialLinks = (theme: ThemeSettings | null | undefined): SocialLink[] => {
  if (!theme) return [];
  const links: SocialLink[] = [];
  const addLink = (link: Omit<SocialLink, "href"> & { href: string | null }) => {
    if (link.href) links.push({ ...link, href: link.href });
  };

  addLink({
    id: "facebook",
    label: "Facebook",
    href: normalizeSocialUrl(theme.socialFacebook),
    Icon: Facebook,
    fallback: "Fb",
  });
  addLink({
    id: "instagram",
    label: "Instagram",
    href: normalizeSocialUrl(theme.socialInstagram),
    Icon: Instagram,
    fallback: "Ig",
  });
  addLink({
    id: "youtube",
    label: "YouTube",
    href: normalizeSocialUrl(theme.socialYoutube),
    Icon: Youtube,
    fallback: "Yt",
  });
  addLink({
    id: "tiktok",
    label: "TikTok",
    href: normalizeSocialUrl(theme.socialTiktok),
    fallback: "TT",
  });
  addLink({
    id: "twitter",
    label: "X / Twitter",
    href: normalizeSocialUrl(theme.socialTwitter),
    Icon: Twitter,
    fallback: "X",
  });
  addLink({
    id: "snapchat",
    label: "Snapchat",
    href: normalizeSocialUrl(theme.socialSnapchat),
    fallback: "SC",
  });
  addLink({
    id: "pinterest",
    label: "Pinterest",
    href: normalizeSocialUrl(theme.socialPinterest),
    fallback: "P",
  });
  addLink({
    id: "tumblr",
    label: "Tumblr",
    href: normalizeSocialUrl(theme.socialTumblr),
    fallback: "T",
  });
  addLink({
    id: "vimeo",
    label: "Vimeo",
    href: normalizeSocialUrl(theme.socialVimeo),
    fallback: "V",
  });
  addLink({
    id: "linkedin",
    label: "LinkedIn",
    href: normalizeSocialUrl(theme.socialLinkedin),
    Icon: Linkedin,
    fallback: "In",
  });

  return links;
};

function SocialLinks({ theme }: { theme: ThemeSettings | null | undefined }) {
  const links = buildSocialLinks(theme);
  if (!links.length) return null;

  return (
    <nav className="flex items-center gap-2" aria-label="Social media">
      {links.map((link) => {
        const Icon = link.Icon;
        return (
          <a
            key={link.id}
            href={link.href}
            className="inline-flex size-8 items-center justify-center rounded-full border border-gray-800 text-gray-400 transition hover:border-gray-600 hover:text-gray-100"
            target="_blank"
            rel="noreferrer"
            aria-label={link.label}
          >
            {Icon ? (
              <Icon className="size-4" aria-hidden="true" />
            ) : (
              <span className="text-[10px] font-semibold" aria-hidden="true">
                {link.fallback}
              </span>
            )}
            <span className="sr-only">{link.label}</span>
          </a>
        );
      })}
    </nav>
  );
}
