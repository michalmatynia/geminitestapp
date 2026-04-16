/*
 * StudiQ (Kangur) public entrypoint
 *
 * Purpose: Re-export the public APIs of the Kangur feature. These exports are
 * intended for app-layer usage and must remain client-safe. Accessibility
 * guidance: prefer using KangurStandardPageLayout and Kangur page shells from
 * the public API so that landmark, skip-link and focus behaviour are applied
 * consistently across pages.
 */
export * from '@/features/kangur/core.public';
export * from '@/features/kangur/frontend.public';
export * from '@/features/kangur/widgets.public';
export * from '@/features/kangur/admin.public';
export * from '@/features/kangur/social.public';
