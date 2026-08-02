import React, { useState, useEffect, useMemo } from 'react';
import { 
  Download, FileText, Printer, Filter, User, Briefcase, 
  Calendar, CheckCircle, Clock, Search, RotateCcw, 
  Wallet, Shield, TrendingUp, BarChart3, AlertCircle,
  ChevronRight, ArrowUpRight, BadgeInfo
} from 'lucide-react';
import { exportToExcel, exportToPDF, printReport } from '../utils/export';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import api from '../utils/api';

export default function Commission() {
  const [allCommissions, setAllCommissions] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [filters, setFilters] = useState({
    department: '',
    agent: '',
    status: '',
    startDate: '',
    endDate: '',
    search: ''
  });
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [commRes, dealerRes] = await Promise.all([
          api.get('/ledgers/commissions'),
          api.get('/dealers')
        ]);
        setAllCommissions(commRes.data || []);
        setDealers(dealerRes.data || []);
      } catch (err) {
        console.error("Failed to load commissions:", err);
      }
    }
    loadData();
  }, []);

  const filteredCommissions = useMemo(() => {
    return allCommissions.filter(item => {
      const isMainDealer = item.dealer_name === 'MY SHIVA HONDA BIAORA' || item.dealer_type === 'Main Dealer';
      if (!isMainDealer) return false;

      if (filters.department && item.department_type !== filters.department) return false;
      if (filters.agent && item.assigned_agent !== filters.agent) return false;
      if (filters.status && item.status !== filters.status) return false;
      if (filters.startDate && filters.endDate) {
        const itemDate = parseISO(item.invoice_date);
        const start = parseISO(filters.startDate);
        const end = parseISO(filters.endDate);
        if (!isWithinInterval(itemDate, { start, end })) return false;
      }
      if (filters.search) {
        const s = filters.search.toLowerCase();
        return (
          (item.customer_name?.toLowerCase().includes(s)) ||
          (item.invoice_no?.toLowerCase().includes(s)) ||
          (item.frame_no?.toLowerCase().includes(s))
        );
      }
      return true;
    });
  }, [allCommissions, filters]);

  const insuranceCommissions = filteredCommissions.filter(c => c.department_type === 'Insurance');
  const rtoCommissions = filteredCommissions.filter(c => c.department_type === 'RTO');

  const calculateStats = (data) => {
    const total = data.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const paid = data.filter(i => i.status === 'Completed').reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const pending = total - paid;
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    const monthly = data.filter(item => {
      const d = parseISO(item.invoice_date);
      return isWithinInterval(d, { start, end });
    }).reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

    return { total, paid, pending, count: data.length, monthly };
  };

  const insStats = calculateStats(insuranceCommissions);
  const rtoStats = calculateStats(rtoCommissions);

  const handleExport = (type, dept, data) => {
    const fileName = `${dept}_Commission_Ledger`;
    const title = `${dept.toUpperCase()} COMMISSION LEDGER - ${dept === 'Insurance' ? 'TEERTH BADONE' : 'VASU BADONE'}`;
    const headers = ['S. No.', 'Invoice Date', 'Invoice No', 'Customer Name', 'Dealer Name', 'Dealer Type', 'Amount', 'Status', 'Notes'];
    
    const exportData = data.map((row, idx) => ({
      'S. No.': idx + 1,
      'Invoice Date': row.invoice_date,
      'Invoice No': row.invoice_no,
      'Customer Name': row.customer_name,
      'Dealer Type': row.dealer_type,
      'Amount': `₹${(parseFloat(row.amount) || 0).toLocaleString('en-IN')}`,
      'Status': row.status,
      'Notes': row.notes || ''
    }));

    if (type === 'excel') exportToExcel(fileName, exportData);
    else if (type === 'pdf') exportToPDF(title, headers, exportData, fileName);
    else if (type === 'print') printReport(title, headers, exportData);
  };

  const resetFilters = () => {
    setFilters({ department: '', agent: '', status: '', startDate: '', endDate: '', search: '' });
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      // In the new backend, sync is handled automatically during updates, 
      // but we fetch the latest data just to refresh the view.
      const { data } = await api.get('/ledgers/commissions');
      setAllCommissions(data || []);
    } catch (err) {
      console.error("Failed to sync:", err);
    }
    setIsSyncing(false);
  };

  const StatCard = ({ label, value, icon: Icon, color, bg }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--card-bg)', borderRadius: '12px', padding: '16px 20px', border: '1px solid var(--border-color)', flex: 1, minWidth: '200px' }}>
      <div style={{ background: bg, color: color, width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={20} />
      </div>
      <div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
          {typeof value === 'number' && label !== 'Total Entries' ? `₹${value.toLocaleString('en-IN')}` : value}
        </div>
      </div>
    </div>
  );

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 'calc(100vh - 100px)', paddingBottom: '40px' }}>
      {/* ─── Filter Section ─── */}
      <div className="card" style={{ marginBottom: '24px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', backgroundColor: '#F3E8FF', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9333EA', border: '1px solid #E9D5FF' }}>
              <Filter size={24} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Commission Ledger Hub</h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>Refine your view across departments and periods</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn" style={{ backgroundColor: '#F8FAFC', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, borderRadius: '8px' }} onClick={handleSync} disabled={isSyncing}>
              <RotateCcw size={16} className={isSyncing ? 'spinning' : ''} /> {isSyncing ? 'Syncing...' : 'Sync Data'}
            </button>
            <button className="btn" style={{ backgroundColor: '#FEF2F2', color: 'var(--danger)', border: '1px solid #FECACA', padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, borderRadius: '8px' }} onClick={resetFilters}>
              <RotateCcw size={16} /> Reset
            </button>
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><Briefcase size={14} /> Department</label>
            <select className="form-control" style={{ borderRadius: '8px', padding: '10px' }} value={filters.department} onChange={e => setFilters({...filters, department: e.target.value})}>
              <option value="">All Categories</option>
              <option value="Insurance">Insurance Dept</option>
              <option value="RTO">RTO Dept</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><User size={14} /> Agent</label>
            <select className="form-control" style={{ borderRadius: '8px', padding: '10px' }} value={filters.agent} onChange={e => setFilters({...filters, agent: e.target.value})}>
              <option value="">All Agents</option>
              <option value="TEERTH BADONE">Teerth Badone</option>
              <option value="VASU BADONE">Vasu Badone</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14} /> Date Range</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="date" className="form-control" style={{ borderRadius: '8px', padding: '10px', flex: 1 }} value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} />
              <ChevronRight size={16} color="#94A3B8" />
              <input type="date" className="form-control" style={{ borderRadius: '8px', padding: '10px', flex: 1 }} value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><Search size={14} /> Universal Search</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input 
                type="text" 
                className="form-control"
                placeholder="Find customer, invoice or frame number..." 
                value={filters.search} 
                onChange={e => setFilters({...filters, search: e.target.value})} 
                style={{ paddingLeft: '40px', borderRadius: '8px', padding: '10px 10px 10px 36px', width: '100%' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Render Sections ─── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {[
          { title: 'Insurance Commission Ledger', agent: 'TEERTH BADONE', color: '#3B82F6', stats: insStats, data: insuranceCommissions, type: 'Insurance', bgLight: '#EFF6FF', bgBorder: '#BFDBFE' },
          { title: 'RTO Commission Ledger', agent: 'VASU BADONE', color: '#10B981', stats: rtoStats, data: rtoCommissions, type: 'RTO', bgLight: '#ECFDF5', bgBorder: '#A7F3D0' }
        ].map((section, sIdx) => (
          <div key={sIdx} className="card" style={{ padding: '24px', borderTop: `4px solid ${section.color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>{section.title}</h2>
                <div style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px', background: section.bgLight, padding: '4px 10px', borderRadius: '6px', fontSize: '11px', color: section.color, border: `1px solid ${section.bgBorder}` }}>
                  <User size={12} /> Assigned Agent: <span style={{ fontWeight: 800 }}>{section.agent}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn" style={{ padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', background: '#F0FDF4', color: 'var(--success)', border: '1px solid #BBF7D0' }} onClick={() => handleExport('excel', section.type, section.data)}>
                  <Download size={14} /> Excel
                </button>
                <button className="btn" style={{ padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', background: '#FEF2F2', color: 'var(--danger)', border: '1px solid #FECACA' }} onClick={() => handleExport('pdf', section.type, section.data)}>
                  <FileText size={14} /> PDF
                </button>
                <button className="btn" style={{ padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', background: '#F8FAFC', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} onClick={() => handleExport('print', section.type, section.data)}>
                  <Printer size={14} /> Print
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
              <StatCard label="Total Commission" value={section.stats.total} icon={Wallet} color={section.color} bg={section.bgLight} />
              <StatCard label="Paid Amount" value={section.stats.paid} icon={CheckCircle} color="var(--success)" bg="#F0FDF4" />
              <StatCard label="Pending Balance" value={section.stats.pending} icon={Clock} color="var(--warning)" bg="#FFF7ED" />
              <StatCard label="Current Month" value={section.stats.monthly} icon={TrendingUp} color="#8B5CF6" bg="#F5F3FF" />
              <StatCard label="Total Entries" value={section.stats.count} icon={BarChart3} color="#64748B" bg="#F1F5F9" />
            </div>

            <div className="table-responsive" style={{ border: '1px solid var(--border-color)', borderRadius: '12px' }}>
              <table className="table table-saas" style={{ margin: 0 }}>
                <thead style={{ background: '#F8FAFC' }}>
                  <tr>
                    <th style={{ width: '60px' }}>S.NO.</th>
                    <th>DATE</th>
                    <th>INVOICE DETAILS</th>
                    <th>CUSTOMER INFO</th>
                    <th>DEALER SOURCE</th>
                    <th style={{ textAlign: 'right' }}>AMOUNT</th>
                    <th>STATUS</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>NOTES</th>
                  </tr>
                </thead>
                <tbody>
                  {section.data.map((comm, idx) => (
                    <tr key={idx}>
                      <td style={{ color: '#94A3B8', fontWeight: 600 }}>{idx + 1}</td>
                      <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{comm.invoice_date}</td>
                      <td>
                        <span style={{ fontFamily: 'monospace', background: '#F1F5F9', padding: '4px 8px', borderRadius: '6px', fontWeight: 600, fontSize: '12px' }}>{comm.invoice_no}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>{comm.customer_name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Frame: {comm.frame_no}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>{comm.dealer_name}</div>
                        <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, textTransform: 'uppercase', marginTop: '4px', display: 'inline-block', background: comm.dealer_type === "Main Dealer" ? '#EFF6FF' : '#F8FAFC', color: comm.dealer_type === "Main Dealer" ? '#3B82F6' : '#64748B', border: comm.dealer_type !== "Main Dealer" ? '1px solid #E2E8F0' : 'none' }}>
                          {comm.dealer_type}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                        ₹{(parseFloat(comm.amount) || 0).toLocaleString("en-IN")}
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: comm.status === 'Completed' ? '#DCFCE7' : '#FFEDD5', color: comm.status === 'Completed' ? '#16A34A' : '#EA580C' }}>
                          {comm.status === 'Completed' ? <CheckCircle size={12} /> : <Clock size={12} />}
                          {comm.status === 'Completed' ? 'Released' : 'Locked'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {comm.notes ? (
                          <div title={comm.notes} style={{ color: '#94A3B8', cursor: 'help' }}>
                            <BadgeInfo size={18} />
                          </div>
                        ) : <span style={{ color: '#CBD5E1' }}>-</span>}
                      </td>
                    </tr>
                  ))}
                  {section.data.length === 0 && (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '60px', color: '#94A3B8' }}>
                        <AlertCircle size={32} style={{ opacity: 0.2, marginBottom: '12px' }} />
                        <div>No records found for the selected filters.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
