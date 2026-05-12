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
  Settings as SettingsIcon 
} from 'lucide-react';

export default function Sidebar() {
  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/' },
    { icon: <ClipboardList size={20} />, label: 'Master Processing Desk', path: '/master' },
    { icon: <Shield size={20} />, label: 'Insurance Department', path: '/insurance' },
    { icon: <Car size={20} />, label: 'RTO Department', path: '/rto' },
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
        <div className="brand-logo">B</div>
        <div className="brand-name">BADONE ERP</div>
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
