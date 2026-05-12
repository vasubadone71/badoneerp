import React from 'react';
import { useLocation } from 'react-router-dom';

export default function Header() {
  const location = useLocation();
  
  const getTitle = () => {
    switch (location.pathname) {
      case '/': return 'Dashboard Overview';
      case '/master': return 'Master Entry Management';
      case '/insurance': return 'Insurance Department';
      case '/rto': return 'RTO Department';
      case '/network': return 'Network & Dealer Management';
      case '/commission': return 'Agent Commission Ledger';
      case '/reports': return 'System Reports';
      case '/settings': return 'Backup & System Settings';
      default: return 'Badone ERP';
    }
  };

  return (
    <div className="header">
      <div className="header-title">{getTitle()}</div>
      <div>
        <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
      </div>
    </div>
  );
}
