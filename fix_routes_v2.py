import os
import re

# Match the outer function signature and the inner call
# Outer function starts with async (req: NextRequest, ctx: ApiHandlerContext, params: { ... })
# or async (req: NextRequest, _ctx: ApiHandlerContext, params: { ... })
# or async (req: NextRequest, ctx: any, params: { ... })
pattern = re.compile(
    r'async\s*\(req:\s*NextRequest,.*?\)\s*:\s*Promise<Response>\s*=>\s*async\s*\(req:\s*NextRequest\(req,\s*\{\s*params:\s*Promise\.resolve\(params\)\s*\}\).*?\)\s*:\s*Promise<Response>\s*=>\s*([A-Z]+)_handler\(req,\s*\{\s*params:\s*Promise\.resolve\(params\)\s*\}\)',
    re.DOTALL
)

# Also handle cases where the inner function doesn't have : Promise<Response>
pattern2 = re.compile(
    r'async\s*\(req:\s*NextRequest,.*?\)\s*:\s*Promise<Response>\s*=>\s*async\s*\(req:\s*NextRequest\(req,\s*\{\s*params:\s*Promise\.resolve\(params\)\s*\}\).*?\)\s*=>\s*([A-Z]+)_handler\(req,\s*\{\s*params:\s*Promise\.resolve\(params\)\s*\}\)',
    re.DOTALL
)

# And cases where the outer function doesn't have the explicit return type
pattern3 = re.compile(
    r'async\s*\(req:\s*NextRequest,.*?\)\s*=>\s*async\s*\(req:\s*NextRequest\(req,\s*\{\s*params:\s*Promise\.resolve\(params\)\s*\}\).*?\)\s*=>\s*([A-Z]+)_handler\(req,\s*\{\s*params:\s*Promise\.resolve\(params\)\s*\}\)',
    re.DOTALL
)

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    new_content = pattern.sub(r'async (req, _ctx, params) => \1_handler(req, { params: Promise.resolve(params) })', content)
    new_content = pattern2.sub(r'async (req, _ctx, params) => \1_handler(req, { params: Promise.resolve(params) })', new_content)
    new_content = pattern3.sub(r'async (req, _ctx, params) => \1_handler(req, { params: Promise.resolve(params) })', new_content)
    
    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        return True
    return False

files = [
    "src/app/api/countries/[id]/route.ts",
    "src/app/api/catalogs/[id]/route.ts",
    "src/app/api/cms/pages/[id]/route.ts",
    "src/app/api/cms/slugs/[id]/route.ts",
    "src/app/api/cms/blocks/[id]/route.ts",
    "src/app/api/drafts/[id]/route.ts",
    "src/app/api/auth/users/[id]/security/route.ts",
    "src/app/api/currencies/[id]/route.ts"
]

count = 0
for f in files:
    if os.path.exists(f):
        if fix_file(f):
            count += 1
            print(f"Fixed {f}")
    else:
        print(f"File not found: {f}")

print(f"Finished. Fixed {count} files.")
