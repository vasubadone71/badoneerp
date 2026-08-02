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
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>

      {/* ─── Header Card ─── */}
      <div className="card" style={{ marginBottom: '24px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Hash size={24} color="var(--primary)" />
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Vehicle Number Plate Orders</h2>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn" style={{ backgroundColor: '#F0FDF4', color: 'var(--success)', border: '1px solid #BBF7D0', padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={handleExportExcel}>
              <Download size={16} /> Excel
            </button>
            <button className="btn" style={{ backgroundColor: '#FEF2F2', color: 'var(--danger)', border: '1px solid #FECACA', padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={handleExportPDF}>
              <FileText size={16} /> PDF
            </button>
          </div>
        </div>

        {/* ─── Summary Bar ─── */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '24px', flexWrap: 'wrap' }}>
          {[
            { label: 'Total Orders', value: summary.total, color: 'var(--primary)', icon: <Hash size={20} />, bg: '#EEF2FF' },
            { label: 'Pending',      value: summary.pending, color: 'var(--warning)', icon: <Clock size={20} />, bg: '#FFF7ED' },
            { label: 'Order Done',   value: summary.done,    color: 'var(--success)', icon: <CheckCircle size={20} />, bg: '#F0FDF4' },
            { label: 'Gone In Reason', value: summary.reason, color: 'var(--danger)', icon: <AlertTriangle size={20} />, bg: '#FEF2F2' },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--card-bg)', borderRadius: '12px', padding: '16px 20px', border: '1px solid var(--border-color)', flex: 1, minWidth: '200px' }}>
              <div style={{ background: s.bg, color: s.color, width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {s.icon}
              </div>
              <div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>{s.label}</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>{s.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ─── Filters ─── */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '24px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} size={16} />
            <input
              type="text"
              className="form-control"
              placeholder="Search: Customer, Reg No, Model, Frame..."
              style={{ paddingLeft: '40px', width: '100%', fontSize: '13px', borderRadius: '12px' }}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <select className="form-control" style={{ width: '180px', fontSize: '13px', borderRadius: '12px' }} value={filterDealer} onChange={(e) => { setFilterDealer(e.target.value); setCurrentPage(1); }}>
            <option value="">▼ All Dealers</option>
            {dealers.map(d => (
              <option key={d.id} value={d.id}>{d.dealer_name}</option>
            ))}
          </select>
          <select className="form-control" style={{ width: '180px', fontSize: '13px', borderRadius: '12px' }} value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}>
            <option value="">▼ All Statuses</option>
            <option value="Pending">🟡 Pending</option>
            <option value="Order Done">🟢 Order Done</option>
            <option value="Gone In Reason">🔴 Gone In Reason</option>
          </select>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: '#F8FAFC', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <input type="date" className="form-control" title="From Date" style={{ width: '130px', fontSize: '13px', border: 'none', background: 'transparent' }} value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }} />
            <span style={{ color: '#94A3B8' }}>-</span>
            <input type="date" className="form-control" title="To Date" style={{ width: '130px', fontSize: '13px', border: 'none', background: 'transparent' }} value={dateTo} onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }} />
          </div>
        </div>
      </div>

      {/* ─── Table Card ─── */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-responsive">
          <table className="table table-saas" style={{ margin: 0 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 3 }}>
              <tr>
                <th style={{ width: '50px', textAlign: 'center' }}>S.NO</th>
                <th style={{ minWidth: '160px' }}>CUSTOMER DETAILS</th>
                <th>REG NO</th>
                <th>VEHICLE</th>
                <th>COLOR</th>
                <th>VIN / ENGINE NO</th>
                <th style={{ minWidth: '130px' }}>STATUS</th>
                <th style={{ width: '140px', textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, idx) => {
                const cfg = STATUS_CONFIG[row.number_plate_status] || STATUS_CONFIG['Pending'];
                return (
                  <tr key={row.id}>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: '#94A3B8' }}>
                      {(currentPage - 1) * rowsPerPage + idx + 1}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{row.customer_name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{row.dealer_name}</div>
                    </td>
                    <td>
                      {row.registration_no ? <span style={{ fontFamily: 'monospace', background: '#F8FAFC', padding: '4px 8px', borderRadius: '6px', border: '1px solid #E2E8F0', fontWeight: 600 }}>{row.registration_no}</span> : <span style={{ color: '#ccc' }}>---</span>}
                    </td>
                    <td style={{ fontSize: '13px', fontWeight: 500 }}>{row.vehicle_model}</td>
                    <td style={{ fontSize: '13px' }}>{row.vehicle_color}</td>
                    <td>
                      <div style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}><strong style={{ color: '#94A3B8', fontWeight: 500 }}>VIN:</strong> {row.frame_no}</div>
                      <div style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-secondary)', marginTop: '4px' }}><strong style={{ color: '#94A3B8', fontWeight: 500 }}>ENG:</strong> {row.engine_no}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: cfg.color,
                          background: cfg.bg,
                          border: `1px solid ${cfg.color}30`,
                          whiteSpace: 'nowrap'
                        }}>
                          {cfg.label}
                        </span>
                        {row.number_plate_status === 'Gone In Reason' && row.number_plate_reason && (
                          <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '8px', lineHeight: 1.2, fontWeight: 500, display: 'flex', gap: '4px' }}>
                            <AlertTriangle size={14} /> {row.number_plate_reason}
                          </div>
                        )}
                        {row.number_plate_status === 'Order Done' && row.order_date && (
                          <div style={{ fontSize: '12px', color: 'var(--success)', marginTop: '8px', fontWeight: 500, display: 'flex', gap: '4px' }}>
                            <CheckCircle size={14} /> {row.order_date.split('T')[0]}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="action-col" style={{ textAlign: 'right', position: openDropdown === row.id ? 'relative' : 'static', zIndex: openDropdown === row.id ? 9999 : 'auto' }}>
                      <div style={{ position: 'relative', display: 'inline-block' }} ref={openDropdown === row.id ? dropdownRef : null}>
                        <button
                          className="btn"
                          disabled={savingId === row.id}
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', fontSize: '13px', background: '#F8FAFC', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', fontWeight: 600 }}
                          onClick={() => setOpenDropdown(openDropdown === row.id ? null : row.id)}
                        >
                          {savingId === row.id ? 'Saving...' : 'Change Status'} <ChevronDown size={14} />
                        </button>
                        {openDropdown === row.id && (
                          <div className="animate-fade" style={{
                            position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 99999,
                            background: '#fff', border: '1px solid var(--border-color)', borderRadius: '12px',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.1)', minWidth: '180px', overflow: 'hidden'
                          }}>
                            <button
                              style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--success)', fontWeight: 600, textAlign: 'left' }}
                              onMouseEnter={e => e.currentTarget.style.background = '#F0FDF4'}
                              onMouseLeave={e => e.currentTarget.style.background = 'none'}
                              onClick={() => handleStatusChange(row, 'Order Done')}
                            >
                              <CheckCircle size={16} /> ✔ Order Done
                            </button>
                            <div style={{ height: '1px', background: 'var(--border-color)' }} />
                            <button
                              style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--danger)', fontWeight: 600, textAlign: 'left' }}
                              onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
                              onMouseLeave={e => e.currentTarget.style.background = 'none'}
                              onClick={() => handleStatusChange(row, 'Gone In Reason')}
                            >
                              <AlertTriangle size={16} /> ⚠ Gone In Reason
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
                  <td colSpan="8" style={{ textAlign: 'center', padding: '60px', color: '#94A3B8' }}>
                    <Hash size={48} style={{ marginBottom: '16px', opacity: 0.2 }} />
                    <div>No number plate orders found.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* ─── Pagination ─── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid var(--border-color)', background: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            <span>Show</span>
            <select className="form-control" style={{ padding: '6px 12px', fontSize: '13px', borderRadius: '8px' }} value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
            <span>entries | Total: <strong style={{ color: 'var(--text-primary)' }}>{filteredData.length}</strong> records</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="btn" style={{ padding: '8px', borderRadius: '8px' }} disabled={currentPage === 1} onClick={() => setCurrentPage(c => c - 1)}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Page {currentPage} of {totalPages || 1}</span>
            <button className="btn" style={{ padding: '8px', borderRadius: '8px' }} disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(c => c + 1)}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Gone In Reason Modal ─── */}
      {reasonModal && (
        <div className="modal-overlay" onClick={() => setReasonModal(null)}>
          <div className="modal-content animate-fade" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontWeight: 700 }}>
                <AlertTriangle size={20} color="var(--danger)" /> Gone In Reason
              </h3>
              <button className="btn" style={{ border: 'none', background: '#F1F5F9' }} onClick={() => setReasonModal(null)}>✕</button>
            </div>

            <div className="form-group">
              <label style={{ fontWeight: 600, marginBottom: '12px', display: 'block', color: 'var(--text-primary)' }}>Specify Reason</label>
              <input
                type="text"
                className="form-control"
                placeholder="Type reason or select below..."
                value={reasonInput}
                onChange={e => setReasonInput(e.target.value)}
                style={{ marginBottom: '16px', borderRadius: '12px', padding: '12px' }}
                autoFocus
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {REASON_PRESETS.map(preset => (
                  <button
                    key={preset}
                    className="btn"
                    style={{
                      fontSize: '13px', padding: '8px 16px', borderRadius: '20px',
                      background: reasonInput === preset ? '#FEF2F2' : '#F8FAFC',
                      color: reasonInput === preset ? 'var(--danger)' : 'var(--text-secondary)',
                      border: reasonInput === preset ? '1px solid #FECACA' : '1px solid var(--border-color)',
                      fontWeight: reasonInput === preset ? 600 : 500
                    }}
                    onClick={() => setReasonInput(preset)}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1, background: 'var(--danger)', border: 'none', padding: '12px', borderRadius: '12px' }}
                disabled={savingId === reasonModal.id}
                onClick={handleSaveReason}
              >
                {savingId === reasonModal.id ? 'Saving...' : 'Save Reason'}
              </button>
              <button className="btn" style={{ flex: 1, padding: '12px', borderRadius: '12px', background: '#F1F5F9', border: 'none', color: '#475569' }} onClick={() => setReasonModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
