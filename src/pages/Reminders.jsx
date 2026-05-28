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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '45px', height: '45px', backgroundColor: 'rgba(211, 47, 47, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--honda-red)' }}>
              <Bell size={24} />
            </div>
            <div>
              <h2 style={{ margin: 0 }}>Renewal Reminders</h2>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>Track policies expiring soon or already expired</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn" style={{ backgroundColor: '#2e7d32', color: 'white' }} onClick={() => handleExport('excel')}><Download size={16} /> Excel</button>
            <button className="btn" style={{ backgroundColor: '#d32f2f', color: 'white' }} onClick={() => handleExport('pdf')}><FileText size={16} /> PDF</button>
            <button className="btn" style={{ backgroundColor: '#455a64', color: 'white' }} onClick={() => handleExport('print')}><Printer size={16} /> Print</button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className={`btn ${filterType === 'all' ? 'btn-primary' : ''}`} style={{ border: '1px solid #ddd' }} onClick={() => setFilterType('all')}>All Alerts</button>
            <button className={`btn ${filterType === 'expired' ? 'btn-primary' : ''}`} style={{ border: '1px solid #ddd', backgroundColor: filterType === 'expired' ? 'var(--danger)' : '' }} onClick={() => setFilterType('expired')}>Expired</button>
            <button className={`btn ${filterType === 'expiring_soon' ? 'btn-primary' : ''}`} style={{ border: '1px solid #ddd', backgroundColor: filterType === 'expiring_soon' ? '#1976d2' : '' }} onClick={() => setFilterType('expiring_soon')}>Expiring Soon</button>
          </div>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} size={18} />
            <input type="text" className="form-control" placeholder="Search customer / policy..." style={{ paddingLeft: '40px', width: '300px' }} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>S. NO.</th>
                <th>CUSTOMER NAME</th>
                <th>POLICY NO</th>
                <th>EXPIRY DATE</th>
                <th>REMAINING DAYS</th>
                <th>LOCATION</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredReminders.map((row, idx) => {
                const status = getExpiryStatus(row.policy_expiry_date);
                const isExpired = new Date(row.policy_expiry_date) < new Date();
                
                return (
                  <tr key={row.id}>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{idx + 1}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{row.customer_name}</div>
                      <div style={{ fontSize: '12px', color: '#777' }}>Mob: {row.mobile_number}</div>
                    </td>
                    <td style={{ fontSize: '13px' }}>{row.policy_no}</td>
                    <td style={{ fontWeight: 500 }}>{row.policy_expiry_date}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: status.color, fontWeight: 600 }}>
                        {isExpired ? <AlertTriangle size={14} /> : <Clock size={14} />}
                        {status.text}
                      </div>
                    </td>
                    <td style={{ fontSize: '13px' }}>{row.dealer_name}</td>
                    <td>
                      <a href={`tel:${row.mobile_number}`} className="btn" style={{ padding: '6px 12px', backgroundColor: '#e8f5e9', color: '#2e7d32', border: '1px solid #2e7d32', fontSize: '12px', textDecoration: 'none', display: 'inline-block' }}>
                        Call Customer
                      </a>
                    </td>
                  </tr>
                );
              })}
              {filteredReminders.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                    <Bell size={40} style={{ opacity: 0.2, marginBottom: '10px' }} /><br />
                    No renewal reminders found.
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
