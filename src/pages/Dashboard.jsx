import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, Cell, PieChart, Pie } from 'recharts';
import api from '../utils/api';
import { 
  ShieldCheck, 
  FileText, 
  Clock, 
  CheckCircle, 
  Calendar, 
  AlertTriangle, 
  RefreshCw, 
  Activity, 
  IndianRupee, 
  User,
  Zap,
  TrendingUp,
  MapPin,
  Wallet,
  Hash
} from 'lucide-react';
import { socket } from '../utils/socket';

export default function Dashboard() {
  const [stats, setStats] = useState({
    insurance: { total: 0, pending: 0, completed: 0, today: 0, expiring: 0 },
    rto: { total: 0, pending: 0, completed: 0, regPending: 0, today: 0 },
    renewals: { next7: 0, next30: 0, expired: 0 },
    commission: { insurance: 0, rto: 0, pending: 0, monthly: 0 },
    numberPlate: { total: 0, pending: 0, done: 0, reason: 0 },
    monthly_trend: [],
    recent_activity: []
  });

  const [ledgerStats, setLedgerStats] = useState({
    totalReceivable: 0,
    totalReceived: 0,
    pendingMain: 0,
    pendingASC: 0,
    pendingFO: 0,
    insuranceReceivable: 0,
    rtoReceivable: 0
  });

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const { data } = await api.get('/dashboard');
        setStats(data);
        const lData = await api.get('/ledgers/dashboard-stats');
        setLedgerStats(lData.data);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      }
    }
    loadDashboardData();

    // Listen for real-time socket updates from other PCs
    socket.on('REFRESH_DASHBOARD', () => {
      console.log('Real-time update received, refreshing dashboard...');
      loadDashboardData();
    });

    // We can remove the polling interval now that we have WebSockets
    // const interval = setInterval(loadDashboardData, 5000);
    
    return () => {
      // clearInterval(interval);
      socket.off('REFRESH_DASHBOARD');
    };
  }, []);

  const insuranceData = [
    { name: 'Completed', value: stats.insurance.completed, color: '#388e3c' },
    { name: 'Pending', value: stats.insurance.pending, color: '#f57c00' },
  ];

  const rtoData = [
    { name: 'Completed', value: stats.rto.completed, color: '#388e3c' },
    { name: 'Pending', value: stats.rto.pending, color: '#f57c00' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      
      {/* SECTION 1: DEPARTMENT KPI CARDS */}
      <div className="section-header">
        <ShieldCheck size={20} color="#1976d2" />
        <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Insurance Department Operations</h2>
      </div>
      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <div className="card stat-card-compact" style={{ borderLeft: '4px solid #1976d2' }}>
          <div className="stat-label">Total Entries</div>
          <div className="stat-value-sm">{stats.insurance.total}</div>
        </div>
        <div className="card stat-card-compact" style={{ borderLeft: '4px solid #f57c00' }}>
          <div className="stat-label">Pending</div>
          <div className="stat-value-sm" style={{ color: '#f57c00' }}>{stats.insurance.pending}</div>
        </div>
        <div className="card stat-card-compact" style={{ borderLeft: '4px solid #388e3c' }}>
          <div className="stat-label">Completed</div>
          <div className="stat-value-sm" style={{ color: '#388e3c' }}>{stats.insurance.completed}</div>
        </div>
        <div className="card stat-card-compact" style={{ borderLeft: '4px solid #d32f2f' }}>
          <div className="stat-label">Expiring Soon</div>
          <div className="stat-value-sm" style={{ color: '#d32f2f' }}>{stats.insurance.expiring}</div>
        </div>
        <div className="card stat-card-compact" style={{ borderLeft: '4px solid #7b1fa2' }}>
          <div className="stat-label">Today's Work</div>
          <div className="stat-value-sm" style={{ color: '#7b1fa2' }}>{stats.insurance.today}</div>
        </div>
      </div>

      <div className="section-header" style={{ marginTop: '8px' }}>
        <Zap size={20} color="#388e3c" />
        <h2 style={{ fontSize: '18px', fontWeight: 600 }}>RTO Department Operations</h2>
      </div>
      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <div className="card stat-card-compact" style={{ borderLeft: '4px solid #388e3c' }}>
          <div className="stat-label">Total Entries</div>
          <div className="stat-value-sm">{stats.rto.total}</div>
        </div>
        <div className="card stat-card-compact" style={{ borderLeft: '4px solid #f57c00' }}>
          <div className="stat-label">Pending</div>
          <div className="stat-value-sm" style={{ color: '#f57c00' }}>{stats.rto.pending}</div>
        </div>
        <div className="card stat-card-compact" style={{ borderLeft: '4px solid #2e7d32' }}>
          <div className="stat-label">Completed</div>
          <div className="stat-value-sm" style={{ color: '#2e7d32' }}>{stats.rto.completed}</div>
        </div>
        <div className="card stat-card-compact" style={{ borderLeft: '4px solid #1976d2' }}>
          <div className="stat-label">Reg. Pending</div>
          <div className="stat-value-sm" style={{ color: '#1976d2' }}>{stats.rto.regPending}</div>
        </div>
        <div className="card stat-card-compact" style={{ borderLeft: '4px solid #7b1fa2' }}>
          <div className="stat-label">Today's Work</div>
          <div className="stat-value-sm" style={{ color: '#7b1fa2' }}>{stats.rto.today}</div>
        </div>
      </div>

      {/* SECTION: NUMBER PLATE ORDERS */}
      <div className="section-header" style={{ marginTop: '8px' }}>
        <Hash size={20} color="#7b1fa2" />
        <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Vehicle Number Plate Orders</h2>
      </div>
      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="card stat-card-compact" style={{ borderLeft: '4px solid #7b1fa2' }}>
          <div className="stat-label">Total Orders</div>
          <div className="stat-value-sm">{stats.numberPlate?.total || 0}</div>
        </div>
        <div className="card stat-card-compact" style={{ borderLeft: '4px solid #f57c00' }}>
          <div className="stat-label">🟡 Pending</div>
          <div className="stat-value-sm" style={{ color: '#f57c00' }}>{stats.numberPlate?.pending || 0}</div>
        </div>
        <div className="card stat-card-compact" style={{ borderLeft: '4px solid #2e7d32' }}>
          <div className="stat-label">🟢 Order Done</div>
          <div className="stat-value-sm" style={{ color: '#2e7d32' }}>{stats.numberPlate?.done || 0}</div>
        </div>
        <div className="card stat-card-compact" style={{ borderLeft: '4px solid #c62828' }}>
          <div className="stat-label">🔴 Gone In Reason</div>
          <div className="stat-value-sm" style={{ color: '#c62828' }}>{stats.numberPlate?.reason || 0}</div>
        </div>
      </div>

      {/* SECTION: DEALER LEDGER SUMMARY */}
      <div className="section-header" style={{ marginTop: '8px' }}>
        <Wallet size={20} color="#d32f2f" />
        <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Dealer Payment Summary (Main, ASC & FO)</h2>
      </div>
      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <div className="card stat-card-compact" style={{ borderLeft: '4px solid #d32f2f', background: 'rgba(211, 47, 47, 0.02)' }}>
          <div className="stat-label">Total Receivable</div>
          <div className="stat-value-sm" style={{ color: '#d32f2f' }}>₹{ledgerStats.totalReceivable?.toLocaleString('en-IN')}</div>
          <div style={{ fontSize: '10px', color: '#888' }}>Total pending from all dealers</div>
        </div>
        <div className="card stat-card-compact" style={{ borderLeft: '4px solid #388e3c', background: 'rgba(56, 142, 60, 0.02)' }}>
          <div className="stat-label">Total Received</div>
          <div className="stat-value-sm" style={{ color: '#388e3c' }}>₹{ledgerStats.totalReceived?.toLocaleString('en-IN')}</div>
          <div style={{ fontSize: '10px', color: '#888' }}>Cumulative payments received</div>
        </div>
        <div className="card stat-card-compact" style={{ borderLeft: '4px solid #7b1fa2', background: 'rgba(123, 31, 162, 0.02)' }}>
          <div className="stat-label">Main Dealer Pending</div>
          <div className="stat-value-sm" style={{ color: '#7b1fa2' }}>₹{ledgerStats.pendingMain?.toLocaleString('en-IN')}</div>
          <div style={{ fontSize: '10px', color: '#888' }}>Insurance + RTO for Main Dealer</div>
        </div>
        <div className="card stat-card-compact" style={{ borderLeft: '4px solid #1976d2' }}>
          <div className="stat-label">ASC Pending</div>
          <div className="stat-value-sm" style={{ color: '#1976d2' }}>₹{ledgerStats.pendingASC?.toLocaleString('en-IN')}</div>
          <div style={{ fontSize: '10px', color: '#888' }}>Insurance + RTO for ASCs</div>
        </div>
        <div className="card stat-card-compact" style={{ borderLeft: '4px solid #f57c00' }}>
          <div className="stat-label">FO Point Pending</div>
          <div className="stat-value-sm" style={{ color: '#f57c00' }}>₹{ledgerStats.pendingFO?.toLocaleString('en-IN')}</div>
          <div style={{ fontSize: '10px', color: '#888' }}>Insurance + RTO for FO Points</div>
        </div>
      </div>

      {/* SECTION 2: RENEWALS & TRENDS */}
      <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: '8px' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RefreshCw size={18} color="#d32f2f" /> Renewal Reminder Analytics
            </h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="reminder-item orange">
              <div className="val">{stats.renewals.next7}</div>
              <div className="lab">Expiring in 7 Days</div>
            </div>
            <div className="reminder-item yellow">
              <div className="val">{stats.renewals.next30}</div>
              <div className="lab">Expiring in 30 Days</div>
            </div>
            <div className="reminder-item red">
              <div className="val">{stats.renewals.expired}</div>
              <div className="lab">Already Expired</div>
            </div>
            <div className="reminder-item blue">
              <div className="val">{stats.insurance.pending}</div>
              <div className="lab">Renewal Pending</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} color="#1976d2" /> Monthly Operational Trends
          </h3>
          <div style={{ height: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.monthly_trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip />
                <Line type="monotone" dataKey="insurance" stroke="#1976d2" strokeWidth={2} name="Insurance" dot={{ r: 4 }} />
                <Line type="monotone" dataKey="rto" stroke="#388e3c" strokeWidth={2} name="RTO" dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SECTION 3: RECENT ACTIVITY & COMMISSION SUMMARY */}
      <div className="dashboard-grid" style={{ gridTemplateColumns: '2fr 1fr', marginTop: '8px' }}>
        <div className="card">
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} color="#1976d2" /> Recent Activity Log
          </h3>
          <div className="activity-list">
            {stats.recent_activity.length > 0 ? stats.recent_activity.map((act, i) => (
              <div key={i} className="activity-item">
                <div className="activity-icon">
                  <FileText size={14} />
                </div>
                <div className="activity-content">
                  <div className="activity-title">New {act.type}: <strong>{act.customer_name}</strong></div>
                  <div className="activity-meta">
                    <span>Inv: {act.invoice_no}</span> • <span>{act.dealer_name}</span> • <span>{act.invoice_date}</span>
                  </div>
                </div>
                <div className="activity-tag">Success</div>
              </div>
            )) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>No recent activity found.</div>
            )}
          </div>
        </div>

        <div className="card" style={{ background: '#f8f9fa' }}>
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IndianRupee size={18} color="#388e3c" /> Agent Commission Summary
          </h3>
          <div className="commission-summary-compact">
            <div className="comm-sum-item">
              <div className="lab">Insurance Total</div>
              <div className="val">₹{stats.commission.insurance.toLocaleString('en-IN')}</div>
            </div>
            <div className="comm-sum-item">
              <div className="lab">RTO Total</div>
              <div className="val">₹{stats.commission.rto.toLocaleString('en-IN')}</div>
            </div>
            <hr style={{ margin: '12px 0', opacity: 0.1 }} />
            <div className="comm-sum-item">
              <div className="lab" style={{ fontWeight: 600 }}>This Month</div>
              <div className="val" style={{ color: '#1976d2', fontWeight: 700 }}>₹{stats.commission.monthly.toLocaleString('en-IN')}</div>
            </div>
            <div className="comm-sum-item">
              <div className="lab" style={{ fontWeight: 600 }}>Pending Payout</div>
              <div className="val" style={{ color: '#f57c00', fontWeight: 700 }}>₹{stats.commission.pending.toLocaleString('en-IN')}</div>
            </div>
          </div>
          <div style={{ marginTop: '20px', fontSize: '11px', color: '#888', fontStyle: 'italic' }}>
            * This is a compact summary. Full details are available in the Commission Ledger page.
          </div>
        </div>
      </div>

      <style>{`
        .section-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: -8px;
        }
        .stat-card-compact {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .stat-card-compact .stat-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #666;
        }
        .stat-card-compact .stat-value-sm {
          font-size: 20px;
          font-weight: 700;
          color: #333;
        }
        .reminder-item {
          padding: 12px;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .reminder-item.orange { background: #fff3e0; border-left: 3px solid #ff9800; }
        .reminder-item.yellow { background: #fffde7; border-left: 3px solid #fbc02d; }
        .reminder-item.red { background: #ffebee; border-left: 3px solid #d32f2f; }
        .reminder-item.blue { background: #e3f2fd; border-left: 3px solid #1976d2; }
        .reminder-item .val { font-size: 18px; font-weight: 700; }
        .reminder-item .lab { font-size: 10px; font-weight: 500; color: #555; }
        
        .activity-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .activity-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px;
          border-radius: 8px;
          background: #fff;
          border: 1px solid #eee;
        }
        .activity-icon {
          width: 32px;
          height: 32px;
          background: #e3f2fd;
          color: #1976d2;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .activity-content { flex: 1; }
        .activity-title { font-size: 13px; color: #333; }
        .activity-meta { font-size: 11px; color: #888; margin-top: 2px; }
        .activity-tag {
          font-size: 10px;
          background: #e8f5e9;
          color: #2e7d32;
          padding: 2px 8px;
          border-radius: 4px;
          font-weight: 600;
        }
        .commission-summary-compact {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .comm-sum-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .comm-sum-item .lab { font-size: 12px; color: #555; }
        .comm-sum-item .val { font-size: 14px; font-weight: 600; color: #333; }
      `}</style>
    </div>
  );
}
