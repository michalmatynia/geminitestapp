import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const css = readFileSync(resolve(root, 'src/app/globals.css'), 'utf8');
const gsapInit = readFileSync(resolve(root, 'src/components/GSAPInit.tsx'), 'utf8');
const builtWork = readFileSync(resolve(root, 'src/components/BuiltWork.tsx'), 'utf8');
const isometricThumbnail = readFileSync(resolve(root, 'src/components/IsometricThumbnail.tsx'), 'utf8');
const caseStudies = readFileSync(resolve(root, 'src/components/CaseStudies.tsx'), 'utf8');
const sideViewThumbnail = readFileSync(resolve(root, 'src/components/SideViewThumbnail.tsx'), 'utf8');

const failures = [];

const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

assert(
  /\.rev\s*\{\s*opacity:\s*0\s*;?\s*\}/.test(css),
  'Expected .rev to start hidden with opacity: 0 so GSAP reveal animations can run.'
);

assert(
  /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.rev\s*\{[^}]*opacity:\s*1\s*!important/.test(css),
  'Expected reduced-motion override to keep .rev content visible.'
);

assert(
  gsapInit.includes("'.meta-rev'"),
  'Expected .meta-rev to be excluded from the generic .rev batch.'
);

assert(
  !gsapInit.includes('SCRAMBLE_CHARS') && !gsapInit.includes('scrambleReveal'),
  'Section meta labels must not use text scramble; it caused unstable label rendering.'
);

assert(
  !gsapInit.includes('revealFallbackTimer'),
  'Do not restore the timed reveal fallback; it made project cards reveal before their section.'
);

assert(
  gsapInit.includes('const projectsTimeline = gsap.timeline'),
  'Expected project cards, curtains, and metadata to be coordinated by one GSAP timeline.'
);

const projectGridTriggerCount = (gsapInit.match(/trigger:\s*['"]\.projects-grid['"]/g) ?? []).length;
assert(
  projectGridTriggerCount === 1,
  `Expected one .projects-grid ScrollTrigger, found ${projectGridTriggerCount}.`
);

assert(
  builtWork.includes('viewMode={content.projectsViewMode}'),
  'Project still cards must keep respecting the CMS project render mode.'
);

assert(
  isometricThumbnail.includes('loadGltfModel') && isometricThumbnail.includes('applyViewMode'),
  'IsometricThumbnail must support CMS model URLs and the configured edge/wireframe/solid view mode.'
);

assert(
  !isometricThumbnail.includes('.catch(() => addGroup(makeProjectGroup(projectIdx)))'),
  'IsometricThumbnail must not fall back to retired procedural geometry when a CMS model URL fails.'
);

assert(
  caseStudies.includes('modelUrl={activeProject?.modelUrl}'),
  'Case-study drawing panels must pass the active CMS project model URL to the side-view thumbnail.'
);

assert(
  sideViewThumbnail.includes('loadGltfModel') &&
    sideViewThumbnail.includes('addEdgesRenderMode') &&
    !sideViewThumbnail.includes('makeProjectGroup'),
  'SideViewThumbnail must render uploaded CMS project models in edge elevation mode, not retired procedural models.'
);

if (failures.length > 0) {
  console.error('Milkbar GSAP guard failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Milkbar GSAP guard passed.');
