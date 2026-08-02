import React, { useState, useEffect } from 'react';
import { Search, Calendar, Bell, Download, FileText, Printer, AlertTriangle, Clock } from 'lucide-react';
import { exportToExcel, exportToPDF, printReport } from '../utils/export';
import api from '../utils/api';

export default function Reminders() {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'expired', 'expiring_soon'

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data } = await api.get('/insurance');
      setData(data || []);
    } catch (err) {
      console.error("Failed to load reminders data:", err);
    }
  };

  const getReminders = () => {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    return data.filter(item => {
      if (!item.policy_expiry_date) return false;
      const expiryDate = new Date(item.policy_expiry_date);
      
      const isExpired = expiryDate < today;
      const isExpiringSoon = expiryDate >= today && expiryDate <= thirtyDaysFromNow;

      if (filterType === 'expired') return isExpired;
      if (filterType === 'expiring_soon') return isExpiringSoon;
      return isExpired || isExpiringSoon;
    });
  };

  const filteredReminders = getReminders().filter(item => 
    item.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    item.policy_no?.toLowerCase().includes(search.toLowerCase()) ||
    item.invoice_no?.toLowerCase().includes(search.toLowerCase())
  );

  const getExportData = () => {
    return filteredReminders.map((row, index) => ({
      'S. No.': index + 1,
      'Customer Name': row.customer_name,
      'Mobile': row.mobile_number,
      'Policy No': row.policy_no,
      'Expiry Date': row.policy_expiry_date,
      'Days Status': getExpiryStatus(row.policy_expiry_date).text,
      'Location': row.dealer_name,
      'Invoice No': row.invoice_no
    }));
  };

  const getExpiryStatus = (dateStr) => {
    if (!dateStr) return { text: 'N/A', color: '#666' };
    const today = new Date();
    const expiry = new Date(dateStr);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: `Expired (${Math.abs(diffDays)} days ago)`, color: 'var(--danger)' };
    if (diffDays === 0) return { text: 'Expiring Today', color: '#f57c00' };
    return { text: `Expiring in ${diffDays} days`, color: '#1976d2' };
  };

  const handleExport = (format) => {
    const exportData = getExportData();
    if (!exportData || exportData.length === 0) {
      alert("No data available to export. Please adjust your filters.");
      return;
    }
    const headers = Object.keys(exportData[0]);
    const title = "INSURANCE RENEWAL REMINDERS";

    try {
      if (format === 'excel') exportToExcel('Renewal_Reminders', exportData);
      else if (format === 'pdf') exportToPDF(title, headers, exportData, 'Reminders');
      else if (format === 'print') printReport(title, headers, exportData);
    } catch (error) {
      console.error("Export Error:", error);
      alert("An error occurred during export. Please check the console for details.");
    }
  };

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 'calc(100vh - 100px)', paddingBottom: '40px' }}>
      
      {/* ─── Header Card ─── */}
      <div className="card" style={{ marginBottom: '24px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', backgroundColor: '#FEF2F2', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)', border: '1px solid #FECACA' }}>
              <Bell size={24} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Renewal Reminders</h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>Track policies expiring soon or already expired</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn" style={{ backgroundColor: '#F0FDF4', color: 'var(--success)', border: '1px solid #BBF7D0', padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => handleExport('excel')}>
              <Download size={16} /> Excel
            </button>
            <button className="btn" style={{ backgroundColor: '#FEF2F2', color: 'var(--danger)', border: '1px solid #FECACA', padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => handleExport('pdf')}>
              <FileText size={16} /> PDF
            </button>
            <button className="btn" style={{ backgroundColor: '#F8FAFC', color: '#475569', border: '1px solid var(--border-color)', padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => handleExport('print')}>
              <Printer size={16} /> Print
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '8px', background: '#F8FAFC', padding: '6px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <button className="btn" style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '8px', fontWeight: 600, background: filterType === 'all' ? '#fff' : 'transparent', color: filterType === 'all' ? 'var(--text-primary)' : 'var(--text-secondary)', boxShadow: filterType === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', border: 'none' }} onClick={() => setFilterType('all')}>
              All Alerts
            </button>
            <button className="btn" style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '8px', fontWeight: 600, background: filterType === 'expired' ? '#FEF2F2' : 'transparent', color: filterType === 'expired' ? 'var(--danger)' : 'var(--text-secondary)', boxShadow: filterType === 'expired' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none', border: 'none' }} onClick={() => setFilterType('expired')}>
              <AlertTriangle size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} /> Expired
            </button>
            <button className="btn" style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '8px', fontWeight: 600, background: filterType === 'expiring_soon' ? '#EFF6FF' : 'transparent', color: filterType === 'expiring_soon' ? '#2563EB' : 'var(--text-secondary)', boxShadow: filterType === 'expiring_soon' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none', border: 'none' }} onClick={() => setFilterType('expiring_soon')}>
              <Clock size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} /> Expiring Soon
            </button>
          </div>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px', maxWidth: '400px' }}>
            <Search style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} size={16} />
            <input type="text" className="form-control" placeholder="Search customer or policy..." style={{ paddingLeft: '40px', width: '100%', fontSize: '13px', borderRadius: '12px' }} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive" style={{ flex: 1, overflowY: 'auto' }}>
          <table className="table table-saas" style={{ margin: 0 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 3 }}>
              <tr>
                <th style={{ width: '60px', textAlign: 'center' }}>S. NO.</th>
                <th>CUSTOMER NAME</th>
                <th>POLICY NO</th>
                <th>EXPIRY DATE</th>
                <th>REMAINING DAYS</th>
                <th>LOCATION</th>
                <th style={{ width: '140px', textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredReminders.map((row, idx) => {
                const status = getExpiryStatus(row.policy_expiry_date);
                const isExpired = new Date(row.policy_expiry_date) < new Date();
                
                return (
                  <tr key={row.id}>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: '#94A3B8' }}>{idx + 1}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.customer_name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Mob: {row.mobile_number}</div>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', background: '#F8FAFC', padding: '4px 8px', borderRadius: '6px', border: '1px solid #E2E8F0', fontWeight: 600 }}>{row.policy_no}</span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{row.policy_expiry_date}</td>
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: status.color, fontWeight: 600, padding: '6px 12px', background: `${status.color}15`, borderRadius: '20px', fontSize: '12px' }}>
                        {isExpired ? <AlertTriangle size={14} /> : <Clock size={14} />}
                        {status.text}
                      </div>
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{row.dealer_name}</td>
                    <td style={{ textAlign: 'right' }}>
                      <a href={`tel:${row.mobile_number}`} className="btn" style={{ padding: '8px 16px', backgroundColor: '#F0FDF4', color: 'var(--success)', border: '1px solid #BBF7D0', fontSize: '13px', fontWeight: 600, textDecoration: 'none', display: 'inline-block', borderRadius: '8px' }}>
                        Call Customer
                      </a>
                    </td>
                  </tr>
                );
              })}
              {filteredReminders.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '60px', color: '#94A3B8' }}>
                    <Bell size={48} style={{ opacity: 0.2, marginBottom: '16px' }} /><br />
                    <div>No renewal reminders found.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
