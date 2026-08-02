import React, { useState, useEffect, useMemo } from 'react';
import { Search, Edit, Eye, Trash2, Printer, FileText, Download, Upload, Paperclip, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { exportToExcel, exportToPDF, printReport } from '../utils/export';
import api from '../utils/api';

export default function Rto() {
  const [data, setData] = useState([]);
  
  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const [viewingRow, setViewingRow] = useState(null);
  const [editingRow, setEditingRow] = useState(null);
  const [editForm, setEditForm] = useState({
    registration_no: '',
    rto_price_list: 0,
    agent_commission: 0,
    vid_feeding_charge: 0,
    penalty_charges: 0,
    rto_deducted_date: '',
    status: 'Pending',
    document_name: '',
    remarks: ''
  });

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const { data } = await api.get('/rto');
      setData(data || []);
    } catch (err) {
      console.error("Failed to load RTO:", err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this record? This will delete Master Entry as well.")) {
      try {
        await api.delete(`/master/${id}`);
        loadData();
      } catch (err) {
        console.error("Delete failed:", err);
      }
    }
  };

  const handleEditClick = (record) => {
    setEditingRow(record.id);
    
    // Reverse-calculate agent commission
    const actual = parseFloat(record.rto_actual_deducted || 0);
    const vid = parseFloat(record.vid_feeding_charge || 0);
    const penalty = parseFloat(record.penalty_charges || 0);
    const calculatedCommission = actual - vid - penalty;

    const formatDate = (dateStr) => dateStr ? dateStr.split('T')[0] : '';

    setEditForm({
      registration_no: record.registration_no || '',
      rto_price_list: record.rto_price_list || '',
      agent_commission: calculatedCommission || '',
      vid_feeding_charge: record.vid_feeding_charge || '',
      penalty_charges: record.penalty_charges || '',
      rto_deducted_date: formatDate(record.rto_deducted_date),
      status: record.status || 'Pending',
      document_name: record.document_name || '',
      remarks: record.remarks || ''
    });
  };

  const handleUploadDocument = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const formData = new FormData();
      formData.append('document', file);
      
      try {
        const { data } = await api.post('/upload/rto', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (data.success) {
          setEditForm({ ...editForm, document_name: data.fileName });
        }
      } catch (err) {
        alert("Upload Failed: " + (err.response?.data?.error || err.message));
      }
    };
    input.click();
  };

  const handleOpenDocument = (fileName) => {
    if (fileName) {
      const fileUrl = `${import.meta.env.VITE_API_URL || 'http://93.127.166.207:5002'}/uploads/${fileName}`;
      window.open(fileUrl, '_blank');
    }
  };

  const handleSaveEdit = async () => {
    try {
      const comm = parseFloat(editForm.agent_commission || 0);
      const vid = parseFloat(editForm.vid_feeding_charge || 0);
      const penalty = parseFloat(editForm.penalty_charges || 0);
      const finalActualDeducted = comm + vid + penalty;
      const diff = parseFloat(editForm.rto_price_list || 0) - finalActualDeducted;
      
      await api.put(`/rto/${editingRow}`, {
        ...editForm,
        agent_commission: comm,
        rto_actual_deducted: finalActualDeducted,
        rto_difference: diff
      });
      setEditingRow(null);
      loadData();
    } catch (err) {
      console.error("Save Error:", err);
      alert("Error: " + (err.response?.data?.error || err.message));
    }
  };

  const filteredData = useMemo(() => {
    return data.filter(d => {
      const s = search.toLowerCase();
      const matchesSearch = 
        (d.customer_name && d.customer_name.toLowerCase().includes(s)) ||
        (d.invoice_no && d.invoice_no.toLowerCase().includes(s)) ||
        (d.registration_no && d.registration_no.toLowerCase().includes(s)) ||
        (d.frame_no && d.frame_no.toLowerCase().includes(s));
        
      const matchesStatus = filterStatus ? d.status === filterStatus : true;
      
      let matchesDate = true;
      if (dateFrom || dateTo) {
        const recordDate = new Date(d.invoice_date || d.rto_deducted_date);
        if (dateFrom && recordDate < new Date(dateFrom)) matchesDate = false;
        if (dateTo && recordDate > new Date(dateTo)) matchesDate = false;
      }
      
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [data, search, filterStatus, dateFrom, dateTo]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredData.slice(start, start + rowsPerPage);
  }, [filteredData, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);

  const getExportData = () => {
    return filteredData.map((row, index) => ({
      'S. No.': index + 1,
      'Location': row.dealer_name,
      'Invoice No.': row.invoice_no,
      'Invoice Date': row.invoice_date,
      'Customer Name': row.customer_name,
      "Father's Name": row.father_name,
      'Mobile Number': row.mobile_number,
      'Address': row.address,
      'Vehicle Model': row.vehicle_model,
      'Vehicle Color': row.vehicle_color,
      'Frame No.': row.frame_no,
      'Engine No.': row.engine_no,
      'Insurance Status': row.insurance_status || 'Pending',
      'RTO Status': row.status,
      'Registration No.': row.registration_no,
      'RTO (PL)': row.rto_price_list,
      'RTO (Actual)': row.rto_actual_deducted,
      'RTO Difference': row.rto_difference,
      'RTO Deducted Date': row.rto_deducted_date,
      'VID Feeding Charge': row.vid_feeding_charge,
      'Penalty Charges': row.penalty_charges || 0,
      'Remarks': row.remarks || '---'
    }));
  };

  const handleExportExcel = () => exportToExcel('RTO_Report', getExportData());
  const handleExportPDF = () => exportToPDF('RTO DEPARTMENT REPORT', Object.keys(getExportData()[0] || {}), getExportData(), 'RTO_Report');
  const handlePrint = () => printReport('RTO DEPARTMENT REPORT', Object.keys(getExportData()[0] || {}), getExportData());

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      <div className="card" style={{ marginBottom: '24px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} color="var(--primary)" /> RTO Department
          </h2>
          
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn" style={{ backgroundColor: '#F0FDF4', color: 'var(--success)', border: '1px solid #BBF7D0', padding: '8px 16px', fontSize: '13px' }} onClick={handleExportExcel}>
                <Download size={16} /> Excel
              </button>
              <button className="btn" style={{ backgroundColor: '#FEF2F2', color: 'var(--danger)', border: '1px solid #FECACA', padding: '8px 16px', fontSize: '13px' }} onClick={handleExportPDF}>
                <FileText size={16} /> PDF
              </button>
              <button className="btn" style={{ backgroundColor: '#F8FAFC', color: '#475569', border: '1px solid var(--border-color)', padding: '8px 16px', fontSize: '13px' }} onClick={handlePrint}>
                <Printer size={16} /> Print
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} size={16} />
            <input 
              type="text" 
              className="form-control" 
              placeholder="Search Reg No, Name, Frame..." 
              style={{ paddingLeft: '40px', width: '100%', fontSize: '13px', borderRadius: '12px' }}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <select className="form-control" style={{ width: '150px', fontSize: '13px', borderRadius: '12px' }} value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}>
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Processing">Processing</option>
            <option value="Completed">Completed</option>
          </select>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: '#F8FAFC', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <input type="date" className="form-control" title="From Date" style={{ width: '130px', fontSize: '13px', border: 'none', background: 'transparent' }} value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }} />
            <span style={{ color: '#94A3B8' }}>-</span>
            <input type="date" className="form-control" title="To Date" style={{ width: '130px', fontSize: '13px', border: 'none', background: 'transparent' }} value={dateTo} onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }} />
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '0' }}>
        <div className="table-responsive">
          <table className="table table-saas" style={{ margin: 0 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 3 }}>
              <tr>
                <th style={{ width: '50px', textAlign: 'center' }}>S.NO</th>
                <th>INVOICE</th>
                <th>CUSTOMER NAME</th>
                <th>REG NO</th>
                <th>PRICE LIST</th>
                <th>ACTUAL</th>
                <th>DIFF</th>
                <th>STATUS</th>
                <th className="action-col" style={{ width: '140px', textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, idx) => (
                <tr key={row.id}>
                  <td style={{ textAlign: 'center', fontWeight: 600, color: '#94A3B8' }}>{(currentPage - 1) * rowsPerPage + idx + 1}</td>
                  <td><span style={{ fontFamily: 'monospace', background: '#F8FAFC', padding: '4px 8px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>{row.invoice_no}</span></td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{row.customer_name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{row.frame_no}</div>
                  </td>
                  <td style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary)' }}>{row.registration_no || '---'}</td>
                  <td style={{ fontWeight: 500 }}>₹{row.rto_price_list || 0}</td>
                  <td style={{ fontWeight: 600, color: 'var(--success)' }}>₹{row.rto_actual_deducted || 0}</td>
                  <td style={{ color: 'var(--danger)', fontWeight: 700 }}>₹{row.rto_difference || 0}</td>
                  <td>
                    <span className={`badge badge-${(row.status || 'Pending').toLowerCase()}`}>
                      {row.status || 'Pending'}
                    </span>
                  </td>
                  <td className="action-col" style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button className="btn" style={{ padding: '8px', backgroundColor: '#EEF2FF', color: 'var(--primary)', border: 'none', borderRadius: '8px' }} title="View" onClick={() => setViewingRow(row)}>
                        <Eye size={16} />
                      </button>
                      <button className="btn" style={{ padding: '8px', backgroundColor: '#FFF7ED', color: 'var(--warning)', border: 'none', borderRadius: '8px' }} title="Edit" onClick={() => handleEditClick(row)}>
                        <Edit size={16} />
                      </button>
                      <button className="btn" style={{ padding: '8px', backgroundColor: '#FEF2F2', color: 'var(--danger)', border: 'none', borderRadius: '8px' }} title="Delete" onClick={() => handleDelete(row.master_entry_id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedData.length === 0 && (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '60px', color: '#94A3B8' }}>
                    <FileText size={48} style={{ marginBottom: '16px', opacity: 0.2 }} />
                    <div>No RTO records found matching your filters.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
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

      {/* View Modal */}
      {viewingRow && (
        <div className="modal-overlay" onClick={() => setViewingRow(null)}>
          <div className="modal-content animate-fade" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>RTO Details</h3>
              <button className="btn" style={{ border: 'none', background: '#F1F5F9' }} onClick={() => setViewingRow(null)}>
                <X size={20} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '14px', background: '#F8FAFC', padding: '24px', borderRadius: '12px' }}>
              <div><strong style={{color: 'var(--text-secondary)', display: 'block', fontSize: '12px', marginBottom: '4px'}}>Customer Name</strong><span style={{ fontWeight: 600 }}>{viewingRow.customer_name}</span></div>
              <div><strong style={{color: 'var(--text-secondary)', display: 'block', fontSize: '12px', marginBottom: '4px'}}>Father's Name</strong>{viewingRow.father_name || '---'}</div>
              <div><strong style={{color: 'var(--text-secondary)', display: 'block', fontSize: '12px', marginBottom: '4px'}}>Invoice No</strong><span style={{ fontFamily: 'monospace' }}>{viewingRow.invoice_no}</span></div>
              <div><strong style={{color: 'var(--text-secondary)', display: 'block', fontSize: '12px', marginBottom: '4px'}}>Mobile</strong>{viewingRow.mobile_number}</div>
              <div><strong style={{color: 'var(--text-secondary)', display: 'block', fontSize: '12px', marginBottom: '4px'}}>Frame No</strong>{viewingRow.frame_no}</div>
              <div><strong style={{color: 'var(--text-secondary)', display: 'block', fontSize: '12px', marginBottom: '4px'}}>Engine No</strong>{viewingRow.engine_no}</div>
              <div style={{ gridColumn: 'span 2' }}><strong style={{color: 'var(--text-secondary)', display: 'block', fontSize: '12px', marginBottom: '4px'}}>Address</strong>{viewingRow.address}</div>
            </div>
              
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '14px', marginTop: '20px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>RTO Information</h4>
              </div>
              
              <div><strong style={{color: 'var(--text-secondary)', display: 'block', fontSize: '12px', marginBottom: '4px'}}>Registration No</strong><span style={{ fontWeight: 600, color: 'var(--primary)' }}>{viewingRow.registration_no || '---'}</span></div>
              <div><strong style={{color: 'var(--text-secondary)', display: 'block', fontSize: '12px', marginBottom: '4px'}}>Price List (PL)</strong>₹{viewingRow.rto_price_list || 0}</div>
              <div><strong style={{color: 'var(--text-secondary)', display: 'block', fontSize: '12px', marginBottom: '4px'}}>Actual Deducted</strong><span style={{ color: 'var(--success)', fontWeight: 600 }}>₹{viewingRow.rto_actual_deducted || 0}</span></div>
              <div><strong style={{color: 'var(--text-secondary)', display: 'block', fontSize: '12px', marginBottom: '4px'}}>Difference</strong><span style={{ color: 'var(--danger)', fontWeight: 600 }}>₹{viewingRow.rto_difference || 0}</span></div>
              <div><strong style={{color: 'var(--text-secondary)', display: 'block', fontSize: '12px', marginBottom: '4px'}}>VID Feeding Charge</strong>₹{viewingRow.vid_feeding_charge || 0}</div>
              <div><strong style={{color: 'var(--text-secondary)', display: 'block', fontSize: '12px', marginBottom: '4px'}}>Penalty Charges</strong>₹{viewingRow.penalty_charges || 0}</div>
              
              <div><strong style={{color: 'var(--text-secondary)', display: 'block', fontSize: '12px', marginBottom: '4px'}}>Deducted Date</strong>{viewingRow.rto_deducted_date ? viewingRow.rto_deducted_date.split('T')[0] : '---'}</div>
              <div><strong style={{color: 'var(--text-secondary)', display: 'block', fontSize: '12px', marginBottom: '4px'}}>Status</strong>
                <span className={`badge badge-${(viewingRow.status || 'Pending').toLowerCase()}`}>{viewingRow.status || 'Pending'}</span>
              </div>
              
              <div style={{ gridColumn: 'span 2' }}><strong style={{color: 'var(--text-secondary)', display: 'block', fontSize: '12px', marginBottom: '4px'}}>Remarks</strong>{viewingRow.remarks || '---'}</div>
            </div>
            
            {viewingRow.document_name && (
              <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border-color)' }}>
                <button className="btn btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '12px' }} onClick={() => handleOpenDocument(viewingRow.document_name)}>
                  <Paperclip size={18} /> View Attached RTO Document
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingRow && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade" style={{ maxWidth: '600px' }}>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Process RTO Entry</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>Registration No</label>
                <input type="text" className="form-control" value={editForm.registration_no} onChange={(e) => setEditForm({ ...editForm, registration_no: e.target.value })} />
              </div>

              <div className="form-group">
                <label>Price List (PL)</label>
                <input type="number" className="form-control" value={editForm.rto_price_list} onChange={(e) => setEditForm({ ...editForm, rto_price_list: e.target.value })} />
              </div>
              
              <div className="form-group">
                <label>Agent Commission</label>
                <input type="number" className="form-control" value={editForm.agent_commission} onChange={(e) => setEditForm({ ...editForm, agent_commission: e.target.value })} />
              </div>
              
              <div className="form-group">
                <label>VID Feeding Charge</label>
                <input type="number" className="form-control" value={editForm.vid_feeding_charge} onChange={(e) => setEditForm({ ...editForm, vid_feeding_charge: e.target.value })} />
              </div>
              
              <div className="form-group">
                <label>Penalty Charges</label>
                <input type="number" className="form-control" value={editForm.penalty_charges} onChange={(e) => setEditForm({ ...editForm, penalty_charges: e.target.value })} />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>Deducted Date</label>
                <input type="date" className="form-control" value={editForm.rto_deducted_date} onChange={(e) => setEditForm({ ...editForm, rto_deducted_date: e.target.value })} />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>Status</label>
                <select className="form-control" value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                  <option value="Pending">Pending</option>
                  <option value="Processing">Processing</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>Remarks</label>
                <textarea className="form-control" rows="2" value={editForm.remarks} onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })} placeholder="Enter any remarks..." />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>RTO Document</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#f8f9fa', padding: '12px', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
                  <button className="btn" style={{ background: '#e3f2fd', color: '#1976d2', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px' }} onClick={handleUploadDocument}>
                    <Upload size={16} /> Upload File
                  </button>
                  {editForm.document_name ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', color: '#444', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                        <Paperclip size={14} style={{ display: 'inline', marginRight: '4px' }} />
                        {editForm.document_name}
                      </span>
                      <button className="btn" style={{ background: 'transparent', color: '#1976d2', padding: '6px', fontSize: '13px', fontWeight: 600 }} onClick={() => handleOpenDocument(editForm.document_name)}>
                        View
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: '13px', color: '#94A3B8' }}>No document attached</span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '32px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
              <button className="btn btn-primary" style={{ flex: 1, padding: '12px', borderRadius: '12px' }} onClick={handleSaveEdit}>Save Changes</button>
              <button className="btn" style={{ flex: 1, padding: '12px', borderRadius: '12px', background: '#F1F5F9', color: '#475569', border: 'none' }} onClick={() => setEditingRow(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
