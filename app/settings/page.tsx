'use client';

import AppLayout from '@/components/layout/AppLayout';
import { Building2, Bell, Globe, Shield, User, Download, Moon, Layers, UtensilsCrossed, Briefcase, Check } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/appStore';
import { useSubscription } from '@/hooks/useSubscription';
import { exportAppDataToExcel } from '@/lib/exportExcel';
import { useTranslation, type Lang } from '@/lib/i18n';
import { analytics } from '@/lib/analytics';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { localDb } from '@/lib/localDb';

type ProfileFieldKey = 'businessName' | 'email' | 'phone' | 'gst' | 'address';
type AccountFieldKey = 'adminName' | 'loginEmail' | 'password';
type InterfaceType = 'restaurant' | 'business';

type Field =
    | { key: ProfileFieldKey; label: string; value: string; type: 'text' | 'email' | 'tel' }
    | { key: AccountFieldKey; label: string; value: string; type: 'text' | 'email' | 'password'; readOnly: true };

export default function SettingsPage() {
    const router = useRouter();
    const { data, currentUser, profile, updateBusinessProfile, updatePreferences, resetBusinessData, deleteCurrentAccount, logout, setActiveInterface } = useAppStore();
    const isDark = profile?.darkMode !== false;
    const { canAccess } = useSubscription();
    const canExport = canAccess('pdfExport');

    const [profileDraft, setProfileDraft] = useState(data.businessProfile);
    const [prefsDraft, setPrefsDraft] = useState(data.preferences);
    const [savedMsg, setSavedMsg] = useState('');
    const [interfaceTypesDraft, setInterfaceTypesDraft] = useState<InterfaceType[]>(profile?.interfaceTypes ?? ['restaurant']);
    const { lang, setLang, t } = useTranslation();

    // Sync interface types from profile
    const interfaceSynced = useRef(false);
    useEffect(() => {
        if (!interfaceSynced.current && profile?.interfaceTypes) {
            setInterfaceTypesDraft(profile.interfaceTypes);
            interfaceSynced.current = true;
        }
    }, [profile?.interfaceTypes]);

    // Sync draft once when real profile data arrives from Firestore.
    // Using a ref so user edits mid-session are never overwritten.
    const profileSynced = useRef(false);
    useEffect(() => {
        if (!profileSynced.current && data.businessProfile.businessName) {
            setProfileDraft(data.businessProfile);
            profileSynced.current = true;
        }
    }, [data.businessProfile]);

    const prefsSynced = useRef(false);
    useEffect(() => {
        if (!prefsSynced.current) {
            setPrefsDraft(data.preferences);
            prefsSynced.current = true;
        }
    }, [data.preferences]);

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
        { key: 'darkMode', label: 'Dark Mode', sub: 'Switch between light and dark theme', icon: <Moon size={15} />, enabled: isDark, canToggle: true },
        { key: 'emailNotifications', label: t('settings.emailNotif'), sub: t('settings.emailNotifSub'), icon: <Bell size={15} />, enabled: prefsDraft.emailNotifications, canToggle: true },
        { key: 'twoFactorAuth', label: t('settings.twoFactor'), sub: t('settings.twoFactorSub'), icon: <Shield size={15} />, enabled: prefsDraft.twoFactorAuth, canToggle: true },
    ]), [prefsDraft, isDark]);

    const toggleInterfaceType = (type: InterfaceType) => {
        setInterfaceTypesDraft(prev => {
            if (prev.includes(type)) {
                // Don't allow removing if it's the only one
                if (prev.length === 1) return prev;
                return prev.filter(t => t !== type);
            }
            return [...prev, type];
        });
    };

    const saveInterfaceTypes = async () => {
        if (!profile?.id) return;
        const uid = profile.id;
        
        // Determine new active interface
        const newActive = interfaceTypesDraft.includes(profile.activeInterface) 
            ? profile.activeInterface 
            : interfaceTypesDraft[0];
        
        // Update local DB
        await localDb.profile.update(uid, { 
            interfaceTypes: interfaceTypesDraft, 
            activeInterface: newActive,
            _syncStatus: 'pending' 
        }).catch(console.error);
        
        // Sync to Firestore
        if (db && typeof navigator !== 'undefined' && navigator.onLine) {
            await updateDoc(doc(db, 'users', uid), { 
                interfaceTypes: interfaceTypesDraft,
                activeInterface: newActive,
            }).catch(console.error);
        }
        
        // Update active interface if needed
        if (newActive !== profile.activeInterface) {
            setActiveInterface(newActive);
        }
        
        setSavedMsg('Interface types saved!');
        window.setTimeout(() => setSavedMsg(''), 1400);
        // Reload to apply changes
        window.location.reload();
    };

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
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--glass-border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--icon-btn-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
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
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--glass-border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--icon-btn-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                <Globe size={15} />
                            </div>
                            <div>
                                <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{t('settings.language')}</p>
                                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 1 }}>{t('settings.langSub')}</p>
                            </div>
                        </div>
                        <select
                            value={lang}
                            onChange={e => {
                                setLang(e.target.value as Lang);
                                analytics.languageSwitched(e.target.value);
                            }}
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
                                    borderBottom: i < toggleSettings.length - 1 ? '1px solid var(--glass-border)' : 'none',
                                    borderTop: i === 0 ? '1px solid var(--glass-border)' : 'none',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--icon-btn-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
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
                                        background: s.enabled ? 'linear-gradient(135deg, #f97316, #ea580c)' : 'rgba(100,116,139,0.3)',
                                        position: 'relative',
                                        cursor: s.canToggle ? 'pointer' : 'not-allowed',
                                        transition: 'background 0.2s',
                                        boxShadow: s.enabled ? '0 0 10px rgba(249,115,22,0.4)' : 'none',
                                    }}
                                    onClick={() => {
                                        if (!s.canToggle) return;
                                        if (s.key === 'darkMode') {
                                            const nextDark = !isDark;
                                            updatePreferences({ emailNotifications: prefsDraft.emailNotifications, darkMode: nextDark, currency: prefsDraft.currency, twoFactorAuth: prefsDraft.twoFactorAuth });
                                        }
                                        if (s.key === 'emailNotifications') setPrefsDraft(p => ({ ...p, emailNotifications: !p.emailNotifications }));
                                        if (s.key === 'twoFactorAuth') {
                                            const next = !prefsDraft.twoFactorAuth;
                                            setPrefsDraft(p => ({ ...p, twoFactorAuth: next }));
                                            analytics.settings2faToggled(next);
                                        }
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

                {/* Interface Types */}
                <div className="glass-card" style={{ padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Layers size={16} color="#8b5cf6" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Business Type</h2>
                            <p style={{ fontSize: 12, color: '#64748b' }}>Select the interfaces you need access to</p>
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {/* Restaurant Option */}
                        <button
                            type="button"
                            onClick={() => toggleInterfaceType('restaurant')}
                            style={{
                                padding: '16px',
                                borderRadius: 12,
                                background: interfaceTypesDraft.includes('restaurant') ? 'rgba(249,115,22,0.08)' : 'rgba(255,255,255,0.03)',
                                border: `2px solid ${interfaceTypesDraft.includes('restaurant') ? '#f97316' : 'rgba(255,255,255,0.08)'}`,
                                cursor: 'pointer',
                                textAlign: 'left',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 14,
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <div style={{
                                width: 40,
                                height: 40,
                                borderRadius: 10,
                                background: interfaceTypesDraft.includes('restaurant') ? '#f97316' : 'rgba(255,255,255,0.06)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <UtensilsCrossed size={20} color={interfaceTypesDraft.includes('restaurant') ? 'white' : '#64748b'} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <p style={{ fontSize: 14, fontWeight: 600, color: interfaceTypesDraft.includes('restaurant') ? '#f97316' : 'var(--text-primary)' }}>
                                    Restaurant / Cafe
                                </p>
                                <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                                    Tables, Menu, Orders, Kitchen Display, Quick Billing
                                </p>
                            </div>
                            <div style={{
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                background: interfaceTypesDraft.includes('restaurant') ? '#f97316' : 'rgba(255,255,255,0.1)',
                                border: `2px solid ${interfaceTypesDraft.includes('restaurant') ? '#f97316' : 'rgba(255,255,255,0.2)'}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                {interfaceTypesDraft.includes('restaurant') && <Check size={14} color="white" strokeWidth={3} />}
                            </div>
                        </button>

                        {/* Business Option */}
                        <button
                            type="button"
                            onClick={() => toggleInterfaceType('business')}
                            style={{
                                padding: '16px',
                                borderRadius: 12,
                                background: interfaceTypesDraft.includes('business') ? 'rgba(139,92,246,0.08)' : 'rgba(255,255,255,0.03)',
                                border: `2px solid ${interfaceTypesDraft.includes('business') ? '#8b5cf6' : 'rgba(255,255,255,0.08)'}`,
                                cursor: 'pointer',
                                textAlign: 'left',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 14,
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <div style={{
                                width: 40,
                                height: 40,
                                borderRadius: 10,
                                background: interfaceTypesDraft.includes('business') ? '#8b5cf6' : 'rgba(255,255,255,0.06)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <Briefcase size={20} color={interfaceTypesDraft.includes('business') ? 'white' : '#64748b'} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <p style={{ fontSize: 14, fontWeight: 600, color: interfaceTypesDraft.includes('business') ? '#8b5cf6' : 'var(--text-primary)' }}>
                                    General Business
                                </p>
                                <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                                    Client Invoicing, Expense Tracking, Transactions, GST Reports
                                </p>
                            </div>
                            <div style={{
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                background: interfaceTypesDraft.includes('business') ? '#8b5cf6' : 'rgba(255,255,255,0.1)',
                                border: `2px solid ${interfaceTypesDraft.includes('business') ? '#8b5cf6' : 'rgba(255,255,255,0.2)'}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                {interfaceTypesDraft.includes('business') && <Check size={14} color="white" strokeWidth={3} />}
                            </div>
                        </button>
                    </div>

                    <p style={{ fontSize: 12, color: '#64748b', marginTop: 12, textAlign: 'center' }}>
                        💡 Select both to access all features. You can switch between them using the sidebar toggle.
                    </p>

                    {/* Save Button - only show if changed */}
                    {JSON.stringify(interfaceTypesDraft.sort()) !== JSON.stringify((profile?.interfaceTypes ?? ['restaurant']).sort()) && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                            <button className="glow-btn" style={{ padding: '9px 22px', fontSize: 13 }} onClick={saveInterfaceTypes}>
                                <span>Save Changes</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Data & Export */}
                <div className="glass-card" style={{ padding: 24 }}>
                    <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>Data &amp; Export</h2>
                    <p style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>
                        Download a full snapshot of your current workspace — employees, invoices, transactions, inventory and basic settings — in an Excel file.
                    </p>
                    <button
                        onClick={() => { if (canExport) exportAppDataToExcel(data); }}
                        className="glow-btn"
                        disabled={!canExport}
                        title={canExport ? undefined : 'Excel export requires Starter plan or above'}
                        style={{ padding: '9px 22px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 8, opacity: canExport ? 1 : 0.4, cursor: canExport ? 'pointer' : 'not-allowed' }}
                    >
                        <Download size={14} />
                        <span>Export All Data (.xlsx)</span>
                    </button>
                    {!canExport && (
                        <p style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
                            Excel export is available on the <a href="/pricing" style={{ color: '#fb923c', fontWeight: 700, textDecoration: 'none' }}>Starter plan</a> and above.
                        </p>
                    )}
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
