'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { settingSections } from './ProductSettingsConstants';
import type { ProductSettingsSection, ProductSettingsSetSection } from './ProductSettingsPage.types';

const toSettingSectionSlug = (section: ProductSettingsSection): string =>
  section
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const resolveSettingSectionFromParam = (
  value: string | null | undefined
): ProductSettingsSection | null => {
  const normalized = (value ?? '').trim().toLowerCase();
  if (normalized.length === 0) return null;
  return settingSections.find((section) => toSettingSectionSlug(section) === normalized) ?? null;
};

export const useProductSettingsActiveSection = (): {
  activeSection: ProductSettingsSection;
  setActiveSection: ProductSettingsSetSection;
} => {
  const searchParams = useSearchParams();
  const requestedSection = resolveSettingSectionFromParam(searchParams.get('section'));
  const [activeSection, setActiveSection] = useState<ProductSettingsSection>(
    requestedSection ?? 'Categories'
  );

  useEffect(() => {
    if (requestedSection === null || requestedSection === activeSection) return;
    setActiveSection(requestedSection);
  }, [activeSection, requestedSection]);

  return { activeSection, setActiveSection };
};
