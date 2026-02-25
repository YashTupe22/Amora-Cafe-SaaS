import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface BillItem {
  description: string;
  qty: number;
  price: number;
}

interface SendBillEmailPayload {
  to: string;
  customerName: string;
  invoiceNo: string;
  date: string;
  items: BillItem[];
  paymentMode: string;
  orderType: string;
  tableNo?: string;
  billId: string;
}

function getTotal(items: BillItem[]) {
  return items.reduce((s, i) => s + i.qty * i.price, 0);
}

function buildEmailHtml(payload: SendBillEmailPayload): string {
  const total = getTotal(payload.items);
  const itemRows = payload.items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #1e293b;color:#e2e8f0;font-size:14px;">${item.description}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #1e293b;color:#94a3b8;font-size:14px;text-align:center;">${item.qty}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #1e293b;color:#94a3b8;font-size:14px;text-align:right;">₹${item.price.toLocaleString('en-IN')}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #1e293b;color:#f1f5f9;font-size:14px;font-weight:600;text-align:right;">₹${(item.qty * item.price).toLocaleString('en-IN')}</td>
      </tr>`
    )
    .join('');

  const receiptUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'}/bills/${payload.billId}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Your Bill from Synplix</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#f97316,#ef4444);padding:28px 32px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">Synplix</h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Business Suite</p>
    </div>

    <!-- Body -->
    <div style="padding:28px 32px;">
      <p style="color:#94a3b8;font-size:14px;margin:0 0 4px;">Hello,</p>
      <h2 style="color:#f1f5f9;font-size:18px;font-weight:700;margin:0 0 20px;">
        Here's your bill — <span style="color:#f97316;">${payload.invoiceNo}</span>
      </h2>

      <!-- Meta -->
      <div style="display:flex;gap:24px;margin-bottom:24px;flex-wrap:wrap;">
        <div>
          <p style="margin:0;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Customer</p>
          <p style="margin:4px 0 0;font-size:14px;color:#e2e8f0;font-weight:600;">${payload.customerName}</p>
        </div>
        <div>
          <p style="margin:0;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Date</p>
          <p style="margin:4px 0 0;font-size:14px;color:#e2e8f0;">${new Date(payload.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
        </div>
        <div>
          <p style="margin:0;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Payment</p>
          <p style="margin:4px 0 0;font-size:14px;color:#e2e8f0;">${payload.paymentMode}</p>
        </div>
        <div>
          <p style="margin:0;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Order</p>
          <p style="margin:4px 0 0;font-size:14px;color:#e2e8f0;">${payload.orderType}${payload.tableNo ? ` · ${payload.tableNo}` : ''}</p>
        </div>
      </div>

      <!-- Items table -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <thead>
          <tr style="background:rgba(255,255,255,0.04);">
            <th style="padding:10px 14px;text-align:left;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Item</th>
            <th style="padding:10px 14px;text-align:center;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Qty</th>
            <th style="padding:10px 14px;text-align:right;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Price</th>
            <th style="padding:10px 14px;text-align:right;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Total</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <!-- Total -->
      <div style="background:rgba(249,115,22,0.08);border:1px solid rgba(249,115,22,0.2);border-radius:10px;padding:16px 18px;display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
        <span style="color:#94a3b8;font-size:14px;font-weight:600;">Total Amount</span>
        <span style="color:#f97316;font-size:22px;font-weight:800;">₹${total.toLocaleString('en-IN')}</span>
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin-bottom:8px;">
        <a href="${receiptUrl}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#f97316,#ef4444);color:#fff;font-weight:700;font-size:14px;text-decoration:none;border-radius:10px;">
          View Full Receipt →
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding:18px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
      <p style="margin:0;color:#475569;font-size:12px;">Powered by <strong style="color:#f97316;">Synplix Business Suite</strong></p>
    </div>
  </div>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  try {
    const payload: SendBillEmailPayload = await req.json();

    if (!payload.to || !payload.items?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'Synplix <bills@yourdomain.com>',
      to: [payload.to],
      subject: `Your Bill ${payload.invoiceNo} from Synplix — ₹${getTotal(payload.items).toLocaleString('en-IN')}`,
      html: buildEmailHtml(payload),
    });

    if (error) {
      console.error('[send-bill-email] Resend error:', error);
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (err) {
    console.error('[send-bill-email] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
