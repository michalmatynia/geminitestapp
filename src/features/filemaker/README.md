# Filemaker Feature

This folder owns the Filemaker admin workspace, Mongo-backed record stores,
mail tooling, job-board workflows, campaign runtime, CV/email builders, and
social publishing integrations.

## Layout

- `components/`: shared Filemaker UI, entity pages, mail sidebar, CV builder,
  email builder, and social publishing workspace components
- `server/`: Mongo repositories, mail services, campaign runtime, job-board
  scraping, document generation, and social publishing server logic
- `settings/`: Filemaker database factories, campaign settings, party helpers,
  and migration-safe normalization utilities
- `social/README.md`: social publishing subfeature notes
- `types/`: Filemaker-facing contract types used across UI and server code

