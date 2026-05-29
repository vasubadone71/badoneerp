import React, { useState, useEffect } from 'react';
import { Search, Edit, Shield, Calendar, AlertCircle, Download, Trash2, Printer, FileText, Upload, Paperclip } from 'lucide-react';
import { exportToExcel, exportToPDF, printReport } from '../utils/export';
import api from '../utils/api';

export default function Insurance() {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
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
    insurance_company: ''
  });

  useEffect(() => {
    loadData();
    // Multi-PC Live Auto-Refresh (Poll every 5s)
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
    setEditForm({
      policy_no: record.policy_no || '',
      insurance_price_list: record.insurance_price_list || '',
      agent_commission: record.agent_commission || '',
      insurance_difference: record.insurance_difference || '',
      penalty_charges: record.penalty_charges || '',
      policy_start_date: record.policy_start_date || '',
      policy_expiry_date: record.policy_expiry_date || '',
      insurance_deducted_date: record.insurance_deducted_date || '',
      zero_def: record.zero_def === 1,
      third_party: record.third_party === 1,
      status: record.status || 'Pending',
      document_name: record.document_name || '',
      insurance_company: record.insurance_company || ''
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
      const fileUrl = `${import.meta.env.VITE_API_URL || 'http://93.127.166.207:5000'}/uploads/${fileName}`;
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

  const filteredData = data.filter(d => 
    d.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    d.invoice_no.toLowerCase().includes(search.toLowerCase()) ||
    (d.policy_no && d.policy_no.toLowerCase().includes(search.toLowerCase())) ||
    (d.frame_no && d.frame_no.toLowerCase().includes(search.toLowerCase())) ||
    (d.insurance_company && d.insurance_company.toLowerCase().includes(search.toLowerCase()))
  );

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
      'Insurance (Actual)': row.insurance_actual_deducted,
      'Insurance Difference': row.insurance_difference,
      'Insurance Deducted Date': row.insurance_deducted_date,
      'Penalty Charges': row.penalty_charges || 0,
      'Policy Start Date': row.policy_start_date,
      'Policy Expiry Date': row.policy_expiry_date
    }));
  };

  const handleExportExcel = () => {
    exportToExcel('Insurance_Report', getExportData());
  };

  const handleExportPDF = () => {
    const exportData = getExportData();
    const headers = Object.keys(exportData[0] || {});
    exportToPDF('INSURANCE DEPARTMENT REPORT', headers, exportData, 'Insurance_Report');
  };

  const handlePrint = () => {
    const exportData = getExportData();
    const headers = Object.keys(exportData[0] || {});
    printReport('INSURANCE DEPARTMENT REPORT', headers, exportData);
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Insurance Department</h2>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn" style={{ backgroundColor: '#2e7d32', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={handleExportExcel}>
                <Download size={16} /> Excel
              </button>
              <button className="btn" style={{ backgroundColor: '#d32f2f', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={handleExportPDF}>
                <FileText size={16} /> PDF
              </button>
              <button className="btn" style={{ backgroundColor: '#455a64', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={handlePrint}>
                <Printer size={16} /> Print
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
              <input 
                type="text" 
                className="form-control" 
                placeholder="Search Policy / Customer / Frame..." 
                style={{ paddingLeft: '40px', width: '280px' }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>S. NO.</th>
                <th>INVOICE</th>
                <th>CUSTOMER NAME</th>
                <th>INSURANCE CO.</th>
                <th>POLICY NO</th>
                <th>PRICE LIST</th>
                <th>ACTUAL</th>
                <th>DIFF</th>
                <th>DEDUCTED DATE</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row, idx) => (
                <tr key={row.id}>
                  <td style={{ textAlign: 'center', fontWeight: 600, color: '#666' }}>{idx + 1}</td>
                  <td style={{ fontWeight: 600 }}>{row.invoice_no}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{row.customer_name}</div>
                    <div style={{ fontSize: '11px', color: '#888' }}>{row.frame_no}</div>
                  </td>
                  <td style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary)' }}>{row.insurance_company || '---'}</td>
                  <td style={{ fontSize: '12px' }}>{row.policy_no || '---'}</td>
                  <td>₹{row.insurance_price_list || 0}</td>
                  <td>₹{row.insurance_actual_deducted || 0}</td>
                  <td style={{ color: 'var(--honda-red)', fontWeight: 600 }}>₹{row.insurance_difference || 0}</td>
                  <td style={{ fontSize: '12px' }}>{row.insurance_deducted_date || '---'}</td>
                  <td>
                    <span className={`badge badge-${(row.status || 'Pending').toLowerCase()}`}>
                      {row.status || 'Pending'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn" style={{ padding: '6px' }} onClick={() => handleEditClick(row)}>
                        <Edit size={16} />
                      </button>
                      <button className="btn" style={{ padding: '6px', color: 'var(--danger)' }} onClick={() => handleDelete(row.master_entry_id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '30px', color: '#888' }}>No records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingRow && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <h3 style={{ marginBottom: '20px' }}>Process Insurance Policy</h3>
            
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
