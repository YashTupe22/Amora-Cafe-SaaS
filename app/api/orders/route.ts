import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken, getAdminDb } from '@/lib/firebaseAdmin';
import { generateOrderNumber } from '@/lib/waiterUtils';
import { FieldValue } from 'firebase-admin/firestore';
import type { Order, OrderStatus, OrderItem } from '@/lib/mockData';

// GET /api/orders - List all orders
export async function GET(req: NextRequest) {
  try {
    // Verify Firebase ID token
    const decoded = await verifyIdToken(req.headers.get('Authorization'));
    const uid = decoded.uid;

    // Parse query params
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as OrderStatus | null;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Validate limit
    if (isNaN(limit) || limit < 1 || limit > 500) {
      return NextResponse.json(
        { error: 'Invalid limit parameter. Must be between 1 and 500.' },
        { status: 400 }
      );
    }

    // Query Firestore
    const db = getAdminDb();
    let query = db
      .collection('orders')
      .where('_uid', '==', uid)
      .where('_syncStatus', '!=', 'deleted')
      .orderBy('_syncStatus')
      .orderBy('createdAt', 'desc')
      .limit(limit);

    // Filter by status if provided
    if (status) {
      const validStatuses: OrderStatus[] = ['placed', 'preparing', 'ready', 'served', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status. Must be one of: placed, preparing, ready, served, cancelled' },
          { status: 400 }
        );
      }
      query = db
        .collection('orders')
        .where('_uid', '==', uid)
        .where('_syncStatus', '!=', 'deleted')
        .where('status', '==', status)
        .orderBy('_syncStatus')
        .orderBy('createdAt', 'desc')
        .limit(limit);
    }

    const snapshot = await query.get();
    const orders = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        completedAt: data.completedAt?.toDate?.()?.toISOString() || data.completedAt,
      };
    });

    console.info(`[GET /api/orders] Retrieved ${orders.length} orders for user ${uid}`);
    return NextResponse.json({ ok: true, orders });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg.includes('Missing or malformed') || msg.includes('ID token')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[GET /api/orders]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/orders - Create new order
export async function POST(req: NextRequest) {
  try {
    // Verify Firebase ID token
    const decoded = await verifyIdToken(req.headers.get('Authorization'));
    const uid = decoded.uid;

    // Parse and validate request body
    const body = await req.json();
    const { waiterId, waiterName, waiterCode, tableNumber, items, notes } = body as {
      waiterId: string;
      waiterName: string;
      waiterCode: string;
      tableNumber: string;
      items: OrderItem[];
      notes?: string;
    };

    // Validate required fields
    if (!waiterId || !waiterName || !waiterCode || !tableNumber) {
      return NextResponse.json(
        { error: 'Missing required fields: waiterId, waiterName, waiterCode, tableNumber' },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'items array is required and must contain at least one item' },
        { status: 400 }
      );
    }

    // Validate each item
    for (const item of items) {
      if (!item.itemId || !item.name || !item.quantity || !item.price) {
        return NextResponse.json(
          { error: 'Each item must have itemId, name, quantity, and price' },
          { status: 400 }
        );
      }
      if (item.quantity < 1) {
        return NextResponse.json(
          { error: 'Item quantity must be at least 1' },
          { status: 400 }
        );
      }
      if (item.price < 0) {
        return NextResponse.json(
          { error: 'Item price cannot be negative' },
          { status: 400 }
        );
      }
    }

    const db = getAdminDb();

    // Get the current order count to generate order number
    const ordersSnapshot = await db
      .collection('orders')
      .where('_uid', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    let orderCount = 0;
    if (!ordersSnapshot.empty) {
      const lastOrder = ordersSnapshot.docs[0].data();
      if (lastOrder.orderNo) {
        const match = lastOrder.orderNo.match(/ORD-(\d+)/);
        if (match) {
          orderCount = parseInt(match[1], 10);
        }
      }
    }

    const orderNo = generateOrderNumber(orderCount);

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.05; // 5% GST
    const total = subtotal + tax;

    // Create order document
    const orderRef = db.collection('orders').doc();
    const orderData = {
      id: orderRef.id,
      orderNo,
      waiterId,
      waiterName,
      waiterCode,
      tableNumber,
      items,
      status: 'placed' as OrderStatus,
      subtotal,
      tax,
      total,
      notes: notes || '',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      _uid: uid,
      _syncStatus: 'synced',
    };

    await orderRef.set(orderData);

    console.info(`[POST /api/orders] Created order ${orderNo} for user ${uid}`);

    // Return created order with ISO timestamps
    const createdOrder = {
      ...orderData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({ ok: true, order: createdOrder }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg.includes('Missing or malformed') || msg.includes('ID token')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[POST /api/orders]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
