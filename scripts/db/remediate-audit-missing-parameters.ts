import 'dotenv/config';
import fs from 'node:fs';
import { ObjectId } from 'mongodb';
import { productService } from '@/shared/lib/products/services/productService';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

const AUDIT_FILE = '/tmp/product-missing-parameters-audit-latest.json';

const ensureAnimeFiguresCategory = async (): Promise<string> => {
  const db = await getMongoDb();
  let category = await db.collection('product_categories').findOne({ name: 'Anime Figures' });
  if (!category) {
    category = await db.collection('product_categories').findOne({ name_en: 'Anime Figures' });
  }

  if (category) {
    const id =
      (typeof category['id'] === 'string' ? category['id'] : null) || category._id.toString();
    console.log(`Found Anime Figures category: ${id}`);
    return id;
  }

  const generatedId = new ObjectId().toString();
  await db.collection('product_categories').insertOne({
    _id: new ObjectId(generatedId),
    id: generatedId,
    name: 'Anime Figures',
    name_en: 'Anime Figures',
    name_pl: 'Figurki Anime',
    slug: 'anime-figures',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  console.log(`Created Anime Figures category: ${generatedId}`);
  return generatedId;
};

const getCategoryForSku = (
  sku: string | null | undefined,
  genericFiguresId: string
): string | null => {
  if (!sku) return null;
  const upper = sku.toUpperCase();
  if (upper.startsWith('FIGANI')) return genericFiguresId;
  if (upper.startsWith('FOASW') || upper.startsWith('SPEFA')) return '69a0fb54def2acda47a005e3'; // Foam Toy Sword
  return null;
};

type AuditReport = {
  products: Array<{
    id: string;
    sku?: string | null;
    name_en?: string | null;
  }>;
};

async function main() {
  if (!fs.existsSync(AUDIT_FILE)) {
    console.error(`Audit file not found: ${AUDIT_FILE}`);
    process.exit(1);
  }

  const report = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8')) as AuditReport;
  const productsToFix = report.products;

  console.log(`Found ${productsToFix.length} products to remediate.`);
  if (productsToFix.length === 0) return;

  const animeFiguresCategoryId = await ensureAnimeFiguresCategory();

  let fixedCount = 0;

  for (const p of productsToFix) {
    const product = await productService.getProductById(p.id) as Record<string, unknown> | null;
    if (!product) {
      console.log(`Skipping ${p.id}: not found.`);
      continue;
    }

    const rawNameEn = (product['name_en'] as string) || p.name_en || '';
    if (!rawNameEn.includes('|')) {
      console.log(`Skipping ${p.id}: name_en does not contain descriptors. Found: ${rawNameEn}`);
      continue;
    }

    const segments = rawNameEn
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean);
    const [baseName, material, size, theme] = segments;

    const parameters = [];
    if (material) {
      parameters.push({
        parameterId: 'material',
        value: material,
        valuesByLanguage: { pl: material }
      });
    }
    if (size) {
      parameters.push({
        parameterId: 'size',
        value: size,
        valuesByLanguage: { pl: size }
      });
    }
    if (theme) {
      parameters.push({
        parameterId: 'theme',
        value: theme,
        valuesByLanguage: { pl: theme }
      });
    }

    const categoryId = getCategoryForSku(product['sku'] as string, animeFiguresCategoryId);
    
    const updates: Record<string, unknown> = {
      name_pl: baseName,
      name_en: baseName, // Simplified to the base name
      parameters,
    };

    if (categoryId) {
      updates['categoryId'] = categoryId;
    }

    await productService.updateProduct(p.id, updates);
    console.log(
      `Remediated ${p.id} (${String(product['sku'] ?? '')}): set name_pl='${baseName}', added ${parameters.length} params, cat=${categoryId || 'none'}`
    );
    fixedCount++;
  }

  console.log(`Completed. Remediated ${fixedCount} products.`);
}

main().catch((error) => {
  console.error('[remediate-audit-missing-parameters] failed', error);
  process.exit(1);
});
