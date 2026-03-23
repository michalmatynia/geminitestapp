import fs from 'node:fs';
import path from 'node:path';

const filePath = path.resolve('src/app/api/case-resolver/ocr/models/handler.ts');
const directory = path.dirname(filePath);
const directories = [directory, path.join(directory, '__tests__')];
const baseName = path.basename(filePath, path.extname(filePath));
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const testNameRe = new RegExp(`^${escapeRegex(baseName)}(?:[.-].+)?\\.(test|spec)\\.(ts|tsx)$`);

console.log('File Path:', filePath);
console.log('Base Name:', baseName);
console.log('Regex:', testNameRe.source);

for (const dir of directories) {
  console.log('Checking Dir:', dir);
  if (!fs.existsSync(dir)) {
    console.log('  Does not exist');
    continue;
  }
  const files = fs.readdirSync(dir);
  console.log('  Files:', files);
  for (const file of files) {
    if (testNameRe.test(file)) {
      console.log('  MATCH:', file);
    }
  }
}
