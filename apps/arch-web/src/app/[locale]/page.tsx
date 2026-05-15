import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getDb } from '@/lib/mongodb';
import { resolveLocalizedContent } from '@/lib/pageContent';
import { isArchLocale, type ArchLocale, type Project, type Service } from '@/lib/types';
import Nav from '@/components/Nav';
import Cursor from '@/components/Cursor';
import Hero from '@/components/Hero';
import FloorPlan from '@/components/FloorPlan';
import Philosophy from '@/components/Philosophy';
import { FloorPlanSlotsProvider } from '@/lib/floorPlanContext';
import Services from '@/components/Services';
import BuiltWork from '@/components/BuiltWork';
import ProjectViewer from '@/components/ProjectViewer';
import Process from '@/components/Process';
import Metrics from '@/components/Metrics';
import CaseStudies from '@/components/CaseStudies';
import Quote from '@/components/Quote';
import CtaSection from '@/components/CtaSection';
import Footer from '@/components/Footer';
import GSAPInit from '@/components/GSAPInit';

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

async function getPageData(locale: ArchLocale) {
  try {
    const db = await getDb();
    const doc = await db
      .collection<{ localizedContent?: unknown; content?: unknown; pageSettings?: unknown }>('page_content')
      .findOne({ key: 'home' }, { projection: { _id: 0, localizedContent: 1, content: 1, pageSettings: 1 } });
    return resolveLocalizedContent(doc, locale);
  } catch {
    return resolveLocalizedContent(null, locale);
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const validLocale: ArchLocale = isArchLocale(locale) ? locale : 'en';
  const { pageSettings } = await getPageData(validLocale);
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

  const [projects, services, { pageContent, pageSettings }] = await Promise.all([
    getProjects(),
    getServices(),
    getPageData(validLocale),
  ]);

  // Redirect unpublished locales to the default locale
  if (!pageSettings.publishedLocales.includes(validLocale)) {
    redirect(`/${pageSettings.defaultLocale}`);
  }

  const vis = pageSettings.visibility;

  return (
    <>
      <Cursor />
      <Nav currentLocale={validLocale} publishedLocales={pageSettings.publishedLocales} />
      <Hero content={pageContent.hero} />
      {vis.drawing ? (
        <FloorPlanSlotsProvider>
          <FloorPlan content={pageContent.drawing} />
        </FloorPlanSlotsProvider>
      ) : null}
      {vis.philosophy ? <Philosophy content={pageContent.philosophy} /> : null}
      {vis.services ? <Services services={services} content={pageContent.services} /> : null}
      {vis.projects ? <BuiltWork projects={projects} content={pageContent.projects} /> : null}
      {vis.projects ? <ProjectViewer projects={projects} /> : null}
      {vis.process ? <Process content={pageContent.process} /> : null}
      {vis.metrics ? <Metrics metrics={pageContent.metrics} /> : null}
      {vis.caseStudy && projects.length > 0 ? <CaseStudies content={pageContent.caseStudy} projects={projects} /> : null}
      {vis.quote ? <Quote content={pageContent.quote} /> : null}
      {vis.cta ? <CtaSection content={pageContent.cta} locale={validLocale} /> : null}
      <Footer content={pageContent.footer} />
      <GSAPInit />
    </>
  );
}
