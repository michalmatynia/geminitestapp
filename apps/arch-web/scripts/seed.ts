import { MongoClient } from 'mongodb';

import { DEFAULT_ARCH_LOCALIZED_CONTENT, DEFAULT_ARCH_PAGE_SETTINGS } from '../src/lib/pageContent.ts';

const DEFAULT_MONGODB_URI = 'mongodb://127.0.0.1:27022/arch_web_local';
const DEFAULT_MONGODB_DB = 'arch_web_local';

const firstEnvValue = (...keys: string[]): string | null => {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return null;
};

const URI =
  firstEnvValue(
    'ARCH_MONGODB_LOCAL_URI',
    'MONGODB_ARCH_LOCAL_URI',
    'ARCH_MONGODB_URI',
    'MONGODB_ARCH_URI'
  ) ?? DEFAULT_MONGODB_URI;
const DB =
  firstEnvValue(
    'ARCH_MONGODB_LOCAL_DB',
    'MONGODB_ARCH_LOCAL_DB',
    'ARCH_MONGODB_DB',
    'MONGODB_ARCH_DB'
  ) ?? DEFAULT_MONGODB_DB;

const projects = [
  {
    code: 'MBD-001',
    name: 'Helios Tower',
    projectType: 'Mixed-Use Tower',
    city: 'Zurich',
    country: 'CH',
    stats: ['32 Floors · 42,000 m²', 'Mixed-Use · Zurich, CH'],
    description: 'A 32-storey mixed-use development in Zurich required simultaneous compliance with Swiss federal, cantonal, and municipal building codes. Our AI processed 6,400 drawings in 3 hours — a task that would have taken a team of 5 two months.',
    order: 0,
    status: 'published',
    cameraPosition: { x: 22, y: 18, z: 22 },
    cameraTarget:   { x: 0,  y: 8,  z: 0  },
    meta: { floors: 32, area: '42,000 m²', drawingsProcessed: 6400, timeSavedHours: 280 },
  },
  {
    code: 'MBD-002',
    name: 'Kulturhaus',
    projectType: 'Cultural Centre',
    city: 'Amsterdam',
    country: 'NL',
    stats: ['3 Volumes · 4,200 m²', 'Cultural · Amsterdam, NL'],
    description: 'Generating 3,600 massing options for a new cultural centre on the IJ waterfront — each optimised against acoustic performance, heritage viewing corridors, and Amsterdam\'s strict envelope controls.',
    order: 1,
    status: 'published',
    cameraPosition: { x: 20, y: 12, z: 20 },
    cameraTarget:   { x: 0,  y: 5,  z: 0  },
    meta: { volumes: 3, area: '4,200 m²', massingOptions: 3600 },
  },
  {
    code: 'MBD-003',
    name: 'South Quarter',
    projectType: 'Residential Ensemble',
    city: 'Berlin',
    country: 'DE',
    stats: ['3 Volumes · 8,600 m²', 'Residential · Berlin, DE'],
    description: 'Three interlocked residential volumes on a challenging Berlin infill site, optimised for passive solar gain and Berlin\'s strict GRZ/GFZ plot ratio regulations. AI generated 1,200 compliant variants in 90 minutes.',
    order: 2,
    status: 'published',
    cameraPosition: { x: 18, y: 15, z: 18 },
    cameraTarget:   { x: 0,  y: 6,  z: 0  },
    meta: { volumes: 3, area: '8,600 m²', variants: 1200 },
  },
];

const services = [
  {
    code: 'S-01',
    title: 'Compliance Intelligence',
    emphasis: 'Intelligence',
    description: 'Automated cross-referencing against regulations in any European or international jurisdiction. Upload drawings, receive a full compliance report in minutes.',
    order: 0,
  },
  {
    code: 'S-02',
    title: 'Generative Massing',
    emphasis: 'Massing',
    description: 'Input site constraints and programme. Receive thousands of optimised massing options, ranked by buildability and cost efficiency.',
    order: 1,
  },
  {
    code: 'S-03',
    title: 'Document Automation',
    emphasis: 'Automation',
    description: 'Transform concept sketches into production drawing sets. AI drafts plans, sections and elevations with correct weights and annotations.',
    order: 2,
  },
  {
    code: 'S-04',
    title: 'Project Intelligence',
    emphasis: 'Intelligence',
    description: 'Real-time budget forecasting and risk identification. An AI project manager that never sleeps and never misses a deadline.',
    order: 3,
  },
];

async function seed() {
  const client = new MongoClient(URI);
  try {
    await client.connect();
    const db = client.db(DB);
    console.log(`Connected to ${URI}/${DB}`);

    await db.collection('projects').createIndex({ code: 1 }, { unique: true });
    await db.collection('services').createIndex({ code: 1 }, { unique: true });
    await db.collection('inquiries').createIndex({ email: 1 }, { unique: true });
    await db.collection('page_content').createIndex({ key: 1 }, { unique: true });

    await Promise.all(
      projects.map((project) =>
        db.collection('projects').updateOne(
          { code: project.code },
          { $set: project },
          { upsert: true }
        )
      )
    );
    await Promise.all(
      services.map((service) =>
        db.collection('services').updateOne(
          { code: service.code },
          { $set: service },
          { upsert: true }
        )
      )
    );
    await db.collection('page_content').updateOne(
      { key: 'home' },
      {
        $set: {
          key: 'home',
          localizedContent: DEFAULT_ARCH_LOCALIZED_CONTENT,
          pageSettings: DEFAULT_ARCH_PAGE_SETTINGS,
          updatedAt: new Date(),
        },
        $unset: { content: '' },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    console.log(`✓ Upserted ${projects.length} projects`);
    console.log(`✓ Upserted ${services.length} services`);
    console.log('✓ Upserted Milkbar home page content');
    console.log('Database ready.');
  } finally {
    await client.close();
  }
}

seed().catch((err) => { console.error(err); process.exit(1); });
