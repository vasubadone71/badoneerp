import React, { useState, useEffect } from 'react';
import { Save, Search, CheckCircle, Clock, AlertCircle, Download, Trash2, Printer, FileText } from 'lucide-react';
import { exportToExcel, exportToPDF, printReport } from '../utils/export';
import api from '../utils/api';
import { InvoiceUploadCard } from '../components/InvoiceUploadCard';

export default function MasterEntry() {
  const [dealers, setDealers] = useState([]);
  const [managementData, setManagementData] = useState([]);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({
    location_id: '',
    invoice_no: '',
    invoice_date: new Date().toISOString().split('T')[0],
    customer_name: '',
    father_name: '',
    mobile_number: '',
    address: '',
    vehicle_model: '',
    vehicle_color: '',
    frame_no: '',
    engine_no: '',
    insurance_company: ''
  });

  const loadData = async () => {
    try {
      const [dealersRes, mgmtRes] = await Promise.all([
        api.get('/dealers'),
        api.get('/master')
      ]);
      setDealers(dealersRes.data);
      setManagementData(mgmtRes.data);
    } catch (err) {
      console.error("Failed to load master entry data:", err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this record? All linked data will be lost.")) {
      try {
        await api.delete(`/master/${id}`);
        loadData();
      } catch (err) {
        console.error("Failed to delete record:", err);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImportSuccess = (parsedData) => {
    setFormData(prev => ({
      ...prev,
      invoice_no: parsedData.invoiceNumber?.value || prev.invoice_no,
      invoice_date: parsedData.invoiceDate?.value || prev.invoice_date,
      customer_name: parsedData.customerName?.value || prev.customer_name,
      father_name: parsedData.fatherName?.value || prev.father_name,
      mobile_number: parsedData.mobileNumber?.value || prev.mobile_number,
      address: parsedData.address?.value || prev.address,
      vehicle_model: parsedData.vehicleModel?.value || prev.vehicle_model,
      vehicle_color: parsedData.vehicleColor?.value || prev.vehicle_color,
      frame_no: parsedData.frameNumber?.value || prev.frame_no,
      engine_no: parsedData.engineNumber?.value || prev.engine_no,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/master', formData);
      alert('Master Entry Saved Successfully!');
      setFormData({
        ...formData,
        invoice_no: '',
        customer_name: '',
        father_name: '',
        mobile_number: '',
        address: '',
        vehicle_model: '',
        vehicle_color: '',
        frame_no: '',
        engine_no: '',
        insurance_company: ''
      });
      loadData();
    } catch (err) {
      console.error("Failed to save master entry:", err);
      alert('Failed to save record.');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Completed': return <span className="badge badge-completed"><CheckCircle size={14} /> Completed</span>;
      case 'In Process': return <span className="badge badge-processing"><Clock size={14} /> In Process</span>;
      default: return <span className="badge badge-pending"><AlertCircle size={14} /> Pending</span>;
    }
  };

  const filteredData = managementData.filter(item => 
    item.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    item.invoice_no?.toLowerCase().includes(search.toLowerCase()) ||
    item.frame_no?.toLowerCase().includes(search.toLowerCase())
  );

  const getExportData = () => {
    return filteredData.map((row, index) => ({
      'S. No.': index + 1,
      'Invoice No': row.invoice_no,
      'Date': row.invoice_date,
      'Customer Name': row.customer_name,
      'Father Name': row.father_name,
      'Mobile': row.mobile_number,
      'Address': row.address,
      'Vehicle Model': row.vehicle_model,
      'Frame No': row.frame_no,
      'Engine No': row.engine_no,
      'Dealer': row.dealer_name,
      'Insurance Company': row.insurance_company || '---',
      'Insurance Status': row.insurance_status,
      'RTO Status': row.rto_status
    }));
  };

  const handleExportExcel = () => {
    exportToExcel('Master_Report', getExportData());
  };

  const handleExportPDF = () => {
    const exportData = getExportData();
    const headers = Object.keys(exportData[0] || {});
    exportToPDF('MASTER PROCESSING DESK REPORT', headers, exportData, 'Master_Report');
  };

  const handlePrint = () => {
    const exportData = getExportData();
    const headers = Object.keys(exportData[0] || {});
    printReport('MASTER PROCESSING DESK REPORT', headers, exportData);
  };

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '32px', paddingBottom: '40px' }}>
      <InvoiceUploadCard onImportSuccess={handleImportSuccess} />
      
      <div className="card">
        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={20} color="var(--primary)" /> Customer Processing Desk (Master Entry)
        </h2>
        
        <datalist id="companies">
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

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            <div className="form-group">
              <label>Location (Dealer)</label>
              <select name="location_id" className="form-control" value={formData.location_id} onChange={handleChange} required>
                <option value="">Select Dealer</option>
                {dealers.map(d => (
                  <option key={d.id} value={d.id}>{d.dealer_name} ({d.dealer_type})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Invoice Number</label>
              <input type="text" name="invoice_no" className="form-control" value={formData.invoice_no} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Invoice Date</label>
              <input type="date" name="invoice_date" className="form-control" value={formData.invoice_date} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Customer Name</label>
              <input type="text" name="customer_name" className="form-control" value={formData.customer_name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Father's Name</label>
              <input type="text" name="father_name" className="form-control" value={formData.father_name} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Mobile Number</label>
              <input type="text" name="mobile_number" className="form-control" value={formData.mobile_number} onChange={handleChange} required />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Address</label>
              <input type="text" name="address" className="form-control" value={formData.address} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Vehicle Model</label>
              <input type="text" name="vehicle_model" className="form-control" value={formData.vehicle_model} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Vehicle Color</label>
              <input type="text" name="vehicle_color" className="form-control" value={formData.vehicle_color} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Frame Number (VIN)</label>
              <input type="text" name="frame_no" className="form-control" value={formData.frame_no} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Engine Number</label>
              <input type="text" name="engine_no" className="form-control" value={formData.engine_no} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Insurance Company</label>
              <input type="text" name="insurance_company" list="companies" className="form-control" value={formData.insurance_company} onChange={handleChange} placeholder="Select or type..." />
            </div>
          </div>
          
          <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
            <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px', fontSize: '14px', borderRadius: '12px' }}>
              <Save size={18} /> Save & Create Profiles
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Master Processing Status</h3>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '14px' }} />
              <input 
                type="text" 
                className="form-control" 
                placeholder="Search..." 
                style={{ paddingLeft: '40px', width: '280px', borderRadius: '12px' }}
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn" style={{ backgroundColor: '#F0FDF4', color: 'var(--success)', border: '1px solid #BBF7D0' }} onClick={handleExportExcel}>
                <Download size={16} /> Excel
              </button>
              <button className="btn" style={{ backgroundColor: '#FEF2F2', color: 'var(--danger)', border: '1px solid #FECACA' }} onClick={handleExportPDF}>
                <FileText size={16} /> PDF
              </button>
              <button className="btn" style={{ backgroundColor: '#F8FAFC', color: '#475569', border: '1px solid var(--border-color)' }} onClick={handlePrint}>
                <Printer size={16} /> Print
              </button>
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-saas">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                <th>CUSTOMER INFO</th>
                <th>INVOICE NO</th>
                <th>LOCATION</th>
                <th>INSURANCE STATUS</th>
                <th>RTO STATUS</th>
                <th style={{ textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row, idx) => (
                <tr key={row.id}>
                  <td style={{ textAlign: 'center', fontWeight: 600, color: '#94A3B8', fontSize: '12px' }}>{idx + 1}</td>
                  <td style={{ maxWidth: '180px', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', lineHeight: '1.2', marginBottom: '4px' }}>{row.customer_name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{row.frame_no}</div>
                  </td>
                  <td><span style={{ fontFamily: 'monospace', background: '#F8FAFC', padding: '2px 6px', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '12px' }}>{row.invoice_no}</span></td>
                  <td style={{ maxWidth: '160px', whiteSpace: 'normal', wordBreak: 'break-word' }}><span style={{ fontWeight: 500, lineHeight: '1.2' }}>{row.dealer_name}</span></td>
                  <td>{getStatusIcon(row.insurance_status)}</td>
                  <td>{getStatusIcon(row.rto_status)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn" style={{ padding: '8px', color: 'var(--danger)', background: '#FEF2F2', border: 'none', borderRadius: '8px' }} onClick={() => handleDelete(row.id)}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>No records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
