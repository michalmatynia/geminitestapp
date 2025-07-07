import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = new Hono();

app.get('/', async (c) => {
  const { search, minPrice, maxPrice, startDate, endDate } = c.req.query();
  const products = await prisma.product.findMany({
    where: {
      name: {
        contains: search,
        mode: 'insensitive',
      },
      price: {
        gte: minPrice ? parseInt(minPrice) : undefined,
        lte: maxPrice ? parseInt(maxPrice) : undefined,
      },
      createdAt: {
        gte: startDate ? new Date(startDate) : undefined,
        lte: endDate ? new Date(endDate) : undefined,
      },
    },
  });
  return c.json(products);
});

app.post('/', async (c) => {
  const body = await c.req.parseBody();
  const name = body['name'] as string;
  const price = parseInt(body['price'] as string);
  const sku = body['sku'] as string;

  if (!name || !price || !sku) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  const product = await prisma.product.create({
    data: {
      name,
      price,
      sku,
    },
  });

  return c.json(product);
});

app.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.parseBody();
  const name = body['name'] as string;
  const price = parseInt(body['price'] as string);
  const sku = body['sku'] as string;

  const product = await prisma.product.update({
    where: { id },
    data: {
      name,
      price,
      sku,
    },
  });

  return c.json(product);
});

app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await prisma.product.delete({ where: { id } });
  return c.body(null, 204);
});

app.delete('/:productId/images/:imageFileId', async (c) => {
  const { productId, imageFileId } = c.req.param();
  await prisma.productImage.delete({
    where: {
      productId_imageFileId: {
        productId,
        imageFileId,
      },
    },
  });
  return c.body(null, 204);
});

export default app;