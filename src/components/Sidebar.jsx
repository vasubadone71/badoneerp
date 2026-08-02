import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Shield, 
  Car, 
  Users, 
  Wallet, 
  FileText, 
  Bell,
  History,
  Hash,
  Settings as SettingsIcon 
} from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Sidebar() {
  const [logo, setLogo] = useState(null);
  const [companyName, setCompanyName] = useState('BADONE ERP');

  useEffect(() => {
    async function loadSettings() {
      if (window.api && window.api.getSettings) {
        try {
          const data = await window.api.getSettings();
          if (data) {
            if (data.logo_base64) setLogo(data.logo_base64);
            if (data.company_name) setCompanyName(data.company_name.substring(0, 15) + (data.company_name.length > 15 ? '...' : ''));
          }
        } catch (e) { console.warn('IPC error ignored for visual redesign:', e); }
      }
    }
    loadSettings();
  }, []);

  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/' },
    { icon: <ClipboardList size={20} />, label: 'Master Processing Desk', path: '/master' },
    { icon: <Shield size={20} />, label: 'Insurance Department', path: '/insurance' },
    { icon: <Car size={20} />, label: 'RTO Department', path: '/rto' },
    { icon: <Hash size={20} />, label: 'Number Plate Orders', path: '/number-plates' },
    { icon: <Bell size={20} />, label: 'Renewal Reminders', path: '/reminders' },
    { icon: <Users size={20} />, label: 'Dealer Network', path: '/network' },
    { icon: <Wallet size={20} />, label: 'Agent Ledger', path: '/commission' },
    { icon: <History size={20} />, label: 'Dealer Ledger', path: '/ledger' },
    { icon: <FileText size={20} />, label: 'Export Reports', path: '/reports' },
    { icon: <SettingsIcon size={20} />, label: 'System Settings', path: '/settings' },
  ];

  return (
    <div style={{ width: '280px', backgroundColor: 'var(--sidebar-bg)', color: '#F8FAFC', display: 'flex', flexDirection: 'column', flexShrink: 0, boxShadow: '4px 0 24px rgba(0,0,0,0.06)', zIndex: 100 }}>
      
      {/* Brand Section */}
      <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '14px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {logo ? (
          <img src={logo} alt="Logo" style={{ width: '36px', height: '36px', objectFit: 'contain', borderRadius: '8px', background: '#fff', padding: '2px' }} />
        ) : (
          <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #6366f1 100%)', color: 'white', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', fontWeight: 800, fontSize: '20px', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)' }}>
            {companyName.charAt(0)}
          </div>
        )}
        <div style={{ fontWeight: 700, fontSize: companyName.length > 12 ? '14px' : '16px', letterSpacing: '0.5px' }}>{companyName}</div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '24px 12px', overflowY: 'auto' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', paddingLeft: '12px' }}>Main Menu</div>
        {menuItems.map((item, index) => (
          <NavLink 
            key={index} 
            to={item.path} 
            style={({ isActive }) => ({
              padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', fontWeight: 500, borderRadius: '12px', marginBottom: '4px',
              transition: 'all 0.2s ease', position: 'relative',
              color: isActive ? '#FFFFFF' : '#94A3B8',
              backgroundColor: isActive ? 'rgba(79, 70, 229, 0.15)' : 'transparent',
              boxShadow: isActive ? 'inset 4px 0 0 var(--primary)' : 'none'
            })}
            onMouseEnter={e => { if(e.currentTarget.style.backgroundColor === 'transparent') { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#F8FAFC'; } }}
            onMouseLeave={e => { if(e.currentTarget.style.backgroundColor === 'rgba(255, 255, 255, 0.05)') { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#94A3B8'; } }}
          >
            {({ isActive }) => (
              <>
                <div style={{ color: isActive ? 'var(--primary)' : 'inherit', transition: 'color 0.2s ease' }}>{item.icon}</div>
                <span style={{ fontSize: '14px' }}>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer Profile / Version */}
      <div style={{ padding: '20px 24px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#1E293B', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #334155' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 8px var(--success)' }} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#F8FAFC' }}>Admin</div>
            <div style={{ fontSize: '11px', color: '#64748B' }}>Online</div>
          </div>
        </div>
        <div style={{ fontSize: '10px', fontWeight: 700, padding: '4px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', color: '#94A3B8' }}>v2.0.1 PRO</div>
      </div>
    </div>
  );
}
