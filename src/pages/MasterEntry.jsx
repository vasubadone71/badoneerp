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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <InvoiceUploadCard onImportSuccess={handleImportSuccess} />
      
      <div className="card">
        <h2 style={{ marginBottom: '24px' }}>Customer Processing Desk (Master Entry)</h2>
        
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
          <div className="form-grid">
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
            <div className="form-group">
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
          
          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary">
              <Save size={18} /> Save & Create Profiles
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3>Master Processing Status</h3>
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
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', color: '#888' }} />
              <input 
                type="text" 
                className="form-control" 
                placeholder="Search..." 
                style={{ paddingLeft: '40px', width: '250px' }}
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
              />
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>S. NO.</th>
                <th>CUSTOMER</th>
                <th>INVOICE</th>
                <th>LOCATION</th>
                <th>INSURANCE STATUS</th>
                <th>RTO STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row, idx) => (
                <tr key={row.id}>
                  <td style={{ textAlign: 'center', fontWeight: 600, color: '#666' }}>{idx + 1}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{row.customer_name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{row.frame_no}</div>
                  </td>
                  <td>{row.invoice_no}</td>
                  <td>{row.dealer_name}</td>
                  <td>{getStatusIcon(row.insurance_status)}</td>
                  <td>{getStatusIcon(row.rto_status)}</td>
                  <td>
                    <button className="btn" style={{ padding: '6px', color: 'var(--danger)' }} onClick={() => handleDelete(row.id)}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#888' }}>No records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
