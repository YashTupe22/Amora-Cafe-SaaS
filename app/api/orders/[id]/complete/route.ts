import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken, getAdminDb } from '@/lib/firebaseAdmin';
import { generateBillNumber, generateUpiUrl } from '@/lib/waiterUtils';
import { FieldValue } from 'firebase-admin/firestore';
import type { Bill, OrderItem } from '@/lib/mockData';

// POST /api/orders/[id]/complete - Mark order complete & generate bill
export async function POST(
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
      return NextResponse.json({ error: 'Unauthorized to complete this order' }, { status: 403 });
    }

    // Check if order is deleted
    if (orderData?._syncStatus === 'deleted') {
      return NextResponse.json({ error: 'Order has been deleted' }, { status: 404 });
    }

    // Check if order is already completed
    if (orderData?.status === 'served') {
      return NextResponse.json(
        { error: 'Order is already marked as served' },
        { status: 400 }
      );
    }

    // Update order status to 'served'
    await orderRef.update({
      status: 'served',
      completedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.info(`[POST /api/orders/${id}/complete] Marked order as served for user ${uid}`);

    // Get the current bill count to generate bill number
    const billsSnapshot = await db
      .collection('bills')
      .where('_uid', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    let billCount = 0;
    if (!billsSnapshot.empty) {
      const lastBill = billsSnapshot.docs[0].data();
      if (lastBill.billNo) {
        const match = lastBill.billNo.match(/BILL-(\d+)/);
        if (match) {
          billCount = parseInt(match[1], 10);
        }
      }
    }

    const billNo = generateBillNumber(billCount);

    // Calculate bill totals
    const items = orderData?.items as OrderItem[] || [];
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.05; // 5% GST
    const total = subtotal + tax;

    // Fetch user profile to get UPI details
    const profileRef = db.collection('profiles').doc(uid);
    const profileDoc = await profileRef.get();
    const profileData = profileDoc.data();

    let upiQrCode: string | undefined;
    if (profileData?.upiId) {
      const businessName = profileData?.businessName || profileData?.restaurantName || 'Restaurant';
      upiQrCode = generateUpiUrl(
        profileData.upiId,
        businessName,
        total,
        orderData?.orderNo || billNo
      );
    }

    // Create bill document
    const billRef = db.collection('bills').doc();
    const billData: Omit<Bill, 'createdAt' | 'paidAt'> & {
      createdAt: FirebaseFirestore.FieldValue;
      paidAt?: FirebaseFirestore.FieldValue;
      _uid: string;
      _syncStatus: string;
    } = {
      id: billRef.id,
      billNo,
      orderId: id,
      tableNumber: orderData?.tableNumber || '',
      items,
      subtotal,
      tax,
      total,
      upiQrCode,
      createdAt: FieldValue.serverTimestamp(),
      _uid: uid,
      _syncStatus: 'synced',
    };

    await billRef.set(billData);

    console.info(`[POST /api/orders/${id}/complete] Created bill ${billNo} for order ${id}`);

    // Return bill with ISO timestamps
    const createdBill = {
      ...billData,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ ok: true, bill: createdBill }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg.includes('Missing or malformed') || msg.includes('ID token')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[POST /api/orders/[id]/complete]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
