import React, { useState, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText, Filter, Printer, Search } from 'lucide-react';
import { exportToExcel, exportToPDF, printReport } from '../utils/export';
import api from '../utils/api';

export default function Reports() {
  const [data, setData] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [filters, setFilters] = useState({
    dealerId: '',
    startDate: '',
    endDate: '',
    status: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [mgmtRes, dlsRes] = await Promise.all([
        api.get('/master'),
        api.get('/dealers')
      ]);
      setData(mgmtRes.data || []);
      setDealers(dlsRes.data || []);
    } catch (err) {
      console.error("Failed to load reports data:", err);
    }
  };

  const getFilteredData = () => {
    let filtered = [...data];
    if (filters.dealerId) filtered = filtered.filter(d => d.location_id == filters.dealerId);
    if (filters.startDate) filtered = filtered.filter(d => d.invoice_date >= filters.startDate);
    if (filters.endDate) filtered = filtered.filter(d => d.invoice_date <= filters.endDate);
    return filtered;
  };

  const getExportData = (type) => {
    const rawData = getFilteredData();
    return rawData.map((d, index) => {
      const base = {
        'S. No.': index + 1,
        'Location': d.dealer_name,
        'Invoice No': d.invoice_no,
        'Invoice Date': d.invoice_date,
        'Customer Name': d.customer_name,
        'Mobile': d.mobile_number,
        'Vehicle Model': d.vehicle_model,
        'Frame No': d.frame_no,
        'Insurance Status': d.insurance_status,
        'RTO Status': d.rto_status
      };

      if (type === 'Insurance') {
        return {
          ...base,
          'Insurance Company': d.insurance_company || '---',
          'Policy No': d.policy_no || '---',
          'Insurance (PL)': d.insurance_price_list || 0,
          'Insurance (Actual)': d.insurance_actual_deducted || 0,
          'Insurance Difference': d.insurance_difference || 0
        };
      } else if (type === 'RTO') {
        return {
          ...base,
          'Reg No': d.registration_no || '---',
          'RTO (PL)': d.rto_price_list || 0,
          'RTO (Actual)': d.rto_actual_deducted || 0,
          'RTO Difference': d.rto_difference || 0
        };
      }
      return {
        ...base,
        'Insurance Company': d.insurance_company || '---',
        'Total Difference': (d.insurance_difference || 0) + (d.rto_difference || 0)
      };
    });
  };

  const handleExport = (type, format) => {
    const exportData = getExportData(type);
    if (exportData.length === 0) {
      alert("No data found for selected filters.");
      return;
    }

    const title = `${type.toUpperCase()} DEPARTMENT REPORT`;
    const fileName = `${type}_Report`;
    const headers = Object.keys(exportData[0]);

    if (format === 'excel') exportToExcel(fileName, exportData);
    else if (format === 'pdf') exportToPDF(title, headers, exportData, fileName);
    else if (format === 'print') printReport(title, headers, exportData);
  };

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 'calc(100vh - 100px)', paddingBottom: '40px' }}>
      
      {/* ─── Header ─── */}
      <div className="card" style={{ marginBottom: '24px', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <div style={{ width: '48px', height: '48px', backgroundColor: '#EEF2FF', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', border: '1px solid #E0E7FF' }}>
            <FileSpreadsheet size={24} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Reports & Analytics Export</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>Generate and download comprehensive data reports</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>Filter by Dealer</label>
            <select className="form-control" style={{ borderRadius: '8px', padding: '10px', width: '100%' }} value={filters.dealerId} onChange={(e) => setFilters({ ...filters, dealerId: e.target.value })}>
              <option value="">All Dealers</option>
              {dealers.map(d => <option key={d.id} value={d.id}>{d.dealer_name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>Start Date</label>
            <input type="date" className="form-control" style={{ borderRadius: '8px', padding: '10px', width: '100%' }} value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>End Date</label>
            <input type="date" className="form-control" style={{ borderRadius: '8px', padding: '10px', width: '100%' }} value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} />
          </div>
        </div>
      </div>

      {/* ─── Export Blocks ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        {[
          { title: 'Insurance Reports', type: 'Insurance', color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE' },
          { title: 'RTO Reports', type: 'RTO', color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0' },
          { title: 'Master Combined', type: 'Master', color: '#8B5CF6', bg: '#F5F3FF', border: '#DDD6FE' }
        ].map((block, idx) => (
          <div key={idx} className="card" style={{ padding: '24px', borderTop: `4px solid ${block.color}`, background: block.bg, borderLeft: `1px solid ${block.border}`, borderRight: `1px solid ${block.border}`, borderBottom: `1px solid ${block.border}` }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{block.title}</h4>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn" style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'white', color: '#16A34A', border: '1px solid #BBF7D0' }} onClick={() => handleExport(block.type, 'excel')}>
                <Download size={16} /> Excel
              </button>
              <button className="btn" style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'white', color: '#DC2626', border: '1px solid #FECACA' }} onClick={() => handleExport(block.type, 'pdf')}>
                <FileText size={16} /> PDF
              </button>
              <button className="btn" style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'white', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} onClick={() => handleExport(block.type, 'print')}>
                <Printer size={16} /> Print
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Preview Table ─── */}
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Search size={18} color="var(--primary)" /> Master Log Preview
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', background: '#F8FAFC', padding: '4px 10px', borderRadius: '20px', fontWeight: 600 }}>Showing Top 15 Records</span>
        </div>
        
        <div className="table-responsive" style={{ flex: 1 }}>
          <table className="table table-saas" style={{ margin: 0 }}>
            <thead style={{ background: '#F8FAFC' }}>
              <tr>
                <th style={{ width: '60px' }}>S.NO.</th>
                <th>DATE</th>
                <th>CUSTOMER INFO</th>
                <th>DEALER</th>
                <th>INS STATUS</th>
                <th>RTO STATUS</th>
              </tr>
            </thead>
            <tbody>
              {getFilteredData().slice(0, 15).map((row, idx) => (
                <tr key={row.id}>
                  <td style={{ textAlign: 'center', fontWeight: 600, color: '#94A3B8' }}>{idx + 1}</td>
                  <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{row.invoice_date}</td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.customer_name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', fontFamily: 'monospace' }}>{row.frame_no}</div>
                  </td>
                  <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{row.dealer_name}</td>
                  <td>
                    <span className={`badge badge-${(row.insurance_status || 'Pending').toLowerCase().replace(' ', '-')}`}>
                      {row.insurance_status || 'Pending'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${(row.rto_status || 'Pending').toLowerCase().replace(' ', '-')}`}>
                      {row.rto_status || 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '60px', color: '#94A3B8' }}>No data available for preview.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
