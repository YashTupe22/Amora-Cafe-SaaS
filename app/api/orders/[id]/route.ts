import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken, getAdminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import type { OrderStatus } from '@/lib/mockData';

// PATCH /api/orders/[id] - Update order status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify Firebase ID token
    const decoded = await verifyIdToken(req.headers.get('Authorization'));
    const uid = decoded.uid;

    // Get order ID from params
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // Parse and validate request body
    const body = await req.json();
    const { status } = body as { status: OrderStatus };

    // Validate status
    const validStatuses: OrderStatus[] = ['placed', 'preparing', 'ready', 'served', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: placed, preparing, ready, served, cancelled' },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const orderRef = db.collection('orders').doc(id);
    const orderDoc = await orderRef.get();

    // Check if order exists
    if (!orderDoc.exists) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const orderData = orderDoc.data();

    // Verify ownership
    if (orderData?._uid !== uid) {
      return NextResponse.json({ error: 'Unauthorized to update this order' }, { status: 403 });
    }

    // Check if order is deleted
    if (orderData?._syncStatus === 'deleted') {
      return NextResponse.json({ error: 'Order has been deleted' }, { status: 404 });
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      status,
      updatedAt: FieldValue.serverTimestamp(),
    };

    // If status is 'served', set completedAt
    if (status === 'served') {
      updateData.completedAt = FieldValue.serverTimestamp();
    }

    // Update order
    await orderRef.update(updateData);

    console.info(`[PATCH /api/orders/${id}] Updated order status to ${status} for user ${uid}`);

    // Fetch updated order
    const updatedDoc = await orderRef.get();
    const updatedData = updatedDoc.data();
    const updatedOrder = {
      id: updatedDoc.id,
      ...updatedData,
      createdAt: updatedData?.createdAt?.toDate?.()?.toISOString() || updatedData?.createdAt,
      updatedAt: updatedData?.updatedAt?.toDate?.()?.toISOString() || updatedData?.updatedAt,
      completedAt: updatedData?.completedAt?.toDate?.()?.toISOString() || updatedData?.completedAt,
    };

    return NextResponse.json({ ok: true, order: updatedOrder });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg.includes('Missing or malformed') || msg.includes('ID token')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[PATCH /api/orders/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
