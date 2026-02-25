'use client';

import AppLayout from '@/components/layout/AppLayout';
import { Building2, Bell, Globe, Shield, User, Download } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/appStore';
import { exportAppDataToExcel } from '@/lib/exportExcel';
import { useTranslation, type Lang } from '@/lib/i18n';

type ProfileFieldKey = 'businessName' | 'email' | 'phone' | 'gst' | 'address';
type AccountFieldKey = 'adminName' | 'loginEmail' | 'password';

type Field =
    | { key: ProfileFieldKey; label: string; value: string; type: 'text' | 'email' | 'tel' }
    | { key: AccountFieldKey; label: string; value: string; type: 'text' | 'email' | 'password'; readOnly: true };

export default function SettingsPage() {
    const router = useRouter();
    const { data, currentUser, updateBusinessProfile, updatePreferences, resetBusinessData, deleteCurrentAccount, logout } = useAppStore();

    const [profileDraft, setProfileDraft] = useState(data.businessProfile);
    const [prefsDraft, setPrefsDraft] = useState(data.preferences);
    const [savedMsg, setSavedMsg] = useState('');
    const { lang, setLang, t } = useTranslation();

    const sections = useMemo<{ title: string; icon: React.ReactNode; fields: Field[] }[]>(() => {
        return [
            {
                title: 'Business Profile',
                icon: <Building2 size={16} color="#f97316" />,
                fields: [
                    { key: 'businessName', label: 'Business Name', value: profileDraft.businessName, type: 'text' as const },
                    { key: 'email', label: 'Email Address', value: profileDraft.email, type: 'email' as const },
                    { key: 'phone', label: 'Phone Number', value: profileDraft.phone, type: 'tel' as const },
                    { key: 'gst', label: 'GST Number', value: profileDraft.gst, type: 'text' as const },
                    { key: 'address', label: 'Address', value: profileDraft.address, type: 'text' as const },
                ],
            },
            {
                title: 'Account',
                icon: <User size={16} color="#ea580c" />,
                fields: [
                    { key: 'adminName', label: 'Admin Name', value: currentUser?.name ?? '—', type: 'text' as const, readOnly: true },
                    { key: 'loginEmail', label: 'Login Email', value: currentUser?.email ?? '—', type: 'email' as const, readOnly: true },
                    { key: 'password', label: 'Password', value: '••••••••', type: 'password' as const, readOnly: true },
                ],
            },
        ];
    }, [profileDraft, currentUser]);

    const toggleSettings = useMemo(() => ([
        { key: 'emailNotifications', label: t('settings.emailNotif'), sub: t('settings.emailNotifSub'), icon: <Bell size={15} />, enabled: prefsDraft.emailNotifications, canToggle: true },
        { key: 'twoFactorAuth', label: t('settings.twoFactor'), sub: t('settings.twoFactorSub'), icon: <Shield size={15} />, enabled: prefsDraft.twoFactorAuth, canToggle: true },
    ]), [prefsDraft]);

    const saveAll = () => {
        updateBusinessProfile(profileDraft);
        updatePreferences(prefsDraft);
        setSavedMsg(t('settings.saved'));
        window.setTimeout(() => setSavedMsg(''), 1400);
    };

    const clearAll = () => {
        const ok = confirm('Clear all business data (employees, invoices, transactions, settings) and restore demo defaults?');
        if (!ok) return;
        resetBusinessData();
        setProfileDraft(data.businessProfile);
        setPrefsDraft(data.preferences);
        setSavedMsg(t('settings.reset'));
        window.setTimeout(() => setSavedMsg(''), 1400);
    };

    const deleteAccount = () => {
        const ok = confirm('Delete this account from local storage? This will sign you out.');
        if (!ok) return;
        deleteCurrentAccount();
        logout();
        router.replace('/');
    };

    return (
        <AppLayout title="Settings" subtitle="Manage your business profile and preferences">
            <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 20 }}>
                {sections.map(sec => (
                    <div key={sec.title} className="glass-card" style={{ padding: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(249,115,22,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {sec.icon}
                            </div>
                            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{sec.title}</h2>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {sec.fields.map(field => (
                                <div key={field.label} className="setting-row">
                                    <label style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{field.label}</label>
                                    <input
                                        className="dark-input"
                                        type={field.type}
                                        value={field.value}
                                        readOnly={'readOnly' in field ? field.readOnly : false}
                                        onChange={e => {
                                            if (sec.title !== 'Business Profile') return;
                                            const key: ProfileFieldKey = field.key as ProfileFieldKey;
                                            setProfileDraft(prev => ({ ...prev, [key]: e.target.value }));
                                        }}
                                        style={{ padding: '9px 12px', fontSize: 14 }}
                                    />
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                {savedMsg && <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 700 }}>{savedMsg}</span>}
                                <button className="glow-btn" style={{ padding: '9px 22px', fontSize: 13 }} onClick={saveAll}>
                                <span>Save Changes</span>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Toggle settings */}
                <div className="glass-card" style={{ padding: 24 }}>
                    <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 18 }}>{t('settings.preferences')}</h2>
                    {/* Currency Selector */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                <Globe size={15} />
                            </div>
                            <div>
                                <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{t('settings.currency')}</p>
                                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 1 }}>{t('settings.currencySub')}</p>
                            </div>
                        </div>
                        <select
                            value={prefsDraft.currency}
                            onChange={e => setPrefsDraft(p => ({ ...p, currency: e.target.value }))}
                            className="dark-input"
                            style={{ padding: '6px 10px', fontSize: 13, width: 100 }}
                        >
                            <option value="INR">INR (₹)</option>
                            <option value="USD">USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                            <option value="GBP">GBP (£)</option>
                        </select>
                    </div>
                    {/* Language Switcher */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                <Globe size={15} />
                            </div>
                            <div>
                                <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{t('settings.language')}</p>
                                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 1 }}>{t('settings.langSub')}</p>
                            </div>
                        </div>
                        <select
                            value={lang}
                            onChange={e => setLang(e.target.value as Lang)}
                            className="dark-input"
                            style={{ padding: '6px 10px', fontSize: 13, width: 130 }}
                        >
                            <option value="en">English</option>
                            <option value="hi">हिंदी (Hindi)</option>
                            <option value="mr">मराठी (Marathi)</option>
                            <option value="gu">ગુજરાતી (Gujarati)</option>
                            <option value="ta">தமிழ் (Tamil)</option>
                        </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                        {toggleSettings.map((s, i) => (
                            <div
                                key={s.label}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '14px 0',
                                    borderBottom: i < toggleSettings.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                                    borderTop: i === 0 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                        {s.icon}
                                    </div>
                                    <div>
                                        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{s.label}</p>
                                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 1 }}>{s.sub}</p>
                                    </div>
                                </div>
                                {/* Toggle */}
                                <div
                                    style={{
                                        width: 44,
                                        height: 24,
                                        borderRadius: 12,
                                        background: s.enabled ? 'linear-gradient(135deg, #f97316, #ea580c)' : 'rgba(255,255,255,0.1)',
                                        position: 'relative',
                                        cursor: s.canToggle ? 'pointer' : 'not-allowed',
                                        transition: 'background 0.2s',
                                        boxShadow: s.enabled ? '0 0 10px rgba(249,115,22,0.4)' : 'none',
                                    }}
                                    onClick={() => {
                                        if (!s.canToggle) return;
                                        if (s.key === 'emailNotifications') setPrefsDraft(p => ({ ...p, emailNotifications: !p.emailNotifications }));
                                        if (s.key === 'twoFactorAuth') setPrefsDraft(p => ({ ...p, twoFactorAuth: !p.twoFactorAuth }));
                                    }}
                                >
                                    <div
                                        style={{
                                            position: 'absolute',
                                            top: 3,
                                            left: s.enabled ? 23 : 3,
                                            width: 18,
                                            height: 18,
                                            borderRadius: '50%',
                                            background: 'white',
                                            transition: 'left 0.2s',
                                            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Data & Export */}
                <div className="glass-card" style={{ padding: 24 }}>
                    <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>Data &amp; Export</h2>
                    <p style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>
                        Download a full snapshot of your current workspace — employees, invoices, transactions, inventory and basic settings — in an Excel file.
                    </p>
                    <button
                        onClick={() => exportAppDataToExcel(data)}
                        className="glow-btn"
                        style={{ padding: '9px 22px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 8 }}
                    >
                        <Download size={14} />
                        <span>Export All Data (.xlsx)</span>
                    </button>
                </div>

                {/* Danger Zone */}
                <div className="glass-card" style={{ padding: 24, borderColor: 'rgba(239,68,68,0.2)' }}>
                    <h2 style={{ fontSize: 14, fontWeight: 700, color: '#ef4444', marginBottom: 6 }}>Danger Zone</h2>
                    <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>These actions are irreversible. Proceed with caution.</p>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={clearAll} style={{ padding: '9px 18px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                            Clear All Data
                        </button>
                        <button onClick={deleteAccount} style={{ padding: '9px 18px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                            Delete Account
                        </button>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
