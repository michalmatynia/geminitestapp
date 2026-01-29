import os
import re

pattern = re.compile(
    r'async\s*\(req:\s*NextRequest,\s*ctx:\s*ApiHandlerContext,\s*params:\s*\{[^}]*\}\):\s*Promise<Response>\s*=>\s*async\s*\(req:\s*NextRequest\(req,\s*\{\s*params:\s*Promise\.resolve\(params\)\s*\}\),\s*(_ctx|ctx):\s*ApiHandlerContext,\s*params:\s*\{[^}]*\}\):\s*Promise<Response>\s*=>\s*([A-Z]+)_handler\(req,\s*\{\s*params:\s*Promise\.resolve\(params\)\s*\}\)'
)

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    new_content = pattern.sub(r'async (req, _ctx, params) => \2_handler(req, { params: Promise.resolve(params) })', content)
    
    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        return True
    return False

# List of files from the grep output
files = [
    "src/app/api/products/categories/[id]/route.ts",
    "src/app/api/catalogs/[id]/route.ts",
    "src/app/api/products/[id]/route.ts",
    "src/app/api/products/parameters/[id]/route.ts",
    "src/app/api/products/[id]/duplicate/route.ts",
    "src/app/api/products/[id]/images/[imageFileId]/route.ts",
    "src/app/api/marketplace/mappings/[id]/route.ts",
    "src/app/api/products/tags/[id]/route.ts",
    "src/app/api/products/ai-jobs/[jobId]/route.ts",
    "src/app/api/price-groups/[id]/route.ts",
    "src/app/api/countries/[id]/route.ts",
    "src/app/api/notes/notebooks/[id]/route.ts",
    "src/app/api/notes/themes/[id]/route.ts",
    "src/app/api/notes/categories/[id]/route.ts",
    "src/app/api/notes/[id]/route.ts",
    "src/app/api/notes/[id]/files/route.ts",
    "src/app/api/notes/[id]/files/[slotIndex]/route.ts",
    "src/app/api/notes/tags/[id]/route.ts",
    "src/app/api/public/products/[id]/route.ts",
    "src/app/api/integrations/export-templates/[id]/route.ts",
    "src/app/api/integrations/[id]/connections/route.ts",
    "src/app/api/integrations/import-templates/[id]/route.ts",
    "src/app/api/integrations/[id]/connections/[connectionId]/test/route.ts",
    "src/app/api/integrations/connections/[id]/session/route.ts",
    "src/app/api/integrations/[id]/connections/[connectionId]/allegro/disconnect/route.ts",
    "src/app/api/integrations/connections/[id]/route.ts",
    "src/app/api/integrations/[id]/connections/[connectionId]/allegro/authorize/route.ts",
    "src/app/api/integrations/[id]/connections/[connectionId]/allegro/callback/route.ts",
    "src/app/api/integrations/[id]/connections/[connectionId]/allegro/request/route.ts",
    "src/app/api/integrations/[id]/connections/[connectionId]/allegro/test/route.ts",
    "src/app/api/integrations/[id]/connections/[connectionId]/base/request/route.ts",
    "src/app/api/integrations/products/[id]/listings/route.ts",
    "src/app/api/integrations/products/[id]/listings/[listingId]/route.ts",
    "src/app/api/integrations/products/[id]/listings/[listingId]/purge/route.ts",
    "src/app/api/integrations/products/[id]/listings/[listingId]/delete-from-base/route.ts",
    "src/app/api/integrations/[id]/connections/[connectionId]/base/inventories/route.ts",
    "src/app/api/integrations/products/[id]/export-to-base/route.ts",
    "src/app/api/integrations/[id]/connections/[connectionId]/base/test/route.ts",
    "src/app/api/integrations/[id]/connections/[connectionId]/base/products/route.ts",
    "src/app/api/languages/[id]/route.ts",
    "src/app/api/drafts/[id]/route.ts",
    "src/app/api/auth/users/[id]/route.ts",
    "src/app/api/auth/users/[id]/security/route.ts",
    "src/app/api/currencies/[id]/route.ts",
    "src/app/api/files/[id]/route.ts",
    "src/app/api/cms/pages/[id]/route.ts",
    "src/app/api/cms/slugs/[id]/route.ts",
    "src/app/api/cms/blocks/[id]/route.ts"
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
