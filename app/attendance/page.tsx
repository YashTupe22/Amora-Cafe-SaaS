'use client';

import { useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import Badge from '@/components/ui/Badge';
import type { Employee } from '@/lib/mockData';
import { X, Check, UserPlus, ChevronLeft, ChevronRight, Clock, Lock } from 'lucide-react';
import { useAppStore } from '@/lib/appStore';
import { useSubscription } from '@/hooks/useSubscription';
import { localDate } from '@/lib/utils';

const TODAY = localDate();

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

function getMonthDays(year: number, month: number): string[] {
    const days: string[] = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
        const m = String(month + 1).padStart(2, '0');
        const day = String(d).padStart(2, '0');
        days.push(`${year}-${m}-${day}`);
    }
    return days;
}

function getWorkDays(year: number, month: number) {
    return getMonthDays(year, month).filter(d => {
        const day = new Date(d).getDay();
        return day !== 0 && day !== 6;
    });
}

// ── Employee Profile Modal ──────────────────────────────────────────────────

function EmployeeProfileModal({ emp, onClose, onEdit }: { emp: Employee; onClose: () => void; onEdit: () => void }) {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="glass-card animate-fade-in modal-inner"
                style={{ width: '100%', maxWidth: 480, padding: 32, position: 'relative' }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 8 }}>
                    <button onClick={e => { e.stopPropagation(); onEdit(); }} style={{ padding: '5px 12px', borderRadius: 8, background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)', color: '#fb923c', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Edit</button>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                    <div
                        style={{
                            width: 56, height: 56, borderRadius: 14,
                            background: 'linear-gradient(135deg, #f97316, #ea580c)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 18, fontWeight: 800, color: 'white',
                            boxShadow: '0 0 20px rgba(249,115,22,0.4)',
                        }}
                    >
                        {emp.avatar}
                    </div>
                    <div>
                        <h2 style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9' }}>{emp.name}</h2>
                        <p style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{emp.role}</p>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    {[
                        { label: 'Email', value: emp.email || '—' },
                        { label: 'Phone', value: emp.phone || '—' },
                        { label: 'Aadhaar', value: emp.aadhaar ? `XXXX-XXXX-${emp.aadhaar.slice(-4)}` : '—' },
                        { label: 'Date of Joining', value: emp.dateOfJoining ? new Date(emp.dateOfJoining).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
                        { label: 'Salary', value: emp.salary ? `₹${emp.salary.toLocaleString('en-IN')}/mo` : '—' },
                        { label: 'Deduction Rules', value: emp.salaryDeductionRules || '—' },
                    ].map(({ label, value }) => (
                        <div key={label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <p style={{ fontSize: 11, color: '#475569', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
                            <p style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600, wordBreak: 'break-word' }}>{value}</p>
                        </div>
                    ))}
                </div>
                <div style={{ marginTop: 20, padding: '14px 16px', borderRadius: 10, background: 'rgba(249,115,22,0.07)', border: '1px solid rgba(249,115,22,0.2)' }}>
                    <p style={{ fontSize: 12, color: '#64748b', marginBottom: 10, fontWeight: 600 }}>THIS MONTH</p>
                    {(() => {
                        const n = new Date();
                        const wd = getWorkDays(n.getFullYear(), n.getMonth());
                        const present = wd.filter(d => emp.attendance[d] === 'present').length;
                        const absent = wd.filter(d => emp.attendance[d] === 'absent').length;
                        const pct = wd.length ? Math.round((present / wd.length) * 100) : 0;
                        return (
                            <div style={{ display: 'flex', gap: 20 }}>
                                <div><span style={{ fontSize: 20, fontWeight: 800, color: '#22c55e' }}>{present}</span><p style={{ fontSize: 11, color: '#64748b' }}>Present</p></div>
                                <div><span style={{ fontSize: 20, fontWeight: 800, color: '#ef4444' }}>{absent}</span><p style={{ fontSize: 11, color: '#64748b' }}>Absent</p></div>
                                <div><span style={{ fontSize: 20, fontWeight: 800, color: '#fb923c' }}>{pct}%</span><p style={{ fontSize: 11, color: '#64748b' }}>Rate</p></div>
                            </div>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
}

// ── Add / Edit Employee Form ────────────────────────────────────────────────

interface NewEmpForm {
    name: string; role: string; salary: string; dateOfJoining: string;
    salaryDeductionRules: string; email: string; phone: string; aadhaar: string;
}
const EMPTY_FORM: NewEmpForm = { name: '', role: '', salary: '', dateOfJoining: '', salaryDeductionRules: '', email: '', phone: '', aadhaar: '' };

function empToForm(emp: Employee): NewEmpForm {
    return {
        name: emp.name,
        role: emp.role,
        salary: emp.salary != null ? String(emp.salary) : '',
        dateOfJoining: emp.dateOfJoining ?? '',
        salaryDeductionRules: emp.salaryDeductionRules ?? '',
        email: emp.email ?? '',
        phone: emp.phone ?? '',
        aadhaar: emp.aadhaar ?? '',
    };
}

function EditEmployeeModal({
    emp, onSave, onClose,
}: {
    emp: Employee;
    onSave: (updated: Employee) => void;
    onClose: () => void;
}) {
    const [form, setForm] = useState<NewEmpForm>(empToForm(emp));
    const [errors, setErrors] = useState<Partial<Record<keyof NewEmpForm, string>>>({});

    const setField = (key: keyof NewEmpForm, val: string) => {
        setForm(f => ({ ...f, [key]: val }));
        setErrors(e => ({ ...e, [key]: undefined }));
    };

    const validate = (): boolean => {
        const errs: Partial<Record<keyof NewEmpForm, string>> = {};
        if (!form.name.trim()) errs.name = 'Name is required';
        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email';
        if (form.phone && !/^\d{10}$/.test(form.phone.replace(/\s/g, ''))) errs.phone = '10-digit number';
        if (form.aadhaar && !/^\d{12}$/.test(form.aadhaar.replace(/\s/g, ''))) errs.aadhaar = '12-digit Aadhaar';
        if (form.salary && isNaN(Number(form.salary))) errs.salary = 'Enter valid salary';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const save = () => {
        if (!validate()) return;
        const updated: Employee = {
            ...emp,
            name: form.name.trim(),
            role: form.role.trim() || emp.role,
            avatar: form.name.trim().split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2),
            salary: form.salary ? Number(form.salary) : emp.salary ?? 0,
            dateOfJoining: form.dateOfJoining,
            salaryDeductionRules: form.salaryDeductionRules.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            aadhaar: form.aadhaar.trim(),
        };
        onSave(updated);
    };

    const inp = { padding: '10px 12px', fontSize: 13 };
    const err = { fontSize: 11, color: '#ef4444', marginTop: 4 };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="glass-card animate-fade-in modal-inner"
                style={{ width: '100%', maxWidth: 560, padding: 28, position: 'relative' }}
                onClick={e => e.stopPropagation()}
            >
                <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', marginBottom: 20 }}>Edit Employee</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                    <div>
                        <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>Full Name *</label>
                        <input className="dark-input" value={form.name} onChange={e => setField('name', e.target.value)} style={inp} />
                        {errors.name && <p style={err}>{errors.name}</p>}
                    </div>
                    <div>
                        <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>Role</label>
                        <input className="dark-input" value={form.role} onChange={e => setField('role', e.target.value)} style={inp} />
                    </div>
                    <div>
                        <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>Monthly Salary (₹)</label>
                        <input className="dark-input" type="number" value={form.salary} onChange={e => setField('salary', e.target.value)} style={inp} />
                        {errors.salary && <p style={err}>{errors.salary}</p>}
                    </div>
                    <div>
                        <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>Date of Joining</label>
                        <input className="dark-input" type="date" value={form.dateOfJoining} onChange={e => setField('dateOfJoining', e.target.value)} style={{ ...inp, colorScheme: 'dark' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>Email</label>
                        <input className="dark-input" type="email" value={form.email} onChange={e => setField('email', e.target.value)} style={inp} />
                        {errors.email && <p style={err}>{errors.email}</p>}
                    </div>
                    <div>
                        <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>Phone</label>
                        <input className="dark-input" type="tel" value={form.phone} onChange={e => setField('phone', e.target.value)} style={inp} />
                        {errors.phone && <p style={err}>{errors.phone}</p>}
                    </div>
                    <div>
                        <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>Aadhaar Number</label>
                        <input className="dark-input" type="text" maxLength={12} value={form.aadhaar} onChange={e => setField('aadhaar', e.target.value.replace(/\D/g, ''))} style={inp} />
                        {errors.aadhaar && <p style={err}>{errors.aadhaar}</p>}
                    </div>
                    <div>
                        <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>Salary Deduction Rules</label>
                        <input className="dark-input" value={form.salaryDeductionRules} onChange={e => setField('salaryDeductionRules', e.target.value)} style={inp} />
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{ padding: '10px 18px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                    <button className="glow-btn" onClick={save} style={{ padding: '10px 24px', fontSize: 13 }}><span>Save Changes</span></button>
                </div>
            </div>
        </div>
    );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function AttendancePage() {
    const { data, updateEmployees } = useAppStore();
    const employees = data.employees as Employee[];
    const { deleteEmployee } = useAppStore();
    const { canAccess } = useSubscription();

    // ── Plan gate: attendance is Starter+ only ────────────────────────────────
    if (!canAccess('attendance')) {
        return (
            <AppLayout title="Attendance" subtitle="Track employee attendance & payroll">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', textAlign: 'center' }}>
                    <div style={{ width: 80, height: 80, borderRadius: 20, background: 'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(234,88,12,0.1))', border: '1px solid rgba(249,115,22,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                        <Lock size={36} color="#f97316" />
                    </div>
                    <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', marginBottom: 10 }}>Attendance Tracking</h2>
                    <p style={{ fontSize: 14, color: '#64748b', maxWidth: 420, marginBottom: 28, lineHeight: 1.7 }}>
                        Employee attendance tracking and payroll sheets are available on the{' '}
                        <strong style={{ color: '#fb923c' }}>Starter plan</strong> and above.
                        Upgrade to unlock monthly attendance grids, overtime tracking and salary deduction rules.
                    </p>
                    <Link
                        href="/pricing"
                        style={{ padding: '12px 32px', borderRadius: 12, background: 'linear-gradient(135deg, #f97316, #ea580c)', color: 'white', fontWeight: 700, fontSize: 14, textDecoration: 'none', boxShadow: '0 8px 24px rgba(249,115,22,0.35)' }}
                    >
                        View Plans &amp; Upgrade
                    </Link>
                </div>
            </AppLayout>
        );
    }

    const now = new Date();
    const [viewYear, setViewYear] = useState(now.getFullYear());
    const [viewMonth, setViewMonth] = useState(now.getMonth());
    const monthDays = getMonthDays(viewYear, viewMonth);
    const workDays = getWorkDays(viewYear, viewMonth);
    const today = TODAY;

    const [showAddForm, setShowAddForm] = useState(false);
    const [form, setForm] = useState<NewEmpForm>(EMPTY_FORM);
    const [formErrors, setFormErrors] = useState<Partial<Record<keyof NewEmpForm, string>>>({});
    const [profileEmp, setProfileEmp] = useState<Employee | null>(null);
    const [editEmp, setEditEmp] = useState<Employee | null>(null);

    const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();

    const prevMonth = () => {
        if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
        else setViewMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
        else setViewMonth(m => m + 1);
    };

    const setField = (key: keyof NewEmpForm, val: string) => {
        setForm(f => ({ ...f, [key]: val }));
        setFormErrors(e => ({ ...e, [key]: undefined }));
    };

    const toggle = (empId: string, date: string) => {
        updateEmployees(prev =>
            prev.map(e => {
                if (e.id !== empId) return e;
                const current = e.attendance[date];
                const next = current === 'present' ? 'absent' : 'present';
                return { ...e, attendance: { ...e.attendance, [date]: next } };
            })
        );
    };

    const toggleOvertime = (empId: string, date: string) => {
        updateEmployees(prev =>
            prev.map(e => {
                if (e.id !== empId) return e;
                const ot = e.overtime ?? {};
                return { ...e, overtime: { ...ot, [date]: !ot[date] } };
            })
        );
    };

    const markAll = (status: 'present' | 'absent') => {
        updateEmployees(prev => prev.map(e => ({ ...e, attendance: { ...e.attendance, [today]: status } })));
    };

    const validateForm = (): boolean => {
        const errs: Partial<Record<keyof NewEmpForm, string>> = {};
        if (!form.name.trim()) errs.name = 'Full name is required';
        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email';
        if (form.phone && !/^\d{10}$/.test(form.phone.replace(/\s/g, ''))) errs.phone = 'Enter 10-digit phone number';
        if (form.aadhaar && !/^\d{12}$/.test(form.aadhaar.replace(/\s/g, ''))) errs.aadhaar = 'Aadhaar must be 12 digits';
        if (form.salary && isNaN(Number(form.salary))) errs.salary = 'Enter a valid salary';
        setFormErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const addEmployee = () => {
        if (!validateForm()) return;
        const id = 'e' + Date.now();
        updateEmployees(prev => [
            ...prev,
            {
                id,
                name: form.name.trim(),
                role: form.role.trim() || 'Team Member',
                avatar: form.name.trim().split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2),
                attendance: {},
                overtime: {},
                salary: form.salary ? Number(form.salary) : 0,
                dateOfJoining: form.dateOfJoining || '',
                salaryDeductionRules: form.salaryDeductionRules.trim(),
                email: form.email.trim(),
                phone: form.phone.trim(),
                aadhaar: form.aadhaar.trim(),
            },
        ]);
        setForm(EMPTY_FORM);
        setFormErrors({});
        setShowAddForm(false);
    };

    const getStats = (emp: Employee) => {
        const present = workDays.filter(d => emp.attendance[d] === 'present').length;
        const absent = workDays.filter(d => emp.attendance[d] === 'absent').length;
        const pct = workDays.length ? Math.round((present / workDays.length) * 100) : 0;
        return { present, absent, pct };
    };

    const inp = { padding: '10px 12px', fontSize: 13 };
    const err = { fontSize: 11, color: '#ef4444', marginTop: 4 };

    return (
        <AppLayout title="Attendance" subtitle={`${MONTH_NAMES[viewMonth]} ${viewYear} — ${workDays.length} working days`}>
            {/* Header actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button onClick={() => markAll('present')} style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.25)', color: '#22c55e', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Check size={14} /> Mark All Present Today
                    </button>
                    <button onClick={() => markAll('absent')} style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <X size={14} /> Mark All Absent Today
                    </button>
                </div>
                <button onClick={() => setShowAddForm(true)} className="glow-btn" style={{ padding: '9px 18px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><UserPlus size={14} /> Add Employee</span>
                </button>
            </div>

            {/* Extended Add Employee Form */}
            {showAddForm && (
                <div className="glass-card animate-fade-in" style={{ padding: 24, marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>Add New Employee</h3>
                        <button onClick={() => { setShowAddForm(false); setForm(EMPTY_FORM); setFormErrors({}); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                        {/* Full Name */}
                        <div>
                            <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>Full Name *</label>
                            <input className="dark-input" placeholder="e.g. Aarav Sharma" value={form.name} onChange={e => setField('name', e.target.value)} style={inp} />
                            {formErrors.name && <p style={err}>{formErrors.name}</p>}
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>Role</label>
                            <input className="dark-input" placeholder="e.g. Developer" value={form.role} onChange={e => setField('role', e.target.value)} style={inp} />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>Monthly Salary (₹)</label>
                            <input className="dark-input" type="number" placeholder="e.g. 50000" value={form.salary} onChange={e => setField('salary', e.target.value)} style={inp} />
                            {formErrors.salary && <p style={err}>{formErrors.salary}</p>}
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>Date of Joining</label>
                            <input className="dark-input" type="date" value={form.dateOfJoining} onChange={e => setField('dateOfJoining', e.target.value)} style={{ ...inp, colorScheme: 'dark' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>Email</label>
                            <input className="dark-input" type="email" placeholder="employee@company.com" value={form.email} onChange={e => setField('email', e.target.value)} style={inp} />
                            {formErrors.email && <p style={err}>{formErrors.email}</p>}
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>Phone Number</label>
                            <input className="dark-input" type="tel" placeholder="10-digit mobile" value={form.phone} onChange={e => setField('phone', e.target.value)} style={inp} />
                            {formErrors.phone && <p style={err}>{formErrors.phone}</p>}
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>Aadhaar Card Number</label>
                            <input className="dark-input" type="text" placeholder="12-digit number" maxLength={12} value={form.aadhaar} onChange={e => setField('aadhaar', e.target.value.replace(/\D/g, ''))} style={inp} />
                            {formErrors.aadhaar && <p style={err}>{formErrors.aadhaar}</p>}
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>Salary Deduction Rules</label>
                            <input className="dark-input" placeholder="e.g. ₹500/absent day" value={form.salaryDeductionRules} onChange={e => setField('salaryDeductionRules', e.target.value)} style={inp} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
                        <button onClick={() => { setShowAddForm(false); setForm(EMPTY_FORM); setFormErrors({}); }} style={{ padding: '10px 18px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                        <button className="glow-btn" onClick={addEmployee} style={{ padding: '10px 24px', fontSize: 13 }}><span>Add Employee</span></button>
                    </div>
                </div>
            )}

            {/* Edit Employee Modal */}
            {editEmp && (
                <EditEmployeeModal
                    emp={editEmp}
                    onClose={() => setEditEmp(null)}
                    onSave={updated => {
                        updateEmployees(prev => prev.map(e => e.id === updated.id ? updated : e));
                        setEditEmp(null);
                        setProfileEmp(updated);
                    }}
                />
            )}

            {/* Today's attendance cards — only shown when viewing current month */}
            {isCurrentMonth && (
                <div style={{ marginBottom: 28 }}>
                    <h2 style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
                        Today — {new Date(today).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
                        {employees.map(emp => {
                            const status = emp.attendance[today] ?? null;
                            const hasOT = (emp.overtime ?? {})[today] ?? false;
                            return (
                                <div key={emp.id} className="glass-card" style={{ padding: '16px 18px', borderColor: status === 'present' ? 'rgba(34,197,94,0.3)' : status === 'absent' ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)', transition: 'border-color 0.2s' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, cursor: 'pointer' }} onClick={() => setProfileEmp(emp)}>
                                        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #f97316, #ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'white' }}>
                                            {emp.avatar}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{emp.name}</p>
                                            <p style={{ fontSize: 12, color: '#64748b' }}>{emp.role}</p>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                        <button
                                            onClick={() => { if (status !== 'present') toggle(emp.id, today); }}
                                            style={{ flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', background: status === 'present' ? 'rgba(34,197,94,0.25)' : 'rgba(34,197,94,0.07)', border: status === 'present' ? '1px solid rgba(34,197,94,0.5)' : '1px solid rgba(34,197,94,0.15)', color: '#22c55e' }}
                                        >✓ Present</button>
                                        <button
                                            onClick={() => { if (status !== 'absent') toggle(emp.id, today); }}
                                            style={{ flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', background: status === 'absent' ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.07)', border: status === 'absent' ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(239,68,68,0.15)', color: '#ef4444' }}
                                        >✕ Absent</button>
                                    </div>
                                    <button
                                        onClick={() => toggleOvertime(emp.id, today)}
                                        style={{ width: '100%', padding: '6px 0', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, background: hasOT ? 'rgba(245,158,11,0.2)' : 'rgba(245,158,11,0.05)', border: hasOT ? '1px solid rgba(245,158,11,0.5)' : '1px solid rgba(245,158,11,0.15)', color: '#f59e0b' }}
                                    >
                                        <Clock size={12} /> {hasOT ? 'Overtime ✓' : 'Overtime'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Monthly Summary */}
            <div className="glass-card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>Monthly Summary</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button onClick={prevMonth} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ChevronLeft size={16} />
                        </button>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', minWidth: 130, textAlign: 'center' }}>{MONTH_NAMES[viewMonth]} {viewYear}</span>
                        <button onClick={nextMonth} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
                <div className="table-scroll">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Role</th>
                                <th>Present</th>
                                <th>Absent</th>
                                <th>Overtime</th>
                                <th>Working Days</th>
                                <th>Attendance %</th>
                                <th>Status</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map(emp => {
                                const { present, absent, pct } = getStats(emp);
                                const otDays = Object.entries(emp.overtime ?? {}).filter(([date, val]) => val && monthDays.includes(date)).length;
                                return (
                                    <tr key={emp.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setProfileEmp(emp)}>
                                                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, #f97316, #ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white' }}>
                                                    {emp.avatar}
                                                </div>
                                                <span style={{ fontWeight: 600, color: '#fb923c', textDecoration: 'underline', textUnderlineOffset: 3 }}>{emp.name}</span>
                                            </div>
                                        </td>
                                        <td style={{ color: '#64748b' }}>{emp.role}</td>
                                        <td style={{ color: '#22c55e', fontWeight: 600 }}>{present}</td>
                                        <td style={{ color: '#ef4444', fontWeight: 600 }}>{absent}</td>
                                        <td style={{ color: '#f59e0b', fontWeight: 600 }}>{otDays > 0 ? otDays : '—'}</td>
                                        <td style={{ color: '#94a3b8' }}>{workDays.length}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                                                    <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444', transition: 'width 0.4s ease' }} />
                                                </div>
                                                <span style={{ fontSize: 13, fontWeight: 600, minWidth: 36 }}>{pct}%</span>
                                            </div>
                                        </td>
                                        <td>
                                            <Badge variant={pct >= 80 ? 'success' : pct >= 60 ? 'warning' : 'danger'}>{pct >= 80 ? 'Good' : pct >= 60 ? 'Average' : 'Poor'}</Badge>
                                        </td>
                                        <td>
                                            <button
                                                onClick={() => { if (window.confirm(`Remove ${emp.name}?`)) deleteEmployee(emp.id); }}
                                                style={{ padding: '5px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                                            >Remove</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Employee Profile Modal */}
            {profileEmp && <EmployeeProfileModal emp={profileEmp} onClose={() => setProfileEmp(null)} onEdit={() => { setEditEmp(profileEmp); setProfileEmp(null); }} />}
        </AppLayout>
    );
}