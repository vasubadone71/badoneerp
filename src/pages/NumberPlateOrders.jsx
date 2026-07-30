import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Download, FileText, ChevronLeft, ChevronRight, ChevronDown, Hash, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { exportToExcel, exportToPDF } from '../utils/export';
import api from '../utils/api';

const STATUS_CONFIG = {
  'Pending':         { label: '🟡 Pending',         color: '#f57c00', bg: 'rgba(245,124,0,0.08)',   badge: 'badge-pending' },
  'Order Done':      { label: '🟢 Order Done',       color: '#2e7d32', bg: 'rgba(46,125,50,0.08)',   badge: 'badge-completed' },
  'Gone In Reason':  { label: '🔴 Gone In Reason',   color: '#c62828', bg: 'rgba(198,40,40,0.08)',   badge: 'badge-reason' },
};

const REASON_PRESETS = [
  'Registration Pending',
  'Address Mismatch',
  'RTO Hold',
  'Duplicate RC',
  'Owner Correction',
  'Other',
];

export default function NumberPlateOrders() {
  const [data, setData] = useState([]);
  const [dealers, setDealers] = useState([]);

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDealer, setFilterDealer] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Action dropdown
  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRef = useRef(null);

  // Gone In Reason modal
  const [reasonModal, setReasonModal] = useState(null); // { id, current }
  const [reasonInput, setReasonInput] = useState('');
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    loadData();
    loadDealers();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const loadData = async () => {
    try {
      const { data } = await api.get('/number-plates');
      setData(data || []);
    } catch (err) {
      console.error('Failed to load number plate orders:', err);
    }
  };

  const loadDealers = async () => {
    try {
      const { data } = await api.get('/dealers');
      setDealers(data || []);
    } catch (err) {
      console.error('Failed to load dealers:', err);
    }
  };

  const handleStatusChange = async (row, newStatus) => {
    setOpenDropdown(null);
    if (newStatus === 'Gone In Reason') {
      setReasonModal({ id: row.id, current: row.number_plate_reason || '' });
      setReasonInput(row.number_plate_reason || '');
      return;
    }
    // Order Done
    setSavingId(row.id);
    try {
      await api.put(`/number-plates/${row.id}`, {
        number_plate_status: newStatus,
        number_plate_reason: null,
        order_date: new Date().toISOString().split('T')[0],
      });
      loadData();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveReason = async () => {
    if (!reasonInput.trim()) {
      alert('Reason likhna zaroori hai.');
      return;
    }
    setSavingId(reasonModal.id);
    try {
      await api.put(`/number-plates/${reasonModal.id}`, {
        number_plate_status: 'Gone In Reason',
        number_plate_reason: reasonInput.trim(),
        order_date: null,
      });
      setReasonModal(null);
      loadData();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    } finally {
      setSavingId(null);
    }
  };

  // Filtered + paginated data
  const filteredData = useMemo(() => {
    return data.filter(d => {
      const s = search.toLowerCase();
      const matchesSearch =
        (d.customer_name && d.customer_name.toLowerCase().includes(s)) ||
        (d.registration_no && d.registration_no.toLowerCase().includes(s)) ||
        (d.vehicle_model && d.vehicle_model.toLowerCase().includes(s)) ||
        (d.frame_no && d.frame_no.toLowerCase().includes(s));
      const matchesStatus = filterStatus ? d.number_plate_status === filterStatus : true;
      const matchesDealer = filterDealer ? String(d.location_id) === filterDealer : true;
      let matchesDate = true;
      if (dateFrom || dateTo) {
        const recordDate = new Date(d.updated_at || d.invoice_date);
        if (dateFrom && recordDate < new Date(dateFrom)) matchesDate = false;
        if (dateTo && recordDate > new Date(dateTo + 'T23:59:59')) matchesDate = false;
      }
      return matchesSearch && matchesStatus && matchesDealer && matchesDate;
    });
  }, [data, search, filterStatus, filterDealer, dateFrom, dateTo]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredData.slice(start, start + rowsPerPage);
  }, [filteredData, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);

  // Summary counts
  const summary = useMemo(() => ({
    total: filteredData.length,
    pending: filteredData.filter(d => d.number_plate_status === 'Pending').length,
    done: filteredData.filter(d => d.number_plate_status === 'Order Done').length,
    reason: filteredData.filter(d => d.number_plate_status === 'Gone In Reason').length,
  }), [filteredData]);

  // Export helpers
  const getExportData = () => filteredData.map((row, idx) => ({
    'S.No': idx + 1,
    'Dealer': row.dealer_name || '---',
    'Customer Name': row.customer_name,
    'Reg. No': row.registration_no || '---',
    'Vehicle Model': row.vehicle_model,
    'Vehicle Color': row.vehicle_color,
    'Frame No (VIN)': row.frame_no,
    'Engine No': row.engine_no,
    'Status': row.number_plate_status,
    'Reason': row.number_plate_reason || '---',
    'Order Date': row.order_date ? row.order_date.split('T')[0] : '---',
  }));

  const handleExportExcel = () => {
    if (filteredData.length === 0) return alert('Export karne ke liye koi data nahi hai.');
    exportToExcel('NumberPlate_Orders', getExportData());
  };
  const handleExportPDF = () => {
    if (filteredData.length === 0) return alert('Export karne ke liye koi data nahi hai.');
    exportToPDF(
      'VEHICLE NUMBER PLATE ORDERS',
      Object.keys(getExportData()[0] || {}),
      getExportData(),
      'NumberPlate_Orders'
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ─── Header Card ─── */}
      <div className="card" style={{ marginBottom: '16px', padding: '16px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Hash size={22} color="#7b1fa2" />
            <h2 style={{ margin: 0 }}>Vehicle Number Plate Orders</h2>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn" style={{ backgroundColor: '#2e7d32', color: 'white', padding: '6px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={handleExportExcel}>
              <Download size={14} /> Excel
            </button>
            <button className="btn" style={{ backgroundColor: '#d32f2f', color: 'white', padding: '6px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={handleExportPDF}>
              <FileText size={14} /> PDF
            </button>
          </div>
        </div>

        {/* ─── Summary Bar ─── */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
          {[
            { label: 'Total Orders', value: summary.total, color: '#7b1fa2', icon: <Hash size={16} /> },
            { label: 'Pending',      value: summary.pending, color: '#f57c00', icon: <Clock size={16} /> },
            { label: 'Order Done',   value: summary.done,    color: '#2e7d32', icon: <CheckCircle size={16} /> },
            { label: 'Gone In Reason', value: summary.reason, color: '#c62828', icon: <AlertTriangle size={16} /> },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f5f5f5', borderRadius: '8px', padding: '8px 16px', borderLeft: `3px solid ${s.color}` }}>
              <span style={{ color: s.color }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: '11px', color: '#666' }}>{s.label}</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: s.color, lineHeight: 1.2 }}>{s.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ─── Filters ─── */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} size={16} />
            <input
              type="text"
              className="form-control"
              placeholder="Search: Customer, Reg No, Model, Frame..."
              style={{ paddingLeft: '32px', width: '100%', fontSize: '13px' }}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <select className="form-control" style={{ width: '160px', fontSize: '13px' }} value={filterDealer} onChange={(e) => { setFilterDealer(e.target.value); setCurrentPage(1); }}>
            <option value="">▼ All Dealers</option>
            {dealers.map(d => (
              <option key={d.id} value={d.id}>{d.dealer_name}</option>
            ))}
          </select>
          <select className="form-control" style={{ width: '160px', fontSize: '13px' }} value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}>
            <option value="">▼ All Statuses</option>
            <option value="Pending">🟡 Pending</option>
            <option value="Order Done">🟢 Order Done</option>
            <option value="Gone In Reason">🔴 Gone In Reason</option>
          </select>
          <input type="date" className="form-control" title="From Date" style={{ width: '130px', fontSize: '13px' }} value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }} />
          <input type="date" className="form-control" title="To Date" style={{ width: '130px', fontSize: '13px' }} value={dateTo} onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }} />
        </div>
      </div>

      {/* ─── Table Card ─── */}
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive" style={{ flex: 1, overflowY: 'auto' }}>
          <table className="table" style={{ margin: 0 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 3 }}>
              <tr>
                <th style={{ width: '40px', padding: '12px 8px' }}>S.NO</th>
                <th style={{ minWidth: '160px', padding: '12px 8px' }}>CUSTOMER DETAILS</th>
                <th style={{ padding: '12px 8px' }}>REG NO</th>
                <th style={{ padding: '12px 8px' }}>VEHICLE</th>
                <th style={{ padding: '12px 8px' }}>COLOR</th>
                <th style={{ padding: '12px 8px' }}>VIN / ENGINE NO</th>
                <th style={{ minWidth: '130px', padding: '12px 8px' }}>STATUS</th>
                <th style={{ width: '120px', padding: '12px 8px', textAlign: 'center' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, idx) => {
                const cfg = STATUS_CONFIG[row.number_plate_status] || STATUS_CONFIG['Pending'];
                return (
                  <tr key={row.id} style={{ backgroundColor: cfg.bg }}>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: '#666', padding: '10px 8px' }}>
                      {(currentPage - 1) * rowsPerPage + idx + 1}
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <div style={{ fontWeight: 600, fontSize: '13px', lineHeight: 1.2 }}>{row.customer_name}</div>
                      <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{row.dealer_name}</div>
                    </td>
                    <td style={{ fontWeight: 600, color: '#1976d2', fontSize: '13px', padding: '10px 8px', whiteSpace: 'nowrap' }}>
                      {row.registration_no || <span style={{ color: '#ccc' }}>---</span>}
                    </td>
                    <td style={{ fontSize: '12px', padding: '10px 8px', lineHeight: 1.2 }}>{row.vehicle_model}</td>
                    <td style={{ fontSize: '12px', padding: '10px 8px' }}>{row.vehicle_color}</td>
                    <td style={{ padding: '10px 8px' }}>
                      <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#444' }}><span style={{ color: '#888', fontSize: '10px' }}>VIN:</span> {row.frame_no}</div>
                      <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#444', marginTop: '2px' }}><span style={{ color: '#888', fontSize: '10px' }}>ENG:</span> {row.engine_no}</div>
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: cfg.color,
                          background: cfg.bg,
                          border: `1px solid ${cfg.color}40`,
                          whiteSpace: 'nowrap'
                        }}>
                          {cfg.label}
                        </span>
                        {row.number_plate_status === 'Gone In Reason' && row.number_plate_reason && (
                          <div style={{ fontSize: '11px', color: '#c62828', marginTop: '4px', lineHeight: 1.2, fontWeight: 500 }}>
                            ↳ {row.number_plate_reason}
                          </div>
                        )}
                        {row.number_plate_status === 'Order Done' && row.order_date && (
                          <div style={{ fontSize: '11px', color: '#2e7d32', marginTop: '4px', fontWeight: 500 }}>
                            📅 {row.order_date.split('T')[0]}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="action-col">
                      <div style={{ position: 'relative' }} ref={openDropdown === row.id ? dropdownRef : null}>
                        <button
                          className="btn"
                          disabled={savingId === row.id}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '12px', background: '#f0f0f0', color: '#333', border: '1px solid #ddd' }}
                          onClick={() => setOpenDropdown(openDropdown === row.id ? null : row.id)}
                        >
                          {savingId === row.id ? 'Saving...' : 'Change Status'} <ChevronDown size={12} />
                        </button>
                        {openDropdown === row.id && (
                          <div style={{
                            position: 'absolute', top: '100%', right: 0, zIndex: 100,
                            background: '#fff', border: '1px solid #ddd', borderRadius: '8px',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.12)', minWidth: '170px', overflow: 'hidden'
                          }}>
                            <button
                              style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#2e7d32', fontWeight: 600, textAlign: 'left' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(46,125,50,0.07)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'none'}
                              onClick={() => handleStatusChange(row, 'Order Done')}
                            >
                              <CheckCircle size={14} /> ✔ Order Done
                            </button>
                            <div style={{ height: '1px', background: '#f0f0f0' }} />
                            <button
                              style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#c62828', fontWeight: 600, textAlign: 'left' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(198,40,40,0.07)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'none'}
                              onClick={() => handleStatusChange(row, 'Gone In Reason')}
                            >
                              <AlertTriangle size={14} /> ⚠ Gone In Reason
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginatedData.length === 0 && (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>
                    <Hash size={32} style={{ marginBottom: '8px', opacity: 0.3 }} />
                    <div>No records found.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ─── Pagination ─── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', borderTop: '1px solid #eee', background: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#666' }}>
            <span>Show</span>
            <select className="form-control" style={{ padding: '4px 8px', fontSize: '13px' }} value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
            <span>entries | Total: {filteredData.length} records</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="btn" style={{ padding: '6px' }} disabled={currentPage === 1} onClick={() => setCurrentPage(c => c - 1)}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Page {currentPage} of {totalPages || 1}</span>
            <button className="btn" style={{ padding: '6px' }} disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(c => c + 1)}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Gone In Reason Modal ─── */}
      {reasonModal && (
        <div className="modal-overlay" onClick={() => setReasonModal(null)}>
          <div className="modal-content" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} color="#c62828" /> Gone In Reason
              </h3>
              <button className="btn" onClick={() => setReasonModal(null)}>✕</button>
            </div>

            <div className="form-group">
              <label style={{ fontWeight: 600, marginBottom: '8px', display: 'block' }}>Reason</label>
              <input
                type="text"
                className="form-control"
                placeholder="Type reason or select below..."
                value={reasonInput}
                onChange={e => setReasonInput(e.target.value)}
                style={{ marginBottom: '10px' }}
                autoFocus
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {REASON_PRESETS.map(preset => (
                  <button
                    key={preset}
                    className="btn"
                    style={{
                      fontSize: '12px', padding: '4px 10px',
                      background: reasonInput === preset ? '#ffebee' : '#f5f5f5',
                      color: reasonInput === preset ? '#c62828' : '#555',
                      border: reasonInput === preset ? '1px solid #c62828' : '1px solid #ddd'
                    }}
                    onClick={() => setReasonInput(preset)}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1, background: '#c62828', border: 'none' }}
                disabled={savingId === reasonModal.id}
                onClick={handleSaveReason}
              >
                {savingId === reasonModal.id ? 'Saving...' : '💾 Save'}
              </button>
              <button className="btn" style={{ flex: 1 }} onClick={() => setReasonModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
