'use client';

import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAppStore } from '@/lib/appStore';
import { Mail, MessageCircle, Phone } from 'lucide-react';

export default function SupportPage() {
  const { currentUser } = useAppStore();
  const [name, setName] = useState(currentUser?.name ?? '');
  const [email, setEmail] = useState(currentUser?.email ?? '');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    if (!name.trim() || !email.trim() || !message.trim()) {
      setStatus('Please fill in all fields.');
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'support_requests'), {
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
        userId: currentUser?.id ?? null,
        createdAt: new Date().toISOString(),
      });
      setStatus('Thanks! We will get back to you soon.');
      setMessage('');
    } catch (err) {
      setStatus('Could not send message. Please try again.');
      console.error('support_requests', err);
    }
    setSubmitting(false);
  };

  return (
    <AppLayout title="Support" subtitle="Get help from the Synplix team">
      <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div className="glass-card" style={{ padding: 22 }}>
          <p style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 6 }}>
            Have a question about invoices, GST, or your data?
          </p>
          <p style={{ fontSize: 13, color: '#64748b' }}>
            Send us a quick note and we'll respond over email. Your request is stored securely in Firebase.
          </p>
        </div>

        <form className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }} onSubmit={handleSubmit}>
          <div>
            <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>Name</label>
            <div style={{ position: 'relative' }}>
              <MessageCircle size={15} color="#64748b" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
              <input className="dark-input" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" style={{ padding: '11px 14px 11px 40px', fontSize: 14 }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} color="#64748b" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
              <input className="dark-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" style={{ padding: '11px 14px 11px 40px', fontSize: 14 }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>Message</label>
            <textarea className="dark-input" value={message} onChange={e => setMessage(e.target.value)} placeholder="Tell us what's going on" rows={4} style={{ padding: '11px 14px', fontSize: 14, resize: 'vertical' }} />
          </div>

          {status && (
            <p style={{ fontSize: 12, color: status.startsWith('Thanks') ? '#22c55e' : '#ef4444' }}>
              {status}
            </p>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#64748b' }}>
              <Phone size={13} />
              <span>Support: +91-00000-00000</span>
            </div>
            <button type="submit" className="glow-btn" style={{ padding: '10px 22px', fontSize: 13 }} disabled={submitting}>
              <span>{submitting ? 'Sending…' : 'Send message'}</span>
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}

