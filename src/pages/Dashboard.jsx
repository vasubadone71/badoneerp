import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, Cell, PieChart, Pie 
} from 'recharts';
import api from '../utils/api';
import { 
  ShieldCheck, FileText, Clock, CheckCircle, Calendar, AlertTriangle, 
  RefreshCw, Activity, IndianRupee, User, Zap, TrendingUp, MapPin, 
  Wallet, Hash, ArrowUpRight, ArrowDownRight, Layers
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

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

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

    socket.on('REFRESH_DASHBOARD', () => {
      console.log('Real-time update received, refreshing dashboard...');
      loadDashboardData();
    });
    
    return () => {
      socket.off('REFRESH_DASHBOARD');
    };
  }, []);

  const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(date);
  };

  const renderStatCard = (title, value, subtitle, icon, colorHex, trendStr) => (
    <div className="card" style={{ 
      padding: '24px', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '16px', 
      position: 'relative', 
      overflow: 'hidden',
      border: '1px solid var(--border-color)',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.02)'
    }}>
      <div style={{ 
        position: 'absolute', right: '-20px', top: '-20px', 
        width: '100px', height: '100px', 
        background: `radial-gradient(circle, ${colorHex}20 0%, transparent 70%)`, 
        borderRadius: '50%', zIndex: 0 
      }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600 }}>{title}</div>
        <div style={{ 
          background: `${colorHex}15`, 
          color: colorHex, 
          padding: '10px', 
          borderRadius: '14px',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {icon}
        </div>
      </div>
      <div style={{ zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
          <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1px' }}>{value}</div>
          {trendStr && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 700, color: trendStr.startsWith('+') ? 'var(--success)' : 'var(--danger)' }}>
              {trendStr.startsWith('+') ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {trendStr}
            </div>
          )}
        </div>
        {subtitle && <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' }}>{subtitle}</div>}
      </div>
    </div>
  );

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '32px', paddingBottom: '40px', maxWidth: '1600px', margin: '0 auto', width: '100%' }}>
      
      {/* ─── Header ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>
            Overview
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={14} /> {formatDate(currentTime)}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ background: '#EEF2FF', color: 'var(--primary)', padding: '10px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={16} /> Fast Processing Active
          </div>
        </div>
      </div>

      {/* ─── Top Level KPIs ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
        {renderStatCard('Insurance Pending', stats.insurance.pending, 'Awaiting processing', <Clock size={22} />, '#EAB308', '+12%')}
        {renderStatCard('Insurance Completed', stats.insurance.completed, 'Successfully processed', <ShieldCheck size={22} />, '#10B981', '+5%')}
        {renderStatCard('RTO Pending', stats.rto.pending, 'Awaiting RTO clearance', <AlertTriangle size={22} />, '#F59E0B', '-2%')}
        {renderStatCard('RTO Completed', stats.rto.completed, 'Successfully registered', <FileText size={22} />, '#10B981', '+18%')}
      </div>

      {/* ─── Middle Section (Renewals & Number Plates) ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        
        {/* Number Plates Modernized */}
        <div className="card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '8px', background: '#F8FAFC', borderRadius: '10px' }}>
                <Hash size={18} color="var(--primary)" />
              </div>
              Vehicle Number Plates
            </h3>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600, background: '#F1F5F9', padding: '4px 12px', borderRadius: '20px' }}>Total: {stats.numberPlate?.total || 0}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '24px', gap: '16px', flex: 1, alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--warning)' }} />
              <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{stats.numberPlate?.pending || 0}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>Pending</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--success)' }} />
              <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{stats.numberPlate?.done || 0}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>Order Done</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--danger)' }} />
              <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{stats.numberPlate?.reason || 0}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>Reason</div>
            </div>
          </div>
        </div>

        {/* Renewals Modernized */}
        <div className="card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '8px', background: '#F8FAFC', borderRadius: '10px' }}>
                <Calendar size={18} color="#D97706" />
              </div>
              Renewal Reminders
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '12px', background: 'transparent' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#D97706' }} />
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Expiring in 7 Days</span>
              </div>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#D97706' }}>{stats.renewals.next7}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '12px', background: 'transparent' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#CA8A04' }} />
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Expiring in 30 Days</span>
              </div>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#CA8A04' }}>{stats.renewals.next30}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '12px', background: '#FEF2F2', border: '1px solid #FECACA' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#DC2626' }} />
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#991B1B' }}>Already Expired</span>
              </div>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#DC2626' }}>{stats.renewals.expired}</span>
            </div>
          </div>
        </div>

      </div>

      {/* ─── Charts & Financials ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        
        {/* Chart */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: '#EEF2FF', borderRadius: '10px', color: 'var(--primary)' }}>
              <TrendingUp size={18} />
            </div>
            Monthly Operational Trends
          </h3>
          <div style={{ height: '320px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.monthly_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIns" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRto" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--success)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--success)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} tickMargin={10} stroke="#94A3B8" />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickMargin={10} stroke="#94A3B8" />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)', padding: '12px 16px' }}
                  itemStyle={{ fontSize: '14px', fontWeight: 600 }}
                  labelStyle={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}
                />
                <Area type="monotone" dataKey="insurance" stroke="var(--primary)" fillOpacity={1} fill="url(#colorIns)" strokeWidth={3} activeDot={{ r: 6, strokeWidth: 0 }} name="Insurance" />
                <Area type="monotone" dataKey="rto" stroke="var(--success)" fillOpacity={1} fill="url(#colorRto)" strokeWidth={3} activeDot={{ r: 6, strokeWidth: 0 }} name="RTO" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ledger & Commission */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="card" style={{ padding: '0', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '8px', background: '#F8FAFC', borderRadius: '10px', color: 'var(--text-primary)' }}>
                <Wallet size={18} />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Financial Overview</h3>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', flex: 1, justifyContent: 'center' }}>
              <div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '6px' }}>Total Receivable</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--danger)', letterSpacing: '-0.5px' }}>
                    ₹{ledgerStats.totalReceivable?.toLocaleString('en-IN') || 0}
                  </div>
                  <div style={{ padding: '4px 8px', background: '#FEF2F2', color: 'var(--danger)', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                    Awaiting
                  </div>
                </div>
              </div>
              
              <div style={{ height: '1px', background: 'var(--border-color)', width: '100%' }} />

              <div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '6px' }}>Total Received</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--success)', letterSpacing: '-0.5px' }}>
                    ₹{ledgerStats.totalReceived?.toLocaleString('en-IN') || 0}
                  </div>
                  <div style={{ padding: '4px 8px', background: '#F0FDF4', color: 'var(--success)', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                    Cleared
                  </div>
                </div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px', marginTop: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>Est. Commission</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary)' }}>₹{stats.commission.monthly?.toLocaleString('en-IN') || 0}</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
