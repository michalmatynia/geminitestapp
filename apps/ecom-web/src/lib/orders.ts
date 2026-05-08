import type { Document, WithId } from 'mongodb';
import { getDb } from '@/lib/mongodb';

export type OrderItem = {
  productId: string;
  slug: string;
  name: string;
  category: string;
  size: string;
  price: number;
  priceDisplay: string;
  quantity: number;
  imageUrl?: string;
};

export type Order = {
  _id?: string;
  orderId: string;
  userId?: string;
  email: string;
  status: 'processing' | 'in-transit' | 'delivered';
  items: OrderItem[];
  shippingMethod: string;
  shippingPrice: number;
  shippingAddress: Record<string, string>;
  subtotal: number;
  discount: number;
  promoCode?: string;
  total: number;
  createdAt: string;
};

export const ORDERS_COLLECTION = 'ecom_orders';

export function generateOrderId(): string {
  const year = new Date().getFullYear();
  const num = String(Math.floor(1000 + Math.random() * 9000));
  return `ARC-${year}-${num}`;
}

function serializeOrder(doc: WithId<Document>): Order {
  const { _id, ...order } = doc;
  return {
    ...(order as Omit<Order, '_id'>),
    _id: _id.toString(),
  };
}

export async function getOrdersForUser(userId: string): Promise<Order[]> {
  const db = await getDb();
  const docs = await db
    .collection(ORDERS_COLLECTION)
    .find({ userId })
    .sort({ createdAt: -1 })
    .toArray();

  return docs.map(serializeOrder);
}
