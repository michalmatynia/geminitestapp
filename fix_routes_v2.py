import os
import re

def fix_params_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    modified = False
    
    # 1. Fix handler definitions
    # Match: async function METHOD_handler(req: NextRequest, props: { params: Promise<P> }): Promise<...>
    # or: async function METHOD_handler(req: NextRequest, { params }: { params: Promise<P> }): Promise<...>
    pattern_def = r'async\s+function\s+(\w+)_handler\s*\(\s*(_?req):\s*NextRequest\s*,\s*(?:props:\s*{\s*params:\s*Promise<([^>]+)>\s*}|\{\s*params\s*\}:\s*{\s*params:\s*Promise<([^>]+)>\s*})\s*\)\s*:\s*Promise<[^>]+>\s*\{'
    
    def replace_def(match):
        nonlocal modified
        method_name = match.group(1)
        req_name = match.group(2)
        params_type = match.group(3) or match.group(4)
        modified = True
        return f'async function {method_name}_handler({req_name}: NextRequest, _ctx: ApiHandlerContext, params: {params_type}): Promise<Response> {{'

    content = re.sub(pattern_def, replace_def, content)
    
    if not modified:
        return False

    # 2. Fix usage of params inside handler
    # Remove 'const { id } = await params;' or 'const params = await props.params;'
    content = re.sub(r'const\s+(\{[^}]+\})\s*=\s*await\s+params\s*;', r'const \1 = params;', content)
    content = re.sub(r'const\s+params\s*=\s*await\s+props\.params\s*;', r'', content)
    content = re.sub(r'const\s+(\{[^}]+\})\s*=\s*await\s+props\.params\s*;', r'const \1 = params;', content)
    content = re.sub(r'const\s+id\s*=\s*await\s+params\.id\s*;', r'const id = params.id;', content)
    content = re.sub(r'const\s+(\w+)\s*=\s*await\s+params\s*;', r'const \1 = params;', content)

    # 3. Fix exports
    # This is more complex because of various lambda shapes
    # Match: export const GET = apiHandlerWithParams<{ id: string }>( async (req, _ctx, params) => GET_handler(req, { params: Promise.resolve(params) }), { source: "..." } );
    pattern_export_lambda = r'export\s+const\s+(\w+)\s*=\s*apiHandlerWithParams<([^>]+)>\s*\(\s*(?:async\s*)?\([^)]*\)\s*=>\s*\w+_handler\([^)]*Promise\.resolve\(params\)[^)]*\)\s*,\s*{\s*source:\s*"([^"]+)"\s*}\s*\)\s*(?:;|)'

    def replace_export(match):
        method = match.group(1)
        params_type = match.group(2)
        source = match.group(3)
        return f'export const {method} = apiHandlerWithParams<{params_type}>({method}_handler, {{ source: "{source}" }});'

    content = re.sub(pattern_export_lambda, replace_export, content)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    return True

# Walk through src/app/api
fixed_count = 0
for root, dirs, files in os.walk('src/app/api'):
    for file in files:
        if file == 'route.ts':
            if fix_params_file(os.path.join(root, file)):
                fixed_count += 1

print(f"Fixed {fixed_count} dynamic route files")