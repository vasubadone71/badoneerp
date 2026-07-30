import React, { useState, useEffect, useMemo } from 'react';
import { Search, Edit, Eye, Trash2, Printer, FileText, Download, Upload, Paperclip, ChevronLeft, ChevronRight } from 'lucide-react';
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="card" style={{ marginBottom: '16px', padding: '16px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <h2 style={{ margin: 0 }}>RTO Department</h2>
          
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn" style={{ backgroundColor: '#2e7d32', color: 'white', padding: '6px 12px', fontSize: '13px' }} onClick={handleExportExcel}>
                <Download size={14} /> Excel
              </button>
              <button className="btn" style={{ backgroundColor: '#d32f2f', color: 'white', padding: '6px 12px', fontSize: '13px' }} onClick={handleExportPDF}>
                <FileText size={14} /> PDF
              </button>
              <button className="btn" style={{ backgroundColor: '#455a64', color: 'white', padding: '6px 12px', fontSize: '13px' }} onClick={handlePrint}>
                <Printer size={14} /> Print
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} size={16} />
            <input 
              type="text" 
              className="form-control" 
              placeholder="Search Reg No, Name, Frame..." 
              style={{ paddingLeft: '32px', width: '100%', fontSize: '13px' }}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <select className="form-control" style={{ width: '130px', fontSize: '13px' }} value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}>
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Processing">Processing</option>
            <option value="Completed">Completed</option>
          </select>
          <input type="date" className="form-control" title="From Date" style={{ width: '130px', fontSize: '13px' }} value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }} />
          <input type="date" className="form-control" title="To Date" style={{ width: '130px', fontSize: '13px' }} value={dateTo} onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }} />
        </div>
      </div>

      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden' }}>
        <div className="table-responsive" style={{ flex: 1, overflowY: 'auto' }}>
          <table className="table" style={{ margin: 0 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 3 }}>
              <tr>
                <th style={{ width: '50px' }}>S.NO</th>
                <th>INVOICE</th>
                <th>CUSTOMER NAME</th>
                <th>REG NO</th>
                <th>PRICE LIST</th>
                <th>ACTUAL</th>
                <th>DIFF</th>
                <th>STATUS</th>
                <th className="action-col" style={{ width: '120px' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, idx) => (
                <tr key={row.id}>
                  <td style={{ textAlign: 'center', fontWeight: 600, color: '#666' }}>{(currentPage - 1) * rowsPerPage + idx + 1}</td>
                  <td style={{ fontWeight: 600 }}>{row.invoice_no}</td>
                  <td>
                    <div style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{row.customer_name}</div>
                    <div style={{ fontSize: '11px', color: '#888' }}>{row.frame_no}</div>
                  </td>
                  <td style={{ fontSize: '12px' }}>{row.registration_no || '---'}</td>
                  <td>₹{row.rto_price_list || 0}</td>
                  <td>₹{row.rto_actual_deducted || 0}</td>
                  <td style={{ color: 'var(--honda-red)', fontWeight: 600 }}>₹{row.rto_difference || 0}</td>
                  <td>
                    <span className={`badge badge-${(row.status || 'Pending').toLowerCase()}`}>
                      {row.status || 'Pending'}
                    </span>
                  </td>
                  <td className="action-col">
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="btn" style={{ padding: '6px', backgroundColor: '#e3f2fd', color: '#1976d2' }} title="View" onClick={() => setViewingRow(row)}>
                        <Eye size={14} />
                      </button>
                      <button className="btn" style={{ padding: '6px', backgroundColor: '#fff3e0', color: '#ed6c02' }} title="Edit" onClick={() => handleEditClick(row)}>
                        <Edit size={14} />
                      </button>
                      <button className="btn" style={{ padding: '6px', backgroundColor: '#ffebee', color: '#d32f2f' }} title="Delete" onClick={() => handleDelete(row.master_entry_id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedData.length === 0 && (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: '#888' }}>No records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
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

      {/* View Modal */}
      {viewingRow && (
        <div className="modal-overlay" onClick={() => setViewingRow(null)}>
          <div className="modal-content" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3>RTO Details</h3>
              <button className="btn" onClick={() => setViewingRow(null)}>Close</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '14px' }}>
              <div><strong style={{color: '#666'}}>Customer Name:</strong><br/>{viewingRow.customer_name}</div>
              <div><strong style={{color: '#666'}}>Father's Name:</strong><br/>{viewingRow.father_name}</div>
              <div><strong style={{color: '#666'}}>Invoice No:</strong><br/>{viewingRow.invoice_no}</div>
              <div><strong style={{color: '#666'}}>Frame No:</strong><br/>{viewingRow.frame_no}</div>
              <div><strong style={{color: '#666'}}>Engine No:</strong><br/>{viewingRow.engine_no}</div>
              <div><strong style={{color: '#666'}}>Mobile:</strong><br/>{viewingRow.mobile_number}</div>
              <div style={{ gridColumn: 'span 2' }}><strong style={{color: '#666'}}>Address:</strong><br/>{viewingRow.address}</div>
              
              <div style={{ gridColumn: 'span 2', height: '1px', background: '#eee', margin: '8px 0' }}></div>
              
              <div><strong style={{color: '#666'}}>Registration No:</strong><br/>{viewingRow.registration_no || '---'}</div>
              <div><strong style={{color: '#666'}}>Price List (PL):</strong><br/>₹{viewingRow.rto_price_list || 0}</div>
              <div><strong style={{color: '#666'}}>Actual Deducted:</strong><br/>₹{viewingRow.rto_actual_deducted || 0}</div>
              <div><strong style={{color: '#666'}}>Difference:</strong><br/>₹{viewingRow.rto_difference || 0}</div>
              <div><strong style={{color: '#666'}}>VID Feeding Charge:</strong><br/>₹{viewingRow.vid_feeding_charge || 0}</div>
              <div><strong style={{color: '#666'}}>Penalty Charges:</strong><br/>₹{viewingRow.penalty_charges || 0}</div>
              
              <div><strong style={{color: '#666'}}>Deducted Date:</strong><br/>{viewingRow.rto_deducted_date ? viewingRow.rto_deducted_date.split('T')[0] : '---'}</div>
              <div><strong style={{color: '#666'}}>Status:</strong><br/>
                <span className={`badge badge-${(viewingRow.status || 'Pending').toLowerCase()}`}>{viewingRow.status || 'Pending'}</span>
              </div>
              
              <div style={{ gridColumn: 'span 2' }}><strong style={{color: '#666'}}>Remarks:</strong><br/>{viewingRow.remarks || '---'}</div>
            </div>
            {viewingRow.document_name && (
              <div style={{ marginTop: '20px' }}>
                <button className="btn btn-primary" onClick={() => handleOpenDocument(viewingRow.document_name)}>
                  <Paperclip size={16} /> View Attached Document
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingRow && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <h3 style={{ marginBottom: '20px' }}>Process RTO Entry</h3>
            
            <div className="form-group">
              <label>Registration No</label>
              <input type="text" className="form-control" value={editForm.registration_no} onChange={(e) => setEditForm({ ...editForm, registration_no: e.target.value })} />
            </div>

            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label>Price List (PL)</label>
                <input type="number" className="form-control" value={editForm.rto_price_list} onChange={(e) => setEditForm({ ...editForm, rto_price_list: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Agent Commission</label>
                <input type="number" className="form-control" value={editForm.agent_commission} onChange={(e) => setEditForm({ ...editForm, agent_commission: e.target.value })} />
              </div>
            </div>
            
            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label>VID Feeding Charge</label>
                <input type="number" className="form-control" value={editForm.vid_feeding_charge} onChange={(e) => setEditForm({ ...editForm, vid_feeding_charge: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Penalty Charges</label>
                <input type="number" className="form-control" value={editForm.penalty_charges} onChange={(e) => setEditForm({ ...editForm, penalty_charges: e.target.value })} />
              </div>
            </div>

            <div className="form-group">
              <label>Deducted Date</label>
              <input type="date" className="form-control" value={editForm.rto_deducted_date} onChange={(e) => setEditForm({ ...editForm, rto_deducted_date: e.target.value })} />
            </div>

            <div className="form-group">
              <label>Status</label>
              <select className="form-control" value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                <option value="Pending">Pending</option>
                <option value="Processing">Processing</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            
            <div className="form-group" style={{ marginTop: '16px' }}>
              <label>Remarks</label>
              <textarea className="form-control" rows="2" value={editForm.remarks} onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })} placeholder="Enter any remarks..." />
            </div>

            <div className="form-group" style={{ marginTop: '16px' }}>
              <label>RTO Document</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#f8f9fa', padding: '10px', borderRadius: '6px', border: '1px dashed #ccc' }}>
                <button className="btn" style={{ background: '#e3f2fd', color: '#1976d2', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px' }} onClick={handleUploadDocument}>
                  <Upload size={16} /> Upload File
                </button>
                {editForm.document_name ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', color: '#444', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                      <Paperclip size={14} style={{ display: 'inline', marginRight: '4px' }} />
                      {editForm.document_name}
                    </span>
                    <button className="btn" style={{ background: 'transparent', color: '#1976d2', padding: '4px' }} onClick={() => handleOpenDocument(editForm.document_name)}>
                      View
                    </button>
                  </div>
                ) : (
                  <span style={{ fontSize: '13px', color: '#888' }}>No document attached</span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSaveEdit}>Save Changes</button>
              <button className="btn" style={{ flex: 1 }} onClick={() => setEditingRow(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
