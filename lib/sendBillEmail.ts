/**
 * sendBillEmail
 * ─────────────
 * Writes a document to Firestore's `mail` collection which is automatically
 * picked up by the Firebase "Trigger Email" extension
 * (firebase-extension: firestore-send-email).
 *
 * HOW TO ENABLE:
 *  1. Go to https://console.firebase.google.com → your project → Extensions
 *  2. Install "Trigger Email from Firestore" (firestore-send-email)
 *  3. During setup, provide your SMTP credentials (Gmail, SendGrid, etc.)
 *  4. Set the "Email documents collection" to:  mail
 *  5. That's it — this function will start sending real emails immediately.
 */

import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { InvoiceItem } from '@/lib/mockData';

export interface BillEmailPayload {
  customerName: string;
  customerEmail: string;
  invoiceNo: string;
  date: string;
  items: InvoiceItem[];
  orderType?: string;
  paymentMode?: string;
  tableNo?: string;
  businessName?: string;
}

function getTotal(items: InvoiceItem[]) {
  return items.reduce((sum, i) => sum + i.qty * i.price, 0);
}

function buildHtml(p: BillEmailPayload): string {
  const biz = p.businessName || 'Synplix';
  const total = getTotal(p.items);

  const itemsHtml = p.items
    .map(
      (i) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;color:#1e293b;">${i.description}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center;color:#64748b;">${i.qty}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;color:#64748b;">&#8377;${i.price.toLocaleString('en-IN')}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600;color:#1e293b;">&#8377;${(i.qty * i.price).toLocaleString('en-IN')}</td>
      </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#f97316,#ef4444);padding:28px 32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.3px;">${biz}</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Your Bill Confirmation</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">

              <p style="margin:0 0 20px;font-size:15px;color:#334155;">
                Hi <strong>${p.customerName}</strong>, thank you for your order!
                Here's a summary of your bill.
              </p>

              <!-- Meta -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="font-size:12px;color:#64748b;font-weight:600;padding-bottom:4px;">BILL NUMBER</td>
                  <td style="font-size:12px;color:#64748b;font-weight:600;padding-bottom:4px;text-align:right;">DATE</td>
                </tr>
                <tr>
                  <td style="font-size:15px;color:#f97316;font-weight:700;">${p.invoiceNo}</td>
                  <td style="font-size:15px;color:#334155;font-weight:600;text-align:right;">${new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                </tr>
              </table>

              ${p.orderType || p.paymentMode || p.tableNo ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:10px;padding:14px 16px;margin-bottom:24px;">
                <tr>
                  ${p.orderType  ? `<td style="font-size:13px;color:#64748b;">Order: <strong style="color:#334155;">${p.orderType}</strong></td>` : ''}
                  ${p.paymentMode ? `<td style="font-size:13px;color:#64748b;text-align:center;">Payment: <strong style="color:#334155;">${p.paymentMode}</strong></td>` : ''}
                  ${p.tableNo    ? `<td style="font-size:13px;color:#64748b;text-align:right;">Table: <strong style="color:#334155;">${p.tableNo}</strong></td>` : ''}
                </tr>
              </table>` : ''}

              <!-- Items table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;">
                <thead>
                  <tr style="background:#f1f5f9;">
                    <th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748b;font-weight:600;">ITEM</th>
                    <th style="padding:10px 12px;text-align:center;font-size:12px;color:#64748b;font-weight:600;">QTY</th>
                    <th style="padding:10px 12px;text-align:right;font-size:12px;color:#64748b;font-weight:600;">PRICE</th>
                    <th style="padding:10px 12px;text-align:right;font-size:12px;color:#64748b;font-weight:600;">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>

              <!-- Grand total -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
                <tr>
                  <td style="font-size:15px;color:#64748b;">Total Amount</td>
                  <td style="text-align:right;font-size:26px;font-weight:800;color:#f97316;">&#8377;${total.toLocaleString('en-IN')}</td>
                </tr>
              </table>

              <p style="margin:28px 0 0;font-size:13px;color:#94a3b8;text-align:center;">
                Thank you for dining with us! We look forward to seeing you again.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:18px 32px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">&copy; ${new Date().getFullYear()} ${biz}. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Sends a bill confirmation email by writing to Firestore `mail` collection.
 * Silently no-ops if `customerEmail` is empty or Firestore is unavailable.
 */
export async function sendBillEmail(payload: BillEmailPayload): Promise<void> {
  if (!payload.customerEmail || !payload.customerEmail.includes('@')) return;
  if (!db) {
    console.warn('[sendBillEmail] Firestore not initialised — email skipped.');
    return;
  }

  try {
    await addDoc(collection(db, 'mail'), {
      to: [payload.customerEmail],
      message: {
        subject: `Your bill ${payload.invoiceNo} from ${payload.businessName || 'Synplix'}`,
        html: buildHtml(payload),
      },
      createdAt: Timestamp.now(),
    });
    console.log(`[sendBillEmail] Mail queued for ${payload.customerEmail}`);
  } catch (err) {
    // Non-fatal — bill is already saved, just log the failure
    console.error('[sendBillEmail] Failed to queue email:', err);
  }
}
