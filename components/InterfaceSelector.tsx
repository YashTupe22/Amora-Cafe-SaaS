'use client';

import { Store, Briefcase, Check, UtensilsCrossed, FileText, Users, Package, LayoutDashboard, Receipt } from 'lucide-react';

export type InterfaceType = 'restaurant' | 'business';

interface InterfaceSelectorProps {
  selected: InterfaceType[];
  onChange: (selected: InterfaceType[]) => void;
  mode?: 'single' | 'multi'; // single = must pick one, multi = can pick multiple
}

const INTERFACE_OPTIONS: {
  id: InterfaceType;
  title: string;
  description: string;
  icon: typeof Store;
  color: string;
  features: string[];
}[] = [
  {
    id: 'restaurant',
    title: 'Restaurant / Cafe',
    description: 'Perfect for cafes, restaurants, food trucks, and quick-service outlets',
    icon: UtensilsCrossed,
    color: '#f97316',
    features: ['Table Management', 'Menu & Orders', 'Kitchen Display', 'Dine-In/Takeaway', 'Quick Billing'],
  },
  {
    id: 'business',
    title: 'General Business',
    description: 'Ideal for retail shops, service businesses, freelancers, and agencies',
    icon: Briefcase,
    color: '#8b5cf6',
    features: ['Client Invoicing', 'Expense Tracking', 'Inventory Management', 'Transaction Ledger', 'GST Reports'],
  },
];

export function InterfaceSelector({ selected, onChange, mode = 'multi' }: InterfaceSelectorProps) {
  const toggleInterface = (id: InterfaceType) => {
    if (mode === 'single') {
      onChange([id]);
      return;
    }
    
    if (selected.includes(id)) {
      // Don't allow deselecting if it's the only one selected
      if (selected.length === 1) return;
      onChange(selected.filter(s => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {INTERFACE_OPTIONS.map((opt) => {
        const isSelected = selected.includes(opt.id);
        const Icon = opt.icon;
        
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => toggleInterface(opt.id)}
            style={{
              padding: '20px',
              borderRadius: 16,
              background: isSelected ? `${opt.color}10` : 'rgba(255,255,255,0.03)',
              border: `2px solid ${isSelected ? opt.color : 'rgba(255,255,255,0.08)'}`,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s ease',
              position: 'relative',
            }}
          >
            {/* Selection indicator */}
            <div
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: isSelected ? opt.color : 'rgba(255,255,255,0.1)',
                border: `2px solid ${isSelected ? opt.color : 'rgba(255,255,255,0.2)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
            >
              {isSelected && <Check size={14} color="white" strokeWidth={3} />}
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
              {/* Icon */}
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: isSelected ? opt.color : 'rgba(255,255,255,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.2s ease',
                }}
              >
                <Icon size={24} color={isSelected ? 'white' : '#64748b'} />
              </div>

              {/* Content */}
              <div style={{ flex: 1, paddingRight: 30 }}>
                <h3 style={{ 
                  fontSize: 16, 
                  fontWeight: 700, 
                  color: isSelected ? opt.color : 'var(--text-primary)',
                  marginBottom: 4,
                }}>
                  {opt.title}
                </h3>
                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12, lineHeight: 1.4 }}>
                  {opt.description}
                </p>
                
                {/* Features */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {opt.features.map((feature) => (
                    <span
                      key={feature}
                      style={{
                        fontSize: 11,
                        padding: '4px 8px',
                        borderRadius: 6,
                        background: isSelected ? `${opt.color}20` : 'rgba(255,255,255,0.05)',
                        color: isSelected ? opt.color : '#94a3b8',
                        fontWeight: 500,
                      }}
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </button>
        );
      })}

      {mode === 'multi' && (
        <p style={{ fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 4 }}>
          💡 You can select both to access all features. Switch between them anytime.
        </p>
      )}
    </div>
  );
}

// Compact version for header/sidebar switcher
export function InterfaceSwitcher({ 
  active, 
  available, 
  onChange 
}: { 
  active: InterfaceType; 
  available: InterfaceType[];
  onChange: (type: InterfaceType) => void;
}) {
  if (available.length <= 1) return null;

  return (
    <div style={{
      display: 'flex',
      gap: 4,
      padding: 4,
      background: 'rgba(255,255,255,0.05)',
      borderRadius: 10,
    }}>
      {available.map((type) => {
        const isActive = type === active;
        const opt = INTERFACE_OPTIONS.find(o => o.id === type)!;
        const Icon = opt.icon;
        
        return (
          <button
            key={type}
            onClick={() => onChange(type)}
            title={opt.title}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              background: isActive ? opt.color : 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.2s ease',
            }}
          >
            <Icon size={16} color={isActive ? 'white' : '#64748b'} />
            <span style={{
              fontSize: 12,
              fontWeight: 600,
              color: isActive ? 'white' : '#64748b',
            }}>
              {type === 'restaurant' ? 'Cafe' : 'Business'}
            </span>
          </button>
        );
      })}
    </div>
  );
}
