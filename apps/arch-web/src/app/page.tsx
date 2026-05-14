import { getDb } from '@/lib/mongodb';
import { normalizeArchPageContent } from '@/lib/pageContent';
import type { ArchPageContent, Project, Service } from '@/lib/types';
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

async function getPageContent(): Promise<ArchPageContent> {
  try {
    const db = await getDb();
    const doc = await db
      .collection<{ content?: unknown }>('page_content')
      .findOne({ key: 'home' }, { projection: { _id: 0, content: 1 } });
    return normalizeArchPageContent(doc?.content);
  } catch {
    return normalizeArchPageContent(null);
  }
}

export default async function Home() {
  const [projects, services, pageContent] = await Promise.all([
    getProjects(),
    getServices(),
    getPageContent(),
  ]);

  return (
    <>
      <Cursor />
      <Nav />
      <Hero content={pageContent.hero} />
      <FloorPlanSlotsProvider>
        <FloorPlan content={pageContent.drawing} />
      </FloorPlanSlotsProvider>
      <Philosophy content={pageContent.philosophy} />
      <Services services={services} content={pageContent.services} />
      <BuiltWork projects={projects} content={pageContent.projects} />
      <ProjectViewer projects={projects} />
      <Process content={pageContent.process} />
      <Metrics metrics={pageContent.metrics} />
      <CaseStudies projects={projects} />
      <Quote content={pageContent.quote} />
      <CtaSection content={pageContent.cta} />
      <Footer content={pageContent.footer} />
      <GSAPInit />
    </>
  );
}
