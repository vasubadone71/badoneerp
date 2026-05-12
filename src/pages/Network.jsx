import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Download, Edit2, Trash2, Shield, User, Smartphone, 
  MapPin, Hash, CheckCircle, Briefcase, Globe, AlertCircle,
  MoreVertical, Search, Filter, ChevronRight
} from 'lucide-react';
import { exportToExcel } from '../utils/export';

export default function Network() {
  const [dealers, setDealers] = useState([]);
  const [formData, setFormData] = useState({
    dealer_name: '', dealer_type: 'Main Dealer', address: '',
    mobile: '', gst_no: '', contact_person: '', status: 'Active'
  });
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadDealers();
  }, []);

  async function loadDealers() {
    if (window.api) {
      const data = await window.api.getDealers();
      setDealers(data);
    }
  }

  const filteredDealers = useMemo(() => {
    return dealers.filter(d => 
      d.dealer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.mobile && d.mobile.includes(searchTerm)) ||
      (d.contact_person && d.contact_person.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [dealers, searchTerm]);

  const stats = useMemo(() => {
    return {
      total: dealers.length,
      main: dealers.filter(d => d.dealer_type === 'Main Dealer').length,
      asc: dealers.filter(d => d.dealer_type === 'ASC').length,
      fo: dealers.filter(d => d.dealer_type === 'FO Point').length
    };
  }, [dealers]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (window.api) {
      let res;
      if (isEditing) {
        res = await window.api.updateDealer({ ...formData, id: isEditing });
      } else {
        res = await window.api.addDealer(formData);
      }

      if (res && res.success) {
        resetForm();
        loadDealers();
      } else {
        alert(res?.error || 'Operation failed. Please check inputs and try again.');
      }
    }
  };

  const handleEdit = (dealer) => {
    setFormData({
      dealer_name: dealer.dealer_name,
      dealer_type: dealer.dealer_type,
      address: dealer.address || '',
      mobile: dealer.mobile || '',
      gst_no: dealer.gst_no || '',
      contact_person: dealer.contact_person || '',
      status: dealer.status || 'Active'
    });
    setIsEditing(dealer.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this dealer? This action cannot be undone.')) {
      const res = await window.api.deleteDealer(id);
      if (res && res.success) {
        loadDealers();
      } else {
        alert(res?.error || 'Failed to delete dealer. It might have existing records.');
      }
    }
  };

  const resetForm = () => {
    setFormData({ dealer_name: '', dealer_type: 'Main Dealer', address: '', mobile: '', gst_no: '', contact_person: '', status: 'Active' });
    setShowForm(false);
    setIsEditing(null);
  };

  const handleExport = () => {
    const exportData = dealers.map(row => ({
      'Dealer Name': row.dealer_name,
      'Type': row.dealer_type,
      'Contact Person': row.contact_person,
      'Mobile': row.mobile,
      'GST': row.gst_no,
      'Address': row.address,
      'Status': row.status
    }));
    exportToExcel('Dealer_Network_Report', exportData);
  };

  return (
    <div className="network-container fade-in">
      {/* HEADER SECTION */}
      <div className="network-header">
        <div className="header-content">
          <div className="icon-badge">
            <Globe size={24} />
          </div>
          <div>
            <h1>Network & Dealer Registry</h1>
            <p>Enterprise Management of Partnership Nodes</p>
          </div>
        </div>
        <div className="header-actions">
          <div className="search-wrapper">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Quick search registry..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn-secondary" onClick={handleExport}>
            <Download size={18} /> Export
          </button>
          <button className="btn-primary-premium" onClick={() => { if (showForm && !isEditing) setShowForm(false); else { resetForm(); setShowForm(true); } }}>
            <Plus size={18} /> {isEditing ? 'Edit Details' : 'Add Dealer'}
          </button>
        </div>
      </div>

      {/* STATS OVERVIEW */}
      <div className="stats-grid-compact">
        <div className="stat-item">
          <div className="s-icon" style={{ background: '#e3f2fd', color: '#1976d2' }}><Briefcase size={16} /></div>
          <div className="s-info"><span>Total Nodes</span><strong>{stats.total}</strong></div>
        </div>
        <div className="stat-item">
          <div className="s-icon" style={{ background: '#fce4ec', color: '#c2185b' }}><Shield size={16} /></div>
          <div className="s-info"><span>Main Dealers</span><strong>{stats.main}</strong></div>
        </div>
        <div className="stat-item">
          <div className="s-icon" style={{ background: '#e8f5e9', color: '#2e7d32' }}><CheckCircle size={16} /></div>
          <div className="s-info"><span>ASCs</span><strong>{stats.asc}</strong></div>
        </div>
        <div className="stat-item">
          <div className="s-icon" style={{ background: '#fff3e0', color: '#e65100' }}><MapPin size={16} /></div>
          <div className="s-info"><span>FO Points</span><strong>{stats.fo}</strong></div>
        </div>
      </div>

      {/* FORM SECTION */}
      {showForm && (
        <div className="form-card-premium shadow-lg animate-slide-down">
          <div className="form-header-bar" style={{ background: isEditing ? '#ff9800' : '#d32f2f' }}></div>
          <div className="form-inner">
            <h3 style={{ color: isEditing ? '#ff9800' : '#d32f2f' }}>
              {isEditing ? 'Modify Network Node' : 'Register New Node'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group-premium">
                  <label><Shield size={14} /> Dealer Name</label>
                  <input type="text" name="dealer_name" value={formData.dealer_name} onChange={handleChange} required />
                </div>
                <div className="form-group-premium">
                  <label><Briefcase size={14} /> Node Category</label>
                  <select name="dealer_type" value={formData.dealer_type} onChange={handleChange}>
                    <option>Main Dealer</option>
                    <option>ASC</option>
                    <option>FO Point</option>
                  </select>
                </div>
                <div className="form-group-premium">
                  <label><User size={14} /> Primary Contact</label>
                  <input type="text" name="contact_person" value={formData.contact_person} onChange={handleChange} />
                </div>
                <div className="form-group-premium">
                  <label><Smartphone size={14} /> Contact Number</label>
                  <input type="text" name="mobile" value={formData.mobile} onChange={handleChange} />
                </div>
                <div className="form-group-premium">
                  <label><Hash size={14} /> Tax Registration (GST)</label>
                  <input type="text" name="gst_no" value={formData.gst_no} onChange={handleChange} />
                </div>
                <div className="form-group-premium">
                  <label><MapPin size={14} /> Physical Address</label>
                  <input type="text" name="address" value={formData.address} onChange={handleChange} />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={resetForm}>Discard</button>
                <button type="submit" className="btn-save-premium">
                  {isEditing ? 'Commit Changes' : 'Register Dealer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TABLE SECTION */}
      <div className="registry-table-card shadow-sm">
        <table className="modern-table">
          <thead>
            <tr>
              <th><Shield size={14} /> Dealer Identity</th>
              <th><Briefcase size={14} /> Type</th>
              <th><User size={14} /> Liaison</th>
              <th><Smartphone size={14} /> Mobile</th>
              <th><Hash size={14} /> GSTIN</th>
              <th><CheckCircle size={14} /> Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDealers.map(d => (
              <tr key={d.id}>
                <td className="dealer-name-cell">
                  <div className="d-title">{d.dealer_name}</div>
                  <div className="d-sub">{d.address || 'No address provided'}</div>
                </td>
                <td>
                  <span className={`type-tag tag-${d.dealer_type.toLowerCase().replace(' ', '-')}`}>
                    {d.dealer_type}
                  </span>
                </td>
                <td className="text-muted">{d.contact_person || 'N/A'}</td>
                <td className="text-bold">{d.mobile || '-'}</td>
                <td><span className="gst-code">{d.gst_no || 'NOT REGISTERED'}</span></td>
                <td>
                  <div className={`status-indicator ${d.status === 'Active' ? 'active' : 'inactive'}`}>
                    <div className="dot"></div>
                    {d.status}
                  </div>
                </td>
                <td>
                  <div className="action-cluster">
                    <button className="action-btn edit" onClick={() => handleEdit(d)} title="Edit Node">
                      <Edit2 size={16} />
                    </button>
                    <button className="action-btn delete" onClick={() => handleDelete(d.id)} title="Delete Node">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredDealers.length === 0 && (
              <tr>
                <td colSpan="7" className="empty-state">
                  <AlertCircle size={40} />
                  <p>No matching nodes found in the registry.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .network-container {
          padding: 20px;
          background: #fdfdfd;
        }

        .network-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .icon-badge {
          width: 50px;
          height: 50px;
          background: #d32f2f;
          color: white;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 15px rgba(211, 47, 47, 0.3);
        }

        .header-content h1 {
          margin: 0;
          font-size: 24px;
          color: #2c3e50;
        }

        .header-content p {
          margin: 4px 0 0;
          color: #7f8c8d;
          font-size: 14px;
        }

        .header-actions {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .search-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          color: #95a5a6;
        }

        .search-wrapper input {
          padding: 10px 15px 10px 40px;
          border: 1.5px solid #eee;
          border-radius: 10px;
          outline: none;
          width: 250px;
          transition: 0.3s;
          background: white;
        }

        .search-wrapper input:focus {
          border-color: #d32f2f;
          box-shadow: 0 0 0 4px rgba(211, 47, 47, 0.05);
          width: 300px;
        }

        .btn-primary-premium {
          background: #d32f2f;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 10px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: 0.2s;
          box-shadow: 0 4px 12px rgba(211, 47, 47, 0.2);
        }

        .btn-primary-premium:hover {
          background: #b71c1c;
          transform: translateY(-2px);
          box-shadow: 0 6px 15px rgba(211, 47, 47, 0.3);
        }

        .btn-secondary {
          background: white;
          color: #2c3e50;
          border: 1.5px solid #eee;
          padding: 10px 20px;
          border-radius: 10px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: 0.2s;
        }

        .btn-secondary:hover {
          background: #f8f9fa;
          border-color: #ddd;
        }

        /* STATS COMPACT */
        .stats-grid-compact {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 30px;
        }

        .stat-item {
          background: white;
          padding: 15px;
          border-radius: 15px;
          display: flex;
          align-items: center;
          gap: 15px;
          border: 1px solid #f1f1f1;
        }

        .s-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .s-info span {
          display: block;
          font-size: 11px;
          text-transform: uppercase;
          color: #95a5a6;
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        .s-info strong {
          font-size: 18px;
          color: #2c3e50;
        }

        /* PREMIUM FORM */
        .form-card-premium {
          background: white;
          border-radius: 18px;
          overflow: hidden;
          margin-bottom: 30px;
          border: 1px solid #eee;
        }

        .form-header-bar {
          height: 4px;
          width: 100%;
        }

        .form-inner {
          padding: 25px;
        }

        .form-inner h3 {
          margin: 0 0 25px;
          font-size: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .form-group-premium {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group-premium label {
          font-size: 12px;
          font-weight: 700;
          color: #7f8c8d;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .form-group-premium input, 
        .form-group-premium select {
          padding: 12px;
          border: 1.5px solid #f1f1f1;
          border-radius: 10px;
          background: #fafafa;
          transition: 0.2s;
          outline: none;
        }

        .form-group-premium input:focus {
          background: white;
          border-color: #d32f2f;
          box-shadow: 0 0 0 4px rgba(211, 47, 47, 0.05);
        }

        .form-actions {
          margin-top: 30px;
          display: flex;
          justify-content: flex-end;
          gap: 15px;
        }

        .btn-cancel {
          background: #f8f9fa;
          border: none;
          padding: 12px 25px;
          border-radius: 10px;
          color: #7f8c8d;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-save-premium {
          background: #2c3e50;
          color: white;
          border: none;
          padding: 12px 30px;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.2s;
        }

        .btn-save-premium:hover {
          background: #1a252f;
          transform: translateY(-2px);
        }

        /* MODERN TABLE */
        .registry-table-card {
          background: white;
          border-radius: 18px;
          border: 1px solid #eee;
          overflow: hidden;
        }

        .modern-table {
          width: 100%;
          border-collapse: collapse;
        }

        .modern-table thead th {
          background: #f8fafc;
          padding: 18px 20px;
          text-align: left;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #94a3b8;
          border-bottom: 1.5px solid #edf2f7;
        }

        .modern-table tbody tr {
          border-bottom: 1px solid #f8fafc;
          transition: 0.2s;
        }

        .modern-table tbody tr:hover {
          background: #fdfdfe;
        }

        .modern-table td {
          padding: 18px 20px;
          vertical-align: middle;
        }

        .dealer-name-cell .d-title {
          font-weight: 700;
          color: #2d3748;
          font-size: 15px;
        }

        .dealer-name-cell .d-sub {
          font-size: 12px;
          color: #a0aec0;
          margin-top: 4px;
        }

        .type-tag {
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
        }

        .tag-main-dealer { background: #ebf8ff; color: #2b6cb0; }
        .tag-asc { background: #f0fff4; color: #2f855a; }
        .tag-fo-point { background: #fffaf0; color: #c05621; }

        .gst-code {
          font-family: monospace;
          background: #f1f5f9;
          padding: 2px 6px;
          border-radius: 4px;
          color: #475569;
          font-size: 12px;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .status-indicator .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .status-indicator.active { color: #2f855a; }
        .status-indicator.active .dot { background: #48bb78; box-shadow: 0 0 8px #48bb78; }
        .status-indicator.inactive { color: #a0aec0; }
        .status-indicator.inactive .dot { background: #cbd5e0; }

        .action-cluster {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }

        .action-btn {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: 0.2s;
        }

        .action-btn.edit { background: #f0f7ff; color: #007bff; }
        .action-btn.edit:hover { background: #007bff; color: white; }

        .action-btn.delete { background: #fff5f5; color: #e53e3e; }
        .action-btn.delete:hover { background: #e53e3e; color: white; }

        .empty-state {
          padding: 80px;
          text-align: center;
          color: #cbd5e0;
        }

        .empty-state p {
          margin-top: 15px;
          font-size: 16px;
        }

        .animate-slide-down {
          animation: slideDown 0.4s ease-out;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .text-muted { color: #718096; }
        .text-bold { font-weight: 700; color: #4a5568; }
      `}} />
    </div>
  );
}
