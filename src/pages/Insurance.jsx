import React, { useState, useEffect, useMemo } from 'react';
import { Search, Edit, Eye, Trash2, Printer, FileText, Download, Upload, Paperclip, ChevronLeft, ChevronRight } from 'lucide-react';
import { exportToExcel, exportToPDF, printReport } from '../utils/export';
import api from '../utils/api';

export default function Insurance() {
  const [data, setData] = useState([]);
  
  // Filters
  const [search, setSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  
  const [viewingRow, setViewingRow] = useState(null);
  const [editingRow, setEditingRow] = useState(null);
  const [editForm, setEditForm] = useState({
    policy_no: '',
    insurance_price_list: 0,
    agent_commission: 0,
    penalty_charges: 0,
    policy_start_date: '',
    policy_expiry_date: '',
    insurance_deducted_date: '',
    zero_def: false,
    third_party: false,
    status: 'Pending',
    document_name: '',
    insurance_company: '',
    remarks: ''
  });

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const { data } = await api.get('/insurance');
      setData(data || []);
    } catch (err) {
      console.error("Failed to load insurance:", err);
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
    const actual = parseFloat(record.insurance_actual_deducted || 0);
    const penalty = parseFloat(record.penalty_charges || 0);
    const calculatedCommission = actual - penalty;

    const formatDate = (dateStr) => dateStr ? dateStr.split('T')[0] : '';

    setEditForm({
      policy_no: record.policy_no || '',
      insurance_price_list: record.insurance_price_list || '',
      agent_commission: calculatedCommission || '',
      penalty_charges: record.penalty_charges || '',
      policy_start_date: formatDate(record.policy_start_date),
      policy_expiry_date: formatDate(record.policy_expiry_date),
      insurance_deducted_date: formatDate(record.insurance_deducted_date),
      zero_def: record.zero_def === 1,
      third_party: record.third_party === 1,
      status: record.status || 'Pending',
      document_name: record.document_name || '',
      insurance_company: record.insurance_company || '',
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
        const { data } = await api.post('/upload/insurance', formData, {
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
      const penalty = parseFloat(editForm.penalty_charges || 0);
      const finalActualDeducted = comm + penalty;
      const diff = parseFloat(editForm.insurance_price_list || 0) - finalActualDeducted;
      
      await api.put(`/insurance/${editingRow}`, {
        ...editForm,
        agent_commission: comm,
        insurance_actual_deducted: finalActualDeducted,
        insurance_difference: diff,
        zero_def: editForm.zero_def ? 1 : 0,
        third_party: editForm.third_party ? 1 : 0
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
        (d.policy_no && d.policy_no.toLowerCase().includes(s)) ||
        (d.frame_no && d.frame_no.toLowerCase().includes(s)) ||
        (d.registration_no && d.registration_no.toLowerCase().includes(s));
        
      const matchesCompany = filterCompany ? d.insurance_company === filterCompany : true;
      const matchesStatus = filterStatus ? d.status === filterStatus : true;
      
      let matchesDate = true;
      if (dateFrom || dateTo) {
        // Use invoice_date or policy_start_date depending on preference. We'll use policy_start_date or invoice_date
        const recordDate = new Date(d.invoice_date || d.policy_start_date);
        if (dateFrom && recordDate < new Date(dateFrom)) matchesDate = false;
        if (dateTo && recordDate > new Date(dateTo)) matchesDate = false;
      }
      
      return matchesSearch && matchesCompany && matchesStatus && matchesDate;
    });
  }, [data, search, filterCompany, filterStatus, dateFrom, dateTo]);

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
      'Insurance Status': row.status,
      'RTO Status': row.rto_status || 'Pending',
      'Insurance Company': row.insurance_company || '---',
      'Policy No': row.policy_no,
      'Zero Def': row.zero_def === 1 ? 'Yes' : 'No',
      'Third Party': row.third_party === 1 ? 'Yes' : 'No',
      'Insurance (PL)': row.insurance_price_list,
      'Insurance (Net Premium)': row.insurance_actual_deducted,
      'Insurance Difference': row.insurance_difference,
      'Insurance Deducted Date': row.insurance_deducted_date,
      'Penalty Charges': row.penalty_charges || 0,
      'Policy Start Date': row.policy_start_date,
      'Policy Expiry Date': row.policy_expiry_date,
      'Remarks': row.remarks || '---'
    }));
  };

  const handleExportExcel = () => exportToExcel('Insurance_Report', getExportData());
  const handleExportPDF = () => exportToPDF('INSURANCE DEPARTMENT REPORT', Object.keys(getExportData()[0] || {}), getExportData(), 'Insurance_Report');
  const handlePrint = () => printReport('INSURANCE DEPARTMENT REPORT', Object.keys(getExportData()[0] || {}), getExportData());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="card" style={{ marginBottom: '16px', padding: '16px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <h2 style={{ margin: 0 }}>Insurance Department</h2>
          
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
              placeholder="Search Name, Reg No, Policy..." 
              style={{ paddingLeft: '32px', width: '100%', fontSize: '13px' }}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <select className="form-control" style={{ width: '150px', fontSize: '13px' }} value={filterCompany} onChange={(e) => { setFilterCompany(e.target.value); setCurrentPage(1); }}>
            <option value="">All Companies</option>
            <option value="ICICI Lombard">ICICI Lombard</option>
            <option value="HDFC Ergo">HDFC Ergo</option>
            <option value="Bajaj Allianz">Bajaj Allianz</option>
            <option value="Reliance">Reliance</option>
            <option value="New India">New India</option>
            <option value="SBI General">SBI General</option>
            <option value="Digit">Digit</option>
            <option value="Tata AIG">Tata AIG</option>
            <option value="Oriental">Oriental</option>
            <option value="United India">United India</option>
          </select>
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
                <th>INSURANCE CO.</th>
                <th>POLICY NO</th>
                <th>PRICE LIST</th>
                <th>NET PREMIUM</th>
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
                  <td style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary)' }}>{row.insurance_company || '---'}</td>
                  <td style={{ fontSize: '12px' }}>{row.policy_no || '---'}</td>
                  <td>₹{row.insurance_price_list || 0}</td>
                  <td>₹{row.insurance_actual_deducted || 0}</td>
                  <td style={{ color: 'var(--honda-red)', fontWeight: 600 }}>₹{row.insurance_difference || 0}</td>
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
                  <td colSpan="10" style={{ textAlign: 'center', padding: '30px', color: '#888' }}>No records found.</td>
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
              <h3>Insurance Details</h3>
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
              
              <div><strong style={{color: '#666'}}>Insurance Company:</strong><br/>{viewingRow.insurance_company || '---'}</div>
              <div><strong style={{color: '#666'}}>Policy No:</strong><br/>{viewingRow.policy_no || '---'}</div>
              <div><strong style={{color: '#666'}}>Price List (PL):</strong><br/>₹{viewingRow.insurance_price_list || 0}</div>
              <div><strong style={{color: '#666'}}>Net Premium:</strong><br/>₹{viewingRow.insurance_actual_deducted || 0}</div>
              <div><strong style={{color: '#666'}}>Difference:</strong><br/>₹{viewingRow.insurance_difference || 0}</div>
              <div><strong style={{color: '#666'}}>Penalty Charges:</strong><br/>₹{viewingRow.penalty_charges || 0}</div>
              
              <div><strong style={{color: '#666'}}>Start Date:</strong><br/>{viewingRow.policy_start_date ? viewingRow.policy_start_date.split('T')[0] : '---'}</div>
              <div><strong style={{color: '#666'}}>Expiry Date:</strong><br/>{viewingRow.policy_expiry_date ? viewingRow.policy_expiry_date.split('T')[0] : '---'}</div>
              
              <div><strong style={{color: '#666'}}>Options:</strong><br/>
                {viewingRow.zero_def === 1 ? 'Zero Def ' : ''} 
                {viewingRow.third_party === 1 ? 'Third Party' : ''}
                {viewingRow.zero_def !== 1 && viewingRow.third_party !== 1 ? 'None' : ''}
              </div>
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
            <h3 style={{ marginBottom: '20px' }}>Edit Insurance Details</h3>
            
            <datalist id="companies_modal">
              <option value="ICICI Lombard" />
              <option value="HDFC Ergo" />
              <option value="Bajaj Allianz" />
              <option value="Reliance" />
              <option value="New India" />
              <option value="SBI General" />
              <option value="Digit" />
              <option value="Tata AIG" />
              <option value="Oriental" />
              <option value="United India" />
            </datalist>

            <div className="form-group">
              <label>Insurance Company</label>
              <input type="text" list="companies_modal" className="form-control" value={editForm.insurance_company} onChange={(e) => setEditForm({ ...editForm, insurance_company: e.target.value })} placeholder="Select or type..." />
            </div>

            <div className="form-group">
              <label>Policy Number</label>
              <input type="text" className="form-control" value={editForm.policy_no} onChange={(e) => setEditForm({ ...editForm, policy_no: e.target.value })} />
            </div>
            
            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={editForm.zero_def} onChange={(e) => setEditForm({ ...editForm, zero_def: e.target.checked })} /> Zero Def
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={editForm.third_party} onChange={(e) => setEditForm({ ...editForm, third_party: e.target.checked })} /> Third Party
              </label>
            </div>

            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label>Price List (PL)</label>
                <input type="number" className="form-control" value={editForm.insurance_price_list} onChange={(e) => setEditForm({ ...editForm, insurance_price_list: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Agent Commission</label>
                <input type="number" className="form-control" value={editForm.agent_commission} onChange={(e) => setEditForm({ ...editForm, agent_commission: e.target.value })} />
              </div>
            </div>
            
            <div className="form-group">
              <label>Penalty Charges</label>
              <input type="number" className="form-control" value={editForm.penalty_charges} onChange={(e) => setEditForm({ ...editForm, penalty_charges: e.target.value })} />
            </div>

            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label>Start Date</label>
                <input type="date" className="form-control" value={editForm.policy_start_date} onChange={(e) => setEditForm({ ...editForm, policy_start_date: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Expiry Date</label>
                <input type="date" className="form-control" value={editForm.policy_expiry_date} onChange={(e) => setEditForm({ ...editForm, policy_expiry_date: e.target.value })} />
              </div>
            </div>

            <div className="form-group">
              <label>Deducted Date</label>
              <input type="date" className="form-control" value={editForm.insurance_deducted_date} onChange={(e) => setEditForm({ ...editForm, insurance_deducted_date: e.target.value })} />
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
              <label>Policy Document</label>
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
