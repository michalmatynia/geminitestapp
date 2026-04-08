import { Project, SyntaxKind } from 'ts-morph';

const project = new Project({
  tsConfigFilePath: 'tsconfig.json',
  skipAddingFilesFromTsConfig: true,
});

project.addSourceFilesAtPaths('src/features/**/*.tsx');

const sourceFiles = project.getSourceFiles();
console.log(`Found ${sourceFiles.length} files to check.`);

let modifiedFiles = 0;
let modifiedInstances = 0;

for (const sourceFile of sourceFiles) {
  let fileModified = false;

  const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);

  const callsToWrap = [];

  for (const callExpr of callExpressions) {
    const expression = callExpr.getExpression();
    const expressionText = expression.getText();

    if (expressionText === 'router.push' || expressionText === 'router.replace') {
      // Check if it's already inside a startTransition
      let isAlreadyWrapped = false;
      let parent = callExpr.getParent();
      while (parent) {
        if (parent.getKind() === SyntaxKind.CallExpression) {
          const parentExprText = parent.asKind(SyntaxKind.CallExpression)?.getExpression().getText();
          if (parentExprText === 'startTransition' || parentExprText === 'React.startTransition') {
            isAlreadyWrapped = true;
            break;
          }
        }
        parent = parent.getParent();
      }

      if (!isAlreadyWrapped) {
        callsToWrap.push(callExpr);
      }
    }
  }

  if (callsToWrap.length > 0) {
    // Process backwards to avoid messing up character offsets
    // But since we are replacing nodes, ts-morph handles position changes automatically 
    // if we use node.replaceWithText() or node.transform()
    
    // Reverse array to replace from bottom to top safely, although ts-morph usually handles it
    callsToWrap.reverse().forEach(callExpr => {
      const originalText = callExpr.getText();
      callExpr.replaceWithText(`startTransition(() => { ${originalText}; })`);
      modifiedInstances++;
    });

    // Ensure startTransition is imported
    const reactImport = sourceFile.getImportDeclaration(decl => decl.getModuleSpecifierValue() === 'react');
    
    if (reactImport) {
      const namedImports = reactImport.getNamedImports();
      const hasStartTransition = namedImports.some(ni => ni.getName() === 'startTransition');
      
      if (!hasStartTransition) {
        reactImport.addNamedImport('startTransition');
      }
    } else {
      sourceFile.addImportDeclaration({
        moduleSpecifier: 'react',
        namedImports: ['startTransition'],
      });
    }

    sourceFile.saveSync();
    modifiedFiles++;
    fileModified = true;
    console.log(`Modified: ${sourceFile.getFilePath()}`);
  }
}

console.log(`\nRefactoring complete.`);
console.log(`Modified ${modifiedFiles} files.`);
console.log(`Wrapped ${modifiedInstances} router instances.`);
