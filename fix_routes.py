import os
import re

def fix_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # List of methods to check
    methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
    
    modified = False
    
    for method in methods:
        # Match pattern: async function METHOD_handler(req: NextRequest): Promise<Response | NextResponse> {
        # or async function METHOD_handler(req: NextRequest): Promise<NextResponse | Response> {
        pattern = rf'async\s+function\s+{method}_handler\s*\(\s*req:\s*NextRequest\s*\)\s*:\s*Promise\s*<[^>]+>\s*\{{'
        
        replacement = f'async function {method}_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {{'
        
        if re.search(pattern, content):
            content = re.sub(pattern, replacement, content)
            modified = True

    if modified:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

# Walk through src/app/api
fixed_count = 0
for root, dirs, files in os.walk('src/app/api'):
    for file in files:
        if file == 'route.ts':
            if fix_file(os.path.join(root, file)):
                fixed_count += 1

print(f"Fixed {fixed_count} files")