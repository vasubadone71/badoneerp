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
      if (window.api) {
        const data = await window.api.getSettings();
        if (data) {
          if (data.logo_base64) setLogo(data.logo_base64);
          if (data.company_name) setCompanyName(data.company_name.substring(0, 15) + (data.company_name.length > 15 ? '...' : ''));
        }
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
    <div className="sidebar">
      <div className="sidebar-brand">
        {logo ? (
          <img src={logo} alt="Logo" style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '4px' }} />
        ) : (
          <div className="brand-logo">{companyName.charAt(0)}</div>
        )}
        <div className="brand-name" style={{ fontSize: companyName.length > 12 ? '14px' : '18px' }}>{companyName}</div>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map((item, index) => (
          <NavLink 
            key={index} 
            to={item.path} 
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="version-tag">v2.0.1 PRO</div>
      </div>
    </div>
  );
}
