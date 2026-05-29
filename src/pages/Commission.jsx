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
    <div className="stat-card-premium" style={{ background: bg, borderLeft: `4px solid ${color}` }}>
      <div className="stat-icon" style={{ background: color + '15', color: color }}>
        <Icon size={20} />
      </div>
      <div className="stat-info">
        <span className="stat-label">{label}</span>
        <span className="stat-value">₹{value.toLocaleString('en-IN')}</span>
      </div>
    </div>
  );

  return (
    <div className="commission-page-container">
      {/* ADVANCED FILTER SECTION */}
      <div className="filter-section-premium">
        <div className="section-header">
          <div className="title-block">
            <div className="icon-circle"><Filter size={20} /></div>
            <div>
              <h3>Commission Filter Hub</h3>
              <p>Refine your view across departments and periods</p>
            </div>
          </div>
          <div className="header-actions">
            <button className={`btn-sync ${isSyncing ? 'spinning' : ''}`} onClick={handleSync}>
              <RotateCcw size={16} /> {isSyncing ? 'Syncing...' : 'Sync Data'}
            </button>
            <button className="btn-reset" onClick={resetFilters}>
              <RotateCcw size={16} /> Reset
            </button>
          </div>
        </div>
        
        <div className="filter-grid-premium">
          <div className="f-group">
            <label><Briefcase size={12} /> Department</label>
            <select value={filters.department} onChange={e => setFilters({...filters, department: e.target.value})}>
              <option value="">All Categories</option>
              <option value="Insurance">Insurance Dept</option>
              <option value="RTO">RTO Dept</option>
            </select>
          </div>
          <div className="f-group">
            <label><User size={12} /> Agent</label>
            <select value={filters.agent} onChange={e => setFilters({...filters, agent: e.target.value})}>
              <option value="">All Agents</option>
              <option value="TEERTH BADONE">Teerth Badone</option>
              <option value="VASU BADONE">Vasu Badone</option>
            </select>
          </div>
          <div className="f-group">
            <label><Calendar size={12} /> Date Range</label>
            <div className="date-range-row">
              <input type="date" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} />
              <ChevronRight size={14} color="#ccc" />
              <input type="date" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} />
            </div>
          </div>
          <div className="f-group search-span">
            <label><Search size={12} /> Universal Search</label>
            <div className="search-box">
              <Search size={16} className="s-icon" />
              <input 
                type="text" 
                placeholder="Find customer, invoice or frame number..." 
                value={filters.search} 
                onChange={e => setFilters({...filters, search: e.target.value})} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* RENDER SECTIONS */}
      {[
        { title: 'Insurance Commission Ledger', agent: 'TEERTH BADONE', color: '#1a73e8', stats: insStats, data: insuranceCommissions, type: 'Insurance' },
        { title: 'RTO Commission Ledger', agent: 'VASU BADONE', color: '#27ae60', stats: rtoStats, data: rtoCommissions, type: 'RTO' }
      ].map((section, sIdx) => (
        <div key={sIdx} className="ledger-block-premium" style={{ borderTop: `5px solid ${section.color}` }}>
          <div className="ledger-header">
            <div className="ledger-title-info">
              <h2>{section.title}</h2>
              <div className="agent-badge">
                <User size={12} /> Assigned Agent: <span>{section.agent}</span>
              </div>
            </div>
            <div className="export-btns-group">
              <button className="btn-exp ex" onClick={() => handleExport('excel', section.type, section.data)}>
                <Download size={14} /> Excel
              </button>
              <button className="btn-exp pd" onClick={() => handleExport('pdf', section.type, section.data)}>
                <FileText size={14} /> PDF
              </button>
              <button className="btn-exp pr" onClick={() => handleExport('print', section.type, section.data)}>
                <Printer size={14} /> Print
              </button>
            </div>
          </div>

          <div className="stats-dashboard-premium">
            <StatCard label="Total Commission" value={section.stats.total} icon={Wallet} color={section.color} bg="#fff" />
            <StatCard label="Paid Amount" value={section.stats.paid} icon={CheckCircle} color="#2e7d32" bg="#fff" />
            <StatCard label="Pending Balance" value={section.stats.pending} icon={Clock} color="#e67e22" bg="#fff" />
            <StatCard label="Current Month" value={section.stats.monthly} icon={TrendingUp} color="#9b59b6" bg="#fff" />
            <div className="stat-card-premium mini">
              <div className="stat-icon gray"><BarChart3 size={18} /></div>
              <div className="stat-info">
                <span className="stat-label">Total Entries</span>
                <span className="stat-value dark">{section.stats.count}</span>
              </div>
            </div>
          </div>

          <div className="ledger-table-container">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>S.No.</th>
                  <th>Date</th>
                  <th>Invoice Details</th>
                  <th>Customer Information</th>
                  <th>Dealer Source</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {section.data.map((comm, idx) => (
                  <tr key={idx}>
                    <td className="idx-cell">{idx + 1}</td>
                    <td className="date-cell">{comm.invoice_date}</td>
                    <td className="inv-cell">
                      <span className="inv-no">{comm.invoice_no}</span>
                    </td>
                    <td className="cust-cell">
                      <div className="c-name">{comm.customer_name}</div>
                      <div className="c-meta">Frame: {comm.frame_no}</div>
                    </td>
                    <td className="dealer-cell">
                      <div className="d-name">{comm.dealer_name}</div>
                      <span className={`d-type ${comm.dealer_type === "Main Dealer" ? 'main' : 'point'}`}>
                        {comm.dealer_type}
                      </span>
                    </td>
                    <td className="amt-cell">
                      <div className="price">₹{(parseFloat(comm.amount) || 0).toLocaleString("en-IN")}</div>
                    </td>
                    <td className="status-cell">
                      <span className={`status-pill ${comm.status === 'Completed' ? 'released' : 'locked'}`}>
                        {comm.status === 'Completed' ? <CheckCircle size={10} /> : <Clock size={10} />}
                        {comm.status === 'Completed' ? 'Released' : 'Locked'}
                      </span>
                    </td>
                    <td className="note-cell">
                      {comm.notes ? (
                        <div className="note-trigger" title={comm.notes}>
                          <BadgeInfo size={16} />
                        </div>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {section.data.length === 0 && (
              <div className="empty-ledger-state">
                <AlertCircle size={32} />
                <p>No records found for the selected filters.</p>
              </div>
            )}
          </div>
        </div>
      ))}

      <style dangerouslySetInnerHTML={{ __html: `
        .commission-page-container {
          padding: 10px;
          background: #f8faff;
        }

        .filter-section-premium {
          background: white;
          padding: 24px;
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.03);
          margin-bottom: 30px;
          border: 1px solid #edf2f7;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
          padding-bottom: 15px;
          border-bottom: 1px solid #f1f4f8;
        }

        .title-block { display: flex; gap: 15px; align-items: center; }
        .icon-circle {
          width: 42px; height: 42px;
          background: #fdf2f2;
          color: var(--honda-red);
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
        }
        .title-block h3 { margin: 0; font-size: 18px; color: #1a202c; }
        .title-block p { margin: 2px 0 0; font-size: 12px; color: #718096; }

        .header-actions { display: flex; gap: 12px; }
        .btn-sync, .btn-reset {
          padding: 8px 16px; border-radius: 10px; font-size: 13px; font-weight: 600;
          display: flex; align-items: center; gap: 8px; cursor: pointer; transition: all 0.2s;
          border: none;
        }
        .btn-sync { background: #1a73e8; color: white; }
        .btn-sync:hover { background: #1557b0; }
        .btn-reset { background: #f1f4f8; color: #4a5568; }
        .btn-reset:hover { background: #e2e8f0; }

        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .filter-grid-premium {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        .search-span { grid-column: span 3; }

        .f-group { display: flex; flex-direction: column; gap: 8px; }
        .f-group label { font-size: 11px; font-weight: 700; color: #4a5568; text-transform: uppercase; display: flex; align-items: center; gap: 6px; }
        .f-group select, .f-group input {
          background: #f8fafc;
          border: 1.5px solid #edf2f7;
          padding: 10px 12px;
          border-radius: 10px;
          font-size: 14px;
          color: #2d3748;
          outline: none;
          transition: all 0.2s;
        }
        .f-group select:focus, .f-group input:focus { border-color: #1a73e8; background: white; box-shadow: 0 0 0 3px rgba(26,115,232,0.1); }

        .date-range-row { display: flex; align-items: center; gap: 8px; }
        .date-range-row input { flex: 1; }

        .search-box { position: relative; display: flex; align-items: center; }
        .search-box .s-icon { position: absolute; left: 12px; color: #a0aec0; }
        .search-box input { width: 100%; padding-left: 38px !important; }

        /* LEDGER BLOCK */
        .ledger-block-premium {
          background: white;
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 30px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.02);
          border: 1px solid #edf2f7;
        }

        .ledger-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 25px;
        }
        .ledger-title-info h2 { margin: 0; font-size: 20px; color: #1a202c; font-weight: 800; }
        .agent-badge {
          margin-top: 8px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #f1f4f8;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 11px;
          color: #4a5568;
        }
        .agent-badge span { font-weight: 800; color: #1a202c; }

        .export-btns-group { display: flex; gap: 8px; }
        .btn-exp {
          padding: 7px 12px; border-radius: 8px; font-size: 12px; font-weight: 700;
          display: flex; align-items: center; gap: 6px; cursor: pointer; transition: all 0.2s;
          border: 1px solid #edf2f7;
        }
        .btn-exp.ex { background: #e8f5e9; color: #2e7d32; border-color: #c8e6c9; }
        .btn-exp.pd { background: #fdf2f2; color: #d32f2f; border-color: #ffcdd2; }
        .btn-exp.pr { background: #e3f2fd; color: #1565c0; border-color: #bbdefb; }
        .btn-exp:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }

        /* STATS DASHBOARD */
        .stats-dashboard-premium {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 30px;
        }
        .stat-card-premium {
          padding: 16px;
          border-radius: 16px;
          background: white;
          border: 1px solid #f1f4f8;
          display: flex;
          align-items: center;
          gap: 15px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.01);
        }
        .stat-icon {
          width: 44px; height: 44px;
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
        }
        .stat-info { display: flex; flex-direction: column; }
        .stat-label { font-size: 11px; font-weight: 700; color: #718096; text-transform: uppercase; }
        .stat-value { font-size: 18px; font-weight: 800; color: #1a202c; margin-top: 2px; }
        
        .mini { background: #f8fafc !important; border: none !important; }
        .stat-icon.gray { background: #edf2f7; color: #4a5568; }

        /* TABLE */
        .ledger-table-container {
          overflow-x: auto;
          border-radius: 12px;
          border: 1px solid #f1f4f8;
        }
        .premium-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }
        .premium-table thead th {
          background: #f8fafc;
          padding: 12px 15px;
          text-align: left;
          font-weight: 700;
          color: #4a5568;
          font-size: 12px;
          text-transform: uppercase;
          border-bottom: 2px solid #edf2f7;
          position: sticky; top: 0;
        }
        .premium-table tbody tr { border-bottom: 1px solid #f1f4f8; transition: all 0.2s; }
        .premium-table tbody tr:hover { background: #fcfdfe; }
        .premium-table td { padding: 12px 15px; vertical-align: middle; }

        .idx-cell { font-weight: 700; color: #cbd5e0; }
        .date-cell { font-weight: 600; color: #4a5568; white-space: nowrap; }
        .inv-no { font-family: monospace; font-weight: 700; background: #f1f4f8; padding: 2px 6px; border-radius: 4px; }
        
        .c-name { font-weight: 800; color: #1a202c; }
        .c-meta { font-size: 10px; color: #a0aec0; margin-top: 2px; }

        .d-name { font-weight: 600; color: #4a5568; font-size: 13px; }
        .d-type { font-size: 9px; padding: 2px 6px; border-radius: 4px; font-weight: 800; text-transform: uppercase; margin-top: 4px; display: inline-block; }
        .d-type.main { background: #ebf8ff; color: #2b6cb0; }
        .d-type.point { background: #f7fafc; color: #4a5568; border: 1px solid #edf2f7; }

        .price { font-weight: 900; font-size: 15px; color: #2d3748; }

        .status-pill {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 800;
        }
        .status-pill.released { background: #e6f6ec; color: #22c55e; }
        .status-pill.locked { background: #fff7ed; color: #f97316; }

        .note-trigger { color: #a0aec0; cursor: help; }
        .note-trigger:hover { color: #1a73e8; }

        .empty-ledger-state {
          padding: 60px; text-align: center; color: #a0aec0;
          display: flex; flex-direction: column; align-items: center; gap: 15px;
        }
      `}} />
    </div>
  );
}
