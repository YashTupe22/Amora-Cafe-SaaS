'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Phone, FileText, MapPin, ArrowRight, Check, Zap } from 'lucide-react';
import { useAppStore } from '@/lib/appStore';

const STEPS = [
    { id: 1, label: 'Business', icon: Building2, title: 'What\'s your business name?', subtitle: 'This will appear on your invoices and reports.' },
    { id: 2, label: 'Contact', icon: Phone, title: 'How can clients reach you?', subtitle: 'Add your contact details for invoices.' },
    { id: 3, label: 'Tax & Address', icon: FileText, title: 'Tax & address info', subtitle: 'Used for GST invoicing — skip if not applicable.' },
];

export default function OnboardingPage() {
    const router = useRouter();
    const { ready, currentUser, profile, completeOnboarding } = useAppStore();
    const [step, setStep] = useState(0);
    const [saving, setSaving] = useState(false);

    const [businessName, setBusinessName] = useState('');
    const [phone, setPhone] = useState('');
    const [gst, setGst] = useState('');
    const [address, setAddress] = useState('');

    useEffect(() => {
        if (!ready) return;
        if (!currentUser) { router.replace('/'); return; }
        if (profile?.onboardingComplete) { router.replace('/dashboard'); }
    }, [ready, currentUser, profile, router]);

    const handleNext = () => {
        if (step < STEPS.length - 1) { setStep(s => s + 1); return; }
        handleFinish();
    };

    const handleFinish = async () => {
        setSaving(true);
        await completeOnboarding({ businessName: businessName || 'My Business', phone, gst, address });
        setSaving(false);
        router.push('/dashboard');
    };

    const canProceed = step === 0 ? businessName.trim().length > 0 : true;

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0f1e 0%, #0f172a 60%, #0d1b33 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', position: 'relative', overflow: 'hidden' }}>
            {/* Background effects */}
            <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.09) 0%, transparent 65%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '-20%', left: '-10%', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 65%)', pointerEvents: 'none' }} />

            <div style={{ width: '100%', maxWidth: 540, position: 'relative' }}>

                {/* Brand header */}
                <div style={{ textAlign: 'center', marginBottom: 36 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #f97316, #ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 18px rgba(249,115,22,0.45)' }}>
                            <Zap size={18} color="white" />
                        </div>
                        <span style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>Synplix</span>
                    </div>
                    <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9', marginBottom: 6 }}>Welcome aboard!</h1>
                    <p style={{ fontSize: 14, color: '#64748b' }}>Let&apos;s set up your workspace in 3 quick steps.</p>
                </div>

                {/* Step indicators */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 32 }}>
                    {STEPS.map((s, idx) => {
                        const done = idx < step;
                        const active = idx === step;
                        return (
                            <div key={s.id} style={{ display: 'flex', alignItems: 'center' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                                    <div style={{
                                        width: 40, height: 40, borderRadius: '50%',
                                        background: done ? 'linear-gradient(135deg,#22c55e,#16a34a)' : active ? 'linear-gradient(135deg,#f97316,#ea580c)' : 'rgba(255,255,255,0.06)',
                                        border: `2px solid ${done ? '#22c55e' : active ? '#f97316' : 'rgba(255,255,255,0.12)'}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        transition: 'all 0.3s ease',
                                        boxShadow: active ? '0 0 20px rgba(249,115,22,0.4)' : done ? '0 0 14px rgba(34,197,94,0.3)' : 'none',
                                    }}>
                                        {done ? <Check size={16} color="white" /> : <s.icon size={16} color={active ? 'white' : '#475569'} />}
                                    </div>
                                    <span style={{ fontSize: 11, color: active ? '#fb923c' : done ? '#22c55e' : '#475569', fontWeight: 600, whiteSpace: 'nowrap' }}>{s.label}</span>
                                </div>
                                {idx < STEPS.length - 1 && (
                                    <div style={{ width: 60, height: 2, background: idx < step ? 'linear-gradient(90deg,#22c55e,#f97316)' : 'rgba(255,255,255,0.08)', marginBottom: 20, transition: 'background 0.4s ease' }} />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Card */}
                <div className="glass-card animate-fade-in" style={{ padding: '36px 32px' }}>
                    <div style={{ marginBottom: 28 }}>
                        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', marginBottom: 6 }}>{STEPS[step].title}</h2>
                        <p style={{ fontSize: 13, color: '#64748b' }}>{STEPS[step].subtitle}</p>
                    </div>

                    {/* Step 0 – Business name */}
                    {step === 0 && (
                        <div>
                            <label style={{ fontSize: 12, color: '#64748b', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Business Name *</label>
                            <div style={{ position: 'relative' }}>
                                <Building2 size={15} color="#64748b" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                                    <input
                                        id="ob-business-name"
                                        className="dark-input"
                                        placeholder="e.g. Synplix"
                                        value={businessName}
                                        onChange={e => setBusinessName(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && canProceed && handleNext()}
                                        autoFocus
                                        style={{ padding: '13px 14px 13px 42px', fontSize: 15 }}
                                    />
                            </div>
                        </div>
                    )}

                    {/* Step 1 – Contact */}
                    {step === 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label style={{ fontSize: 12, color: '#64748b', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Phone Number</label>
                                <div style={{ position: 'relative' }}>
                                    <Phone size={15} color="#64748b" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                                    <input id="ob-phone" className="dark-input" type="tel" placeholder="+91 98765 43210" value={phone} onChange={e => setPhone(e.target.value)} style={{ padding: '13px 14px 13px 42px', fontSize: 14 }} />
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: '#64748b', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Address</label>
                                <div style={{ position: 'relative' }}>
                                    <MapPin size={15} color="#64748b" style={{ position: 'absolute', left: 14, top: 14 }} />
                                    <textarea id="ob-address" className="dark-input" placeholder="Your business address" value={address} onChange={e => setAddress(e.target.value)} rows={3} style={{ padding: '13px 14px 13px 42px', fontSize: 14, resize: 'none' }} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2 – Tax */}
                    {step === 2 && (
                        <div>
                            <label style={{ fontSize: 12, color: '#64748b', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>GST Number <span style={{ color: '#475569', fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
                            <div style={{ position: 'relative', marginBottom: 24 }}>
                                <FileText size={15} color="#64748b" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                                <input id="ob-gst" className="dark-input" placeholder="e.g. 27AABCA1234F1Z5" value={gst} onChange={e => setGst(e.target.value.toUpperCase())} style={{ padding: '13px 14px 13px 42px', fontSize: 14, fontFamily: 'monospace' }} />
                            </div>

                            {/* Summary preview */}
                            <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 12, padding: '16px 18px' }}>
                                <p style={{ fontSize: 11, color: '#3b82f6', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>Your workspace summary</p>
                                {[
                                    ['Business', businessName || '—'],
                                    ['Phone', phone || '—'],
                                    ['Address', address || '—'],
                                    ['GST', gst || '—'],
                                ].map(([label, value]) => (
                                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <span style={{ fontSize: 12, color: '#64748b' }}>{label}</span>
                                        <span style={{ fontSize: 12, color: '#f1f5f9', fontWeight: 500, maxWidth: 200, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
                        {step > 0 && (
                            <button onClick={() => setStep(s => s - 1)} style={{ padding: '12px 20px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                                Back
                            </button>
                        )}
                        <button
                            id="ob-next"
                            onClick={handleNext}
                            className="glow-btn"
                            disabled={!canProceed || saving}
                            style={{ flex: 1, padding: '13px 24px', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {saving ? 'Setting up…' : step === STEPS.length - 1 ? '🚀 Launch Dashboard' : (<>Continue <ArrowRight size={16} /></>)}
                            </span>
                        </button>
                    </div>

                    {/* Skip */}
                    {step > 0 && (
                        <p style={{ textAlign: 'center', marginTop: 14 }}>
                            <button onClick={handleFinish} style={{ fontSize: 12, color: '#475569', background: 'none', border: 'none', cursor: 'pointer' }}>
                                Skip for now — set up later in Settings
                            </button>
                        </p>
                    )}
                </div>

                <p style={{ textAlign: 'center', fontSize: 11, color: '#334155', marginTop: 20 }}>
                    Your data is private and secured with Supabase RLS.
                </p>
            </div>
        </div>
    );
}
