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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="card">
        <h2 style={{ marginBottom: '24px', color: 'var(--primary)' }}>Reports Export Engine</h2>
        <div className="form-grid">
          <div className="form-group">
            <label>Filter by Dealer</label>
            <select className="form-control" value={filters.dealerId} onChange={(e) => setFilters({ ...filters, dealerId: e.target.value })}>
              <option value="">All Dealers</option>
              {dealers.map(d => <option key={d.id} value={d.id}>{d.dealer_name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Start Date</label>
            <input type="date" className="form-control" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} />
          </div>
          <div className="form-group">
            <label>End Date</label>
            <input type="date" className="form-control" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '32px' }}>
          <div className="card" style={{ background: '#f8f9fa', border: '1px solid #dee2e6' }}>
            <h4 style={{ marginBottom: '16px' }}>Insurance Reports</h4>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn" style={{ backgroundColor: '#2e7d32', color: 'white', flex: 1 }} onClick={() => handleExport('Insurance', 'excel')}>Excel</button>
              <button className="btn" style={{ backgroundColor: '#d32f2f', color: 'white', flex: 1 }} onClick={() => handleExport('Insurance', 'pdf')}>PDF</button>
              <button className="btn" style={{ backgroundColor: '#455a64', color: 'white', flex: 1 }} onClick={() => handleExport('Insurance', 'print')}>Print</button>
            </div>
          </div>

          <div className="card" style={{ background: '#f8f9fa', border: '1px solid #dee2e6' }}>
            <h4 style={{ marginBottom: '16px' }}>RTO Reports</h4>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn" style={{ backgroundColor: '#2e7d32', color: 'white', flex: 1 }} onClick={() => handleExport('RTO', 'excel')}>Excel</button>
              <button className="btn" style={{ backgroundColor: '#d32f2f', color: 'white', flex: 1 }} onClick={() => handleExport('RTO', 'pdf')}>PDF</button>
              <button className="btn" style={{ backgroundColor: '#455a64', color: 'white', flex: 1 }} onClick={() => handleExport('RTO', 'print')}>Print</button>
            </div>
          </div>

          <div className="card" style={{ background: '#f8f9fa', border: '1px solid #dee2e6' }}>
            <h4 style={{ marginBottom: '16px' }}>Master Combined</h4>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn" style={{ backgroundColor: '#1565c0', color: 'white', flex: 1 }} onClick={() => handleExport('Master', 'excel')}>Excel</button>
              <button className="btn" style={{ backgroundColor: '#d32f2f', color: 'white', flex: 1 }} onClick={() => handleExport('Master', 'pdf')}>PDF</button>
              <button className="btn" style={{ backgroundColor: '#455a64', color: 'white', flex: 1 }} onClick={() => handleExport('Master', 'print')}>Print</button>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Master Log Preview</h3>
        <div className="table-responsive" style={{ marginTop: '16px' }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>S. NO.</th>
                <th>DATE</th>
                <th>CUSTOMER</th>
                <th>DEALER</th>
                <th>INS STATUS</th>
                <th>RTO STATUS</th>
              </tr>
            </thead>
            <tbody>
              {getFilteredData().slice(0, 15).map((row, idx) => (
                <tr key={row.id}>
                  <td style={{ textAlign: 'center', fontWeight: 600, color: '#666' }}>{idx + 1}</td>
                  <td>{row.invoice_date}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{row.customer_name}</div>
                    <div style={{ fontSize: '11px', color: '#888' }}>{row.frame_no}</div>
                  </td>
                  <td>{row.dealer_name}</td>
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
                  <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>No data available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
