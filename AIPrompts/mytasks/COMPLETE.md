

5. Database robustness with Prisma + MongoDB

Indexes are non-optional

Add indexes for frequent filters/sorts and unique constraints where needed.

Model invariants

Enforce “must always be true” rules in one place (service layer), not scattered across UI.

Transactions where needed

Mongo supports transactions in replica sets; use them when writing multiple documents that must stay consistent.

Soft deletes / lifecycle fields

Consider deletedAt, createdAt, updatedAt (and enforce update semantics).

Concurrency strategy

For “edit product” style flows: consider optimistic concurrency (version field) to prevent lost updates.

Avoid leaking DB IDs

Normalize IDs at boundaries; don’t let random UI code depend on raw _id formats.



7. Forms & state: reduce UI bugs drastically

Single form strategy

Use a form library + schema validation (e.g., Zod resolver).

Server-side validation mirrors client

Same schema; no “client passes but server rejects” surprises.

Avoid “derived state” mistakes

Prefer computed values, selectors, and memoization to duplicated state.

Loading/error UX standard

Consistent patterns for pending, error, empty, success states.

8. Security hardening checklist (web-app basics, but often missed)

Auth & authorization

Centralize permission checks (can(user).editProduct(product)).

Never trust client role flags.

CSRF protection

Especially if you use cookies for auth.

Rate limiting

Login, search, write endpoints, “AI generate description” endpoints.

Security headers

CSP (where feasible), X-Frame-Options, Referrer-Policy, etc.

Input sanitization

Prevent XSS in any user-generated HTML/markdown rendering.

Secret hygiene

Ensure secrets never reach client bundles; verify with build-time checks.

9. Testing: make regressions expensive for the code, not for you

Testing pyramid

Unit tests: domain logic, validators, utilities.

Integration tests: service layer + DB (use a test DB).

E2E tests: critical flows (auth, product CRUD, checkout).

Contract tests

If you have API consumers, lock request/response contracts.

Factories/fixtures

Build deterministic test data creators, not ad-hoc JSON blobs.

Test “failure cases”

Validation failures, not found, permission denied, duplicate keys, timeouts.

10. Tooling automation (quality gates)

Pre-commit hooks

lint-staged + eslint + tsc --noEmit on changed files.

CI pipeline

Lint, typecheck, unit tests, integration tests, build, minimal E2E smoke.

Dependency health

Dependabot + npm audit in CI; consider Snyk if you want more.

Consistent formatting

Prettier + import sorting + consistent lint rules across the repo.

11. Performance & reliability (bugs often hide here)

Caching strategy

Decide where caching lives (Next.js fetch cache / route revalidation / client cache).

N+1 query avoidance

Watch your “load a list → fetch details per row” patterns.

Timeouts & retries

Explicit timeouts for external calls; retries only where safe (idempotent).

Backpressure

For heavy tasks: queue jobs (email, image processing, large imports).

Feature flags

Ship changes safely and rollback quickly.

1. Route Handlers: make them “thin, consistent, hard to misuse”

A. Standardize request parsing + validation


Validate everything at the boundary (query, params, body).


Introduce lib/validators/products.ts with Zod schemas:


ProductCreateSchema, ProductUpdateSchema, ProductQuerySchema (pagination/sort/filter), ProductIdSchema (ObjectId-like string).


Parse context.params.id and reject early with 400 instead of “falls through and Prisma throws”.


B. One response format (success + error)


Adopt a stable envelope so clients don’t guess:


Success: { ok: true, data, meta? }


Error: { ok: false, error: { code, message, requestId?, details? } }


Never leak raw stack traces to client; keep them in logs/Sentry only.


C. One error mapping point


Route handlers should not contain random try/catch blocks with ad-hoc messages.


Add lib/http/handleRoute.ts wrapper that:


generates requestId


catches errors


maps AppError / Prisma errors → HTTP status + safe payload


logs once, consistently


D. Security controls at the boundary


AuthN/AuthZ: check user + permissions before calling service


Rate limit write endpoints and expensive reads (search) (even a simple in-memory limiter per deployment or a Redis-based one).


Allowlist fields in update payload (prevent mass assignment: updating createdAt, internal flags, etc.)


2. Service Layer: make it deterministic and testable

A. Split “business logic” vs “infrastructure”


Right now productService.ts does a lot (DB + file handling + validation). Split into:


lib/services/productService.ts (orchestrates use-cases)


lib/repositories/productRepository.ts (Prisma calls only)


lib/services/storageService.ts (file upload/delete)


lib/services/productMapper.ts (DB → DTO mapping)

This reduces bugs by making each layer small and mockable.


B. Enforce invariants in one place


Examples of “always true” rules that belong in service:


SKU uniqueness rules


Price >= 0, stock >= 0


“If product is published, must have images and description”


Cannot delete product that has dependencies (orders, etc.)

Throw a typed AppError when a rule is violated.


C. Use a typed error taxonomy (instead of generic throws)


Create:


ValidationError (400)


NotFoundError (404)


ConflictError (409) (unique constraint / version conflicts)


ForbiddenError (403)


UnauthorizedError (401)


RateLimitError (429)


InternalError (500)


D. Prisma/Mongo specifics to harden


Ensure you have the right indexes for list pages and search filters.


Ensure unique constraints where required (SKU, slug, etc.)


Handle Prisma error codes centrally (e.g., unique constraint conflicts → 409).


Normalize ID handling: always treat IDs as strings at the API boundary; map internally.


E. Optional but powerful: optimistic concurrency


For update endpoints:


add version / updatedAt check to prevent “last write wins” overwriting changes


client sends ifMatchVersion (or timestamp), service rejects with 409 if stale


3. DTOs + Mapping: stop leaking DB shapes into UI


Create lib/dtos/product.ts:


ProductDTO (client-facing)


ProductListItemDTO (list pages)


CreateProductInput, UpdateProductInput (validated inputs)


Add mapper functions:


toProductDTO(prismaProduct): ProductDTO

This prevents accidental exposure of internal fields (cost price, supplier IDs, etc.) and stabilizes your frontend.


4. Client fetch layer (lib/api.ts): make it typed + resilient

A. Typed client with runtime validation


Don’t trust server responses blindly.


Parse API responses with Zod schemas (ProductDTOSchema) so UI fails loudly during dev if the contract drifts.


B. Standardized error handling in one place


Convert { ok: false, error } into a typed ApiError with:


code, message, status, requestId, details


UI can then display friendly messages by code (not by brittle string matching).


C. Abort + retry rules


Use AbortController for lists/search (avoid race conditions).


Retry only idempotent requests (GET) and only on safe transient errors.


D. Consider a query library (optional)


If product lists & filters are complex, add SWR/React Query:


automatic caching, dedupe, retries, stale-while-revalidate


reduces UI state bugs massively


6. Testing strategy focused on your architecture

A. Unit tests (fast)


validators (Zod schemas)


mappers (DB → DTO)


productService rules (with mocked repository/storage)


B. Integration tests (real DB)


productRepository against a test Mongo instance


productService against test DB for “real” flows


C. Route handler tests (contract-level)


test: correct status codes + envelope + error mapping


test: invalid params/body returns 400 with code VALIDATION_ERROR


7. Consistency and maintainability improvements


Feature folder for products:


features/products/{validators,dtos,repository,service,tests}


Naming conventions:


getProductById, listProducts, createProduct, etc.


No Prisma in route handlers


No file handling inside repository


Prefer “small functions + clear return types” over huge handlers


8. Concrete “drop-in” pattern (route wrapper + AppError)


Here’s the shape to aim for (minimal, but very effective):

Copy
// lib/errors/AppError.ts
export class AppError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string,
    public details?: unknown,
    public cause?: unknown
  ) {
    super(message);
  }
}

// lib/http/handleRoute.ts
import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors/AppError";

export function handleRoute(
  fn: (req: Request, ctx?: any) => Promise<Response>
) {
  return async (req: Request, ctx?: any) => {
    const requestId = crypto.randomUUID();
    try {
      return await fn(req, ctx);
    } catch (err: any) {
      // Map known errors
      if (err instanceof AppError) {
        return NextResponse.json(
          { ok: false, error: { code: err.code, message: err.message, requestId, details: err.details } },
          { status: err.status }
        );
      }

      // TODO: map Prisma errors to Conflict, etc.

      // Unknown = 500
      console.error({ requestId, err });
      return NextResponse.json(
        { ok: false, error: { code: "INTERNAL_ERROR", message: "Unexpected error", requestId } },
        { status: 500 }
      );
    }
  };
}
Then in app/api/products/route.ts:


validate input


call service


return { ok: true, data }

…and nothing else.


9. A recommended “next 7 steps” plan for Products


Add Zod schemas for params/query/body + env validation


Add AppError + handleRoute() wrapper + Prisma error mapping


Split service into service/repository/storage/mapper


Introduce DTOs and stop returning raw Prisma objects


Upgrade lib/api.ts to typed + runtime-validated responses


Add unit tests for validators + service rules


Add integration tests for repository/service + basic route contract tests


Part 3
High-priority issues & quick wins (do these first)

1. Atomicity: DB changes + file moves can leave inconsistent state


createProduct() does:


create product in DB


upload/link images (writes files + DB image links)


update catalogs (DB)


If step 2 or 3 fails, you can end up with:


Product created without catalogs (or partially linked images)


Uploaded files on disk but DB not linked (or vice versa)


Temp files moved but DB update fails


Fix pattern (practical):


Treat file operations as “side effects” and make them compensatable (cleanup on failure).


Or do a two-phase approach:


Create product → link DB rows first → then move files → then finalize paths


At minimum: add try { … } catch { cleanupUploadedFiles(); cleanupLinks(); throw; }


2. Path safety / deletion safety


You’re already protecting directory deletion with:


if (folderDiskPath.startsWith(path.join(process.cwd(), "public", "uploads", "products")))


Good. But you still have deletion/move operations that depend on imageFile.filepath coming from DB.


Hardening checklist:


Ensure getDiskPathFromPublicPath():


uses path.resolve


rejects anything that escapes the allowed base folder (prevents traversal)


Treat data: as external too. Right now unlink logic only checks https?://:


const isExternal = /^https?:\/\//i.test(imageFile.filepath);


If filepath is data:..., you’ll try to unlink() it — bad. Use:


const isExternal = /^(https?:|data:)/i.test(imageFile.filepath);


3. Performance: getProducts() does N×filesystem access checks


This can become a big slowdown on product list pages:


for each product


for each image


do fs.access


Options:


Prefer serving images and letting missing files 404 (fastest).


Or track a DB boolean like existsOnDisk and validate asynchronously (cron/task).


Or only verify file existence in admin detail view, not list.


4. Error handling consistency


Right now you try/catch and rethrow the same error:

Copy
catch (error) {
  logger.error("Error creating product:", error);
  throw error;
}
That’s fine for logging, but it’s not giving you typed, mappable errors (400/404/409/etc.).


Upgrade:


Introduce AppError types and throw those from service/repo.


Route wrapper maps errors → HTTP status + safe payload.


Your service should not throw plain Error("SKU is required") (that becomes 500 unless mapped).


5. Validation inconsistency: duplicateProduct() bypasses Zod


You validate SKU manually, but elsewhere you use schemas. This leads to drift.


Fix:


Add a duplicateProductSchema (or reuse SKU schema) and parse it.


Medium refactor: split the service (this will reduce bugs long-term)


Right now productService.ts mixes:


orchestration


validation


filesystem side effects


repo calls


“image/link” workflows


Suggested split (minimal but clean):

Copy
lib/features/products/
  service.ts // orchestration (create/update/delete/duplicate)
  validators.ts // zod schemas for inputs (incl. duplicate)
  dto.ts // ProductDTO / list DTO (client-safe shape)
  mapper.ts // prisma -> DTO
  repository.ts // productRepository wrapper / interface
  imageLinking.ts // linkImagesToProduct, unlinkImageFromProduct, moveTemp...
  filePaths.ts // temp prefix, safeSku, safe path helpers
This makes it easy to test:


validators unit tests


imageLinking with mocked fs + mocked repos


service integration tests


Concrete improvements inside your current code (targeted)

A) Centralize parsing of FormData


Right now you repeat extraction in create/update:

Copy
const images = formData.getAll("images") as File[];
const imageFileIds = formData.getAll("imageFileIds") as string[];
const catalogIds = normalizeCatalogIds(formData.getAll("catalogIds"));
Create a helper that:


filters non-File entries


normalizes strings safely


returns a typed object


Example shape:

Copy
function parseProductForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const images = formData.getAll("images").filter((x): x is File => x instanceof File);
  const imageFileIds = formData.getAll("imageFileIds").filter((x): x is string => typeof x === "string");
  const catalogIds = normalizeCatalogIds(formData.getAll("catalogIds"));
  return { raw, images, imageFileIds, catalogIds };
}
Then schema-parse raw as you do.


B) Make linkImagesToProduct safer + faster (bounded concurrency)


Uploads are sequential; that’s safe but slow. Full parallelism can overload memory. Best practice is bounded parallel (e.g., limit 3–5 at once).


Also validate file types/size before upload:


max file size


allowed MIME types


reject empty files (you already do)


C) Race conditions in unlinkImageFromProduct


Two concurrent unlinks can both see remainingLinks === 0 and both attempt delete DB/file. You already tolerate ENOENT for file/folder, but DB delete may still throw.


Hardening:


deleteImageFile(imageFileId) should be idempotent or handled with “not found → ignore”


consider moving “remainingLinks check + delete” into the repository with a single atomic operation if possible


D) Move functions assume image.imageFile always exists


In moveLinkedTempImagesToSku():


image.imageFile.filepath.startsWith(...)


If an image link exists but imageFile relation is missing/null (data inconsistency), you’ll throw.


Safer:


.filter(img => img.imageFile?.filepath?.startsWith(tempProductPathPrefix))


E) Remove console.log and use structured logging


In getProducts() you use:


console.log("[productService] getProducts filters:", filters);


Prefer logger.debug({ filters }, "getProducts"), and include requestId (ideally passed in via context).


Recommended “safe API contract” upgrade


Even if you keep FormData, you can still make response + errors predictable:


Service throws AppError with codes: VALIDATION, NOT_FOUND, CONFLICT, FORBIDDEN, IO_ERROR


Route wrapper maps those to:


400 / 404 / 409 / 403 / 500


Client lib/api.ts converts error payload into a typed ApiError


This single change makes debugging and UI error UX dramatically better.


Testing plan tailored to this file

Unit tests (fast)


normalizeCatalogIds


SKU validation (duplicate)


safeSku conversion


“external path detection” (https: / data:)


Integration tests (DB + fake fs)


createProduct:


creates product + links catalogs + links images


failure during image upload → product cleanup / no orphan links


updateProduct:


changes sku triggers temp move


unlinkImageFromProduct:


last link deletes file & db record


concurrent unlink tolerates ENOENT/idempotency


One critical deployment note (Next.js App Router)


Because you use fs/promises, these routes must run in Node runtime, not Edge.

Make sure the route files include:


export const runtime = "nodejs";


(or otherwise ensure they’re not deployed to edge by config), or filesystem calls will break.




1. Zod schemas: fix silent coercion bugs + enforce invariants

✅ Critical bug: z.coerce.number() turns "" into 0


In HTML forms, empty numeric fields often arrive as "". Number("") === 0, so your schema currently converts empty fields to 0 (not null/undefined). That can silently overwrite values.


Fix pattern: preprocess empty string → undefined, then coerce.

Copy
const emptyToUndefined = (v: unknown) =>
  v === "" || v === null || v === undefined ? undefined : v;

const optionalInt = z.preprocess(
  emptyToUndefined,
  z.coerce.number().int()
).optional();

const optionalNonNegInt = z.preprocess(
  emptyToUndefined,
  z.coerce.number().int().min(0)
).optional();
Then change fields like:


price, stock, sizeLength, weight, etc. to optionalNonNegInt (or at least optionalInt).


✅ SKU rules should be consistent everywhere


Right now:

Copy
duplicateProduct() enforces ^[A-Z0-9]+$

create/update accept basically anything (trim + min(1), but optional)
Make one SKU schema and reuse it:

Copy
export const skuSchema = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() : v),
  z.string()
    .min(1, "SKU is required")
    .regex(/^[A-Z0-9_-]+$/, "SKU must use A–Z, 0–9, _ or -")
);

export const optionalSku = z.preprocess(
  (v) => (v === "" || v == null ? undefined : v),
  skuSchema
).optional();
Now duplicateProduct() should do skuSchema.parse(sku) and stop having separate logic.


✅ Validate imageLinks as URLs (if you intend them to be external)


Your imageLinksSchema currently returns string[] without validating contents. If they should be links, enforce:

Copy
const imageLinksSchema = z.preprocess(/* your preprocess */,
  z.array(z.string().trim().url("Invalid URL"))
).optional();
If you also allow relative paths, use a custom refinement instead.


✅ Avoid schema drift: define “form payload schema” separate from “DB model schema”


Because FormData also includes images, imageFileIds, catalogIds, you’ll eventually want strict parsing, but .strict() will break unless you strip non-model fields first.


Best practice:

Copy
productModelSchema = fields stored on product

productFormSchema = { product: productModelSchema, catalogIds, imageFileIds }
2. getDiskPathFromPublicPath: harden against path traversal (important)


Current code:

Copy
return path.join(process.cwd(), "public", publicPath.replace(/^\/+/, ""));

This can escape public/ with inputs like /uploads/../../../../etc/passwd because path.join normalizes ...

Replace it with a safe resolver + allowlist base:

const publicRoot = path.resolve(process.cwd(), "public");

export function getDiskPathFromPublicPath(publicPath: string) {
  const cleaned = publicPath.replace(/^\/+/, ""); // remove leading /
  const resolved = path.resolve(publicRoot, cleaned);

  if (!resolved.startsWith(publicRoot + path.sep)) {
    throw new Error("Invalid path"); // or AppError("INVALID_PATH", 400, ...)
  }
  return resolved;
}
Do the same for any “public path → disk path” conversions used in delete/move.


3. uploadFile: add guardrails (size/type/filename) + reduce collision risk

✅ Add max size + mime allowlist


Right now any file type/size can be written to disk.


At minimum:

Copy
MAX_IMAGE_BYTES (e.g., 5–15 MB)

allowlist mime types: image/jpeg, image/png, image/webp, etc.

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

if (file.size > MAX_IMAGE_BYTES) throw new Error("File too large");
if (!ALLOWED_MIME.has(file.type)) throw new Error("Unsupported file type");
✅ Use a safer filename


Date.now() + basename(file.name) is OK-ish but still predictable. Prefer crypto.randomUUID() and preserve extension:

Copy
import crypto from "crypto";

const ext = path.extname(file.name).toLowerCase();
const filename = `${crypto.randomUUID()}${ext}`;
✅ Streaming (optional)


You currently buffer the whole file in memory: Buffer.from(await file.arrayBuffer()).

If uploads can be large, consider streaming — but even without streaming, size cap is the big win.


4. unlinkImageFromProduct: fix external detection + race/idempotency

✅ Treat data: as external too


You already do this in getProducts() when filtering, but not here:

Copy
const isExternal = /^(https?:|data:)/i.test(imageFile.filepath);
✅ Make deletes idempotent


Two concurrent unlinks can both decide remainingLinks === 0. You handle ENOENT for file/folder, but DB delete can still throw.


Recommendations:


imageFileRepository.deleteImageFile() should either:


return null if already deleted, or


you catch “not found” and ignore


Same for fs.unlink and fs.rmdir (you already do for ENOENT, good)


5. createProduct/updateProduct: add “compensation” so you don’t orphan data


This is the biggest correctness gap.


Problem


If image upload succeeds but catalog update fails (or vice versa), you can end up with:


DB product created but incomplete


files written but not linked


imageFile records created but not linked


Practical fix: track side effects and cleanup on error


In createProduct() / updateProduct():


keep uploadedImageFileIds: string[]


on failure, remove DB links and delete files for those IDs (only those created in this request)


Sketch:


linkImagesToProduct should return { uploadedImageFileIds }


caller wraps remaining steps; on error:


unlink those image files from product


delete those image file records


delete those files on disk (if local)


This turns your process into a “transaction-ish” flow without needing DB transactions.


6. Service/API contract: stop throwing plain Error from business logic


Right now you throw plain Error("SKU is required"), etc. That will usually become a 500 unless your route wrapper recognizes it.


Add typed errors:


ValidationError → 400


NotFoundError → 404


ConflictError → 409 (SKU unique constraint)


FileIOError → 500 or 503


Then route handler wrapper maps them to consistent { ok: false, error: { code, message } }.


7. Repository types: tighten filters (right now they’re all strings)


ProductFilters uses minPrice?: string, page?: string, etc.


Make the route handler validate/convert these into a typed filters object:

Copy
type ProductFiltersParsed = {
  search?: string;
  sku?: string;
  minPrice?: number;
  maxPrice?: number;
  page: number;
  pageSize: number;
  catalogId?: string;
  startDate?: Date;
  endDate?: Date;
};
Then repository methods only accept the parsed type. This eliminates a whole class of bugs.


8. 


export const runtime = "nodejs";

Fix Zod coercion ("" → 0) by adding preprocess helpers


Harden getDiskPathFromPublicPath with path.resolve + base enforcement


Add upload guards (max size + allowed mime + UUID filenames)


Fix unlinkImageFromProduct external check (data:) + idempotent deletes


Add compensation cleanup in createProduct/updateProduct to prevent orphans


Validate and type ProductFilters at the API boundary (route handler)



---

1. AppErrorCodes Mismatch (app-error.ts)
The AppErrorCodes object only defines 4 codes, but helper functions reference ~15 undefined codes (unauthorized, forbidden, notFound, etc.). This will cause runtime errors.

2. Security Vulnerabilities (185+ warnings detected)
XSS in Allegro callback, WebSocket, streaming hooks
Path traversal in file upload/restore/backup routes
SSRF in external API calls
Log injection throughout logging (sanitize user input)
Hardcoded credentials in some files
3. Validation Over-Engineering (products/validations/)
~80KB of validation code with 20+ files including validators.ts, validators-old.ts, validators-enhanced.ts, validators-clean.ts. This is framework-level complexity for simple product validation.

🟡 Architecture Improvements
4. Consolidate Validation
Keep: schemas.ts + validators.ts (single entry)
Delete: validators-old.ts, validators-enhanced.ts, validators-clean.ts
Move: batch/streaming/cache to feature-specific modules (imports, admin)
5. Complete AppErrorCodes - Add missing codes:
const AppErrorCodes = {
  validation: 'VALIDATION_ERROR',
  unauthorized: 'UNAUTHORIZED',
  forbidden: 'FORBIDDEN', 
  notFound: 'NOT_FOUND',
  conflict: 'CONFLICT',
  rateLimited: 'RATE_LIMITED',
  // ... all others used in helper functions
} as const;
6. Type Organization
Use Zod schemas as single source of truth for DTOs
Keep only cross-domain types in shared/types
Feature-specific types stay in feature folders
7. Performance
Avoid double-fetching between RSC and React Query
Confirm single Prisma client instance (connection pooling)
Add staleTime for read-heavy data
Want me to implement any of these fixes? The AppErrorCodes fix is highest priority—it will cause runtime errors currently.

