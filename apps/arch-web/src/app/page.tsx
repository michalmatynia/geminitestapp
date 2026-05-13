import { getDb } from '@/lib/mongodb';
import type { Project, Service } from '@/lib/types';
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

export default async function Home() {
  const [projects, services] = await Promise.all([getProjects(), getServices()]);

  return (
    <>
      <Cursor />
      <Nav />
      <Hero />
      <FloorPlanSlotsProvider>
        <FloorPlan />
      </FloorPlanSlotsProvider>
      <Philosophy />
      <Services services={services} />
      <BuiltWork projects={projects} />
      <ProjectViewer projects={projects} />
      <Process />
      <Metrics />
      <CaseStudies projects={projects} />
      <Quote />
      <CtaSection />
      <Footer />
      <GSAPInit />
    </>
  );
}
