
import { Hono } from 'hono';
import { handle } from 'hono/netlify';
import products from '../products/route';

const app = new Hono().basePath('/api');

app.route('/products', products);

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);

export { app };
