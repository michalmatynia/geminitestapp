export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { getDb } from '@/lib/mongodb';
import { resolveArchPageData } from '@/lib/pageContent';
import { isArchLocale, type ArchLocale, type Project, type Service } from '@/lib/types';
import ArchHomePage from '@/components/ArchHomePage';

type PageProps = { params: Promise<{ locale: string }> };

async function getProjects(): Promise<Project[]> {
  try {
    const db = await getDb();
    return await db
      .collection<Project>('projects')
      .find({ status: 'published' }, { projection: { _id: 0 } })
      .sort({ order: 1 })
      .toArray();
  } catch {
    return [];
  }
}

async function getServices(): Promise<Service[]> {
  try {
    const db = await getDb();
    return await db
      .collection<Service>('services')
      .find({}, { projection: { _id: 0 } })
      .sort({ order: 1 })
      .toArray();
  } catch {
    return [];
  }
}

async function getPageData() {
  try {
    const db = await getDb();
    const doc = await db
      .collection<{ localizedContent?: unknown; pageSettings?: unknown }>('page_content')
      .findOne({ key: 'home' }, { projection: { _id: 0, localizedContent: 1, pageSettings: 1 } });
    return resolveArchPageData(doc);
  } catch {
    return resolveArchPageData(null);
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const validLocale: ArchLocale = isArchLocale(locale) ? locale : 'en';
  const { pageSettings } = await getPageData();
  const seo = pageSettings.seo[validLocale];

  return {
    title: seo.title,
    description: seo.description,
    openGraph: {
      title: seo.ogTitle,
      description: seo.ogDescription,
      type: 'website',
    },
    alternates: {
      languages: Object.fromEntries(
        pageSettings.publishedLocales.map((l) => [l, `/${l}`])
      ),
    },
  };
}

export default async function LocalePage({ params }: PageProps) {
  const { locale } = await params;
  const validLocale: ArchLocale = isArchLocale(locale) ? locale : 'en';

  const [projects, services, { localizedContent, pageSettings }] = await Promise.all([
    getProjects(),
    getServices(),
    getPageData(),
  ]);

  return (
    <ArchHomePage
      initialLocale={validLocale}
      localizedContent={localizedContent}
      pageSettings={pageSettings}
      projects={projects}
      services={services}
    />
  );
}
