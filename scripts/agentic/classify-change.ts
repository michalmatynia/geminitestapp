import { classifyChangedFiles, loadDomainManifests } from './domain-manifests';

async function main(): Promise<void> {
  const manifests = await loadDomainManifests();
  const classification = classifyChangedFiles(process.argv.slice(2), manifests);
  process.stdout.write(`${JSON.stringify(classification, null, 2)}\n`);
}

void main();
