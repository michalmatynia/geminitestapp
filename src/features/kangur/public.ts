/**
 * @fileoverview Kangur Feature Public API Entrypoint
 * @description This module is the designated public interface for the Kangur feature.
 * All members exported here are intended for consumption by the app-layer.
 *
 * @boundary IMPORTANT: These are the only members intended for consumption outside
 * this feature. Avoid deep imports into internal feature folders.
 */

/*
 * Purpose: Re-export the public APIs of the Kangur feature. These exports are
 * intended for app-layer usage and must remain client-safe. Accessibility
 * guidance: prefer using KangurStandardPageLayout and Kangur page shells from
 * the public API so that landmark, skip-link and focus behaviour are applied
 * consistently across pages.
 */

/** @export core public API */
export * from '@/features/kangur/core.public';
/** @export frontend public API */
export * from '@/features/kangur/frontend.public';
/** @export widgets public API */
export * from '@/features/kangur/widgets.public';
/** @export admin public API */
export * from '@/features/kangur/admin.public';
