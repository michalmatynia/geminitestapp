
import { Hono } from 'hono';
import { handle } from 'hono/netlify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = new Hono().basePath('/api');

app.get('/products', async (c) => {
  const products = await prisma.product.findMany();
  return c.json(products);
});

app.post('/products', async (c) => {
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

app.put('/products/:id', async (c) => {
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

app.delete('/products/:id', async (c) => {
  const id = c.req.param('id');
  await prisma.product.delete({ where: { id } });
  return c.body(null, 204);
});

app.delete('/products/:productId/images/:imageFileId', async (c) => {
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

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);

export { app };
