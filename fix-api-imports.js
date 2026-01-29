import fs from 'fs';
import path from 'path';

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, "/", file));
    }
  });

  return arrayOfFiles;
}

const apiFiles = getAllFiles('src/app/api', []).filter(f => f.endsWith('.ts'));

apiFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Ensure NextRequest is imported if used
  if (content.includes('NextRequest') && !content.includes('import { NextRequest') && !content.includes('import { ..., NextRequest')) {
    if (content.includes('import { NextResponse } from "next/server"')) {
      content = content.replace('import { NextResponse }', 'import { NextRequest, NextResponse }');
      changed = true;
    } else if (content.includes('import { NextResponse } from \'next/server\'')) {
      content = content.replace('import { NextResponse }', 'import { NextRequest, NextResponse }');
      changed = true;
    } else if (!content.includes('from "next/server"')) {
      content = 'import { NextRequest } from "next/server";\n' + content;
      changed = true;
    }
  }

  // Update handler signatures to use NextRequest instead of Request
  const handlerRegex = /async function (GET|POST|PUT|DELETE|PATCH)_handler\(\s*req:\s*Request/g;
  if (content.match(handlerRegex)) {
    content = content.replace(handlerRegex, 'async function $1_handler(req: NextRequest');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content);
  }
});
