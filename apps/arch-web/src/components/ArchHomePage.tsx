'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ArchLocale, ArchPageContent, ArchPageSettings, Project, Service } from '@/lib/types';
import { ARCH_LOCALES, isArchLocale } from '@/lib/types';
import Nav from '@/components/Nav';
import Cursor from '@/components/Cursor';
import Hero from '@/components/Hero';
import FloorPlan from '@/components/FloorPlan';
import Philosophy from '@/components/Philosophy';
import { FloorPlanSlotsProvider } from '@/lib/floorPlanContext';
import Services from '@/components/Services';
import BuiltWork from '@/components/BuiltWork';
import ProjectViewer from '@/components/ProjectViewer';
import CodeStudio from '@/components/CodeStudio';
import Process from '@/components/Process';
import Metrics from '@/components/Metrics';
import CaseStudies from '@/components/CaseStudies';
import Quote from '@/components/Quote';
import CtaSection from '@/components/CtaSection';
import Footer from '@/components/Footer';
import GSAPInit from '@/components/GSAPInit';

type ArchHomePageProps = {
  initialLocale: ArchLocale;
  localizedContent: Record<ArchLocale, ArchPageContent>;
  pageSettings: ArchPageSettings;
  projects: Project[];
  services: Service[];
};

function readLocaleFromPathname(pathname: string): ArchLocale | null {
  const maybeLocale = pathname.split('/').filter(Boolean)[0];
  return isArchLocale(maybeLocale) ? maybeLocale : null;
}

function firstLocalizedModelUrl(
  localizedContent: Record<ArchLocale, ArchPageContent>,
  select: (content: ArchPageContent) => string | undefined
): string | undefined {
  for (const locale of ARCH_LOCALES) {
    const value = select(localizedContent[locale])?.trim();
    if (value !== undefined && value.length > 0) return value;
  }
  return undefined;
}

export default function ArchHomePage({
  initialLocale,
  localizedContent,
  pageSettings,
  projects,
  services,
}: ArchHomePageProps) {
  const [activeLocale, setActiveLocale] = useState<ArchLocale>(initialLocale);
  const pageContent =
    localizedContent[activeLocale] ?? localizedContent[pageSettings.defaultLocale] ?? localizedContent.en;
  const vis = pageSettings.visibility;
  const heroModelUrl = useMemo(
    () => firstLocalizedModelUrl(localizedContent, (content) => content.hero.modelUrl),
    [localizedContent]
  );
  const interiorModelUrl = useMemo(
    () => firstLocalizedModelUrl(localizedContent, (content) => content.drawing.interiorModelUrl),
    [localizedContent]
  );
  const viewerProjects = useMemo(() => {
    const codes = pageContent.drawing.asset3dProjectCodes;
    if (codes.length === 0) return projects;
    const filtered = codes.map((code) => projects.find((p) => p.code === code)).filter((p): p is typeof projects[number] => p !== undefined);
    return filtered.length > 0 ? filtered : projects;
  }, [pageContent.drawing.asset3dProjectCodes, projects]);

  const switchLocale = useCallback((nextLocale: ArchLocale) => {
    if (activeLocale === nextLocale) return;

    const url = new URL(window.location.href);
    url.pathname = `/${nextLocale}`;
    window.history.pushState({ locale: nextLocale }, '', `${url.pathname}${url.search}${url.hash}`);
    setActiveLocale(nextLocale);
  }, [activeLocale]);

  useEffect(() => {
    const handlePopState = () => {
      const nextLocale = readLocaleFromPathname(window.location.pathname);
      if (nextLocale) setActiveLocale(nextLocale);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const seo = pageSettings.seo[activeLocale];
    document.documentElement.lang = activeLocale;
    document.title = seo.title;

    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (description) description.content = seo.description;
  }, [activeLocale, pageSettings.seo]);

  return (
    <>
      <Cursor />
      <Nav
        currentLocale={activeLocale}
        content={pageContent.nav}
        publishedLocales={pageSettings.publishedLocales}
        onLocaleChange={switchLocale}
      />
      <Hero content={pageContent.hero} modelUrl={heroModelUrl} />
      {vis.drawing ? (
        <FloorPlanSlotsProvider>
          <FloorPlan content={pageContent.drawing} interiorModelUrl={interiorModelUrl} />
        </FloorPlanSlotsProvider>
      ) : null}
      {vis.philosophy ? <Philosophy content={pageContent.philosophy} /> : null}
      {vis.services ? <Services services={services} content={pageContent.services} /> : null}
      {vis.projects ? <BuiltWork projects={viewerProjects} content={pageContent.projects} /> : null}
      {vis.projects ? <ProjectViewer projects={viewerProjects} /> : null}
      <CodeStudio />
      {vis.process ? <Process content={pageContent.process} /> : null}
      {vis.metrics ? <Metrics metrics={pageContent.metrics} /> : null}
      {vis.caseStudy && viewerProjects.length > 0 ? (
        <CaseStudies content={pageContent.caseStudy} projects={viewerProjects} />
      ) : null}
      {vis.quote ? <Quote content={pageContent.quote} /> : null}
      {vis.cta ? <CtaSection content={pageContent.cta} locale={activeLocale} /> : null}
      <Footer content={pageContent.footer} />
      <GSAPInit />
    </>
  );
}
