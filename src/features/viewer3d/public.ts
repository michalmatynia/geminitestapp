// Keep the shared viewer3d barrel client-safe and graph-light. Admin pages import
// their route components directly so regular CMS/frontend consumers don't pull
// page-level modules into the same Turbopack resolution surface.
export * from './client/public';
export * from './pages.public';
