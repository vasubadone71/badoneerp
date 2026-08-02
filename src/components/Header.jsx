import React from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Bell, Calendar } from 'lucide-react';

export default function Header() {
  const location = useLocation();
  
  const getTitle = () => {
    switch (location.pathname) {
      case '/': return 'Dashboard Overview';
      case '/master': return 'Master Entry Management';
      case '/insurance': return 'Insurance Department';
      case '/rto': return 'RTO Department';
      case '/number-plates': return 'Number Plate Orders';
      case '/reminders': return 'Renewal Reminders';
      case '/network': return 'Dealer Network';
      case '/commission': return 'Agent Ledger';
      case '/ledger': return 'Dealer Ledger';
      case '/reports': return 'System Reports';
      case '/settings': return 'System Settings';
      default: return 'Badone ERP';
    }
  };

  return (
    <div className="header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', height: '72px', background: 'var(--card-bg)', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 50 }}>
      
      {/* Left side: Breadcrumb / Title */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '2px' }}>
          Workspace / <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{getTitle()}</span>
        </div>
        <div className="header-title" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.5px' }}>
          {getTitle()}
        </div>
      </div>

      {/* Right side: Global Search, Date, Notifications */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        
        {/* Search Bar */}
        <div style={{ position: 'relative', width: '280px', display: 'flex', alignItems: 'center' }}>
          <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px' }} />
          <input 
            type="text" 
            placeholder="Search anything (Ctrl+K)..." 
            style={{ width: '100%', padding: '10px 16px 10px 36px', borderRadius: '12px', border: '1px solid var(--border-color)', background: '#F8FAFC', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', transition: 'all 0.2s' }}
            onFocus={(e) => { e.target.style.background = '#FFF'; e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,0.1)'; }}
            onBlur={(e) => { e.target.style.background = '#F8FAFC'; e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'none'; }}
          />
        </div>

        <div style={{ width: '1px', height: '24px', background: 'var(--border-color)' }} />

        {/* Date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500 }}>
          <Calendar size={16} />
          {new Date().toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
        </div>

        {/* Notifications */}
        <button style={{ width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)', background: '#FFFFFF', cursor: 'pointer', position: 'relative', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'} onMouseLeave={e => e.currentTarget.style.background = '#FFFFFF'}>
          <Bell size={18} color="var(--text-secondary)" />
          <div style={{ position: 'absolute', top: '6px', right: '6px', width: '8px', height: '8px', background: 'var(--danger)', borderRadius: '50%', border: '2px solid #FFF' }} />
        </button>

      </div>
    </div>
  );
}
