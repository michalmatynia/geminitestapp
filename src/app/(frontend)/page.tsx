import { JSX } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import prisma from "@/shared/lib/db/prisma";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import { productService } from "@/features/products/server";
import { ProductCard } from "@/features/products";
import type { ProductWithImages } from "@/features/products";
import { getCmsRepository } from "@/features/cms/services/cms-repository";
import type { Slug } from "@/features/cms/types";

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
  const slugs = await cmsRepository.getSlugs();
  const defaultSlug = slugs.find((s: Slug) => !!s.isDefault);

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
              <h1 className="text-3xl font-bold">
                Welcome to {defaultSlug.slug}
              </h1>
            </div>
          </section>
        </main>
        <footer className="flex w-full shrink-0 flex-col items-center gap-2 border-t border-gray-800 px-4 py-6 sm:flex-row md:px-6">
          <p className="text-xs text-gray-400">
            &copy; 2024 Acme Inc. All rights reserved.
          </p>
          <nav className="ml-auto flex gap-4 sm:gap-6">
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

      <footer className="flex w-full shrink-0 flex-col items-center gap-2 border-t border-gray-800 px-4 py-6 sm:flex-row md:px-6">
        <p className="text-xs text-gray-400">
          &copy; 2024 Acme Inc. All rights reserved.
        </p>
        <nav className="ml-auto flex gap-4 sm:gap-6">
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
