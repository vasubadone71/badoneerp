import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Download, Edit2, Trash2, Shield, User, Smartphone, 
  MapPin, Hash, CheckCircle, Briefcase, Globe, AlertCircle,
  MoreVertical, Search, Filter, ChevronRight
} from 'lucide-react';
import { exportToExcel } from '../utils/export';
import api from '../utils/api';

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
    try {
      const { data } = await api.get('/dealers');
      setDealers(data || []);
    } catch (err) {
      console.error("Failed to load dealers:", err);
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
    try {
      if (isEditing) {
        await api.put(`/dealers/${isEditing}`, formData);
      } else {
        await api.post('/dealers', formData);
      }
      resetForm();
      loadDealers();
    } catch (err) {
      alert(err.response?.data?.error || 'Operation failed. Please check inputs and try again.');
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
      try {
        await api.delete(`/dealers/${id}`);
        loadDealers();
      } catch (err) {
        alert(err.response?.data?.error || 'Failed to delete dealer. It might have existing records.');
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
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 'calc(100vh - 100px)', paddingBottom: '40px' }}>
      
      {/* ─── Header Card ─── */}
      <div className="card" style={{ marginBottom: '24px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', backgroundColor: '#EEF2FF', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', border: '1px solid #E0E7FF' }}>
              <Globe size={24} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Network & Dealer Registry</h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>Enterprise Management of Partnership Nodes</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ position: 'relative', minWidth: '240px' }}>
              <Search style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} size={16} />
              <input 
                type="text" 
                className="form-control"
                placeholder="Search registry..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '40px', width: '100%', fontSize: '13px', borderRadius: '12px' }}
              />
            </div>
            <button className="btn" style={{ backgroundColor: '#F8FAFC', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, borderRadius: '8px' }} onClick={handleExport}>
              <Download size={16} /> Export
            </button>
            <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '8px' }} onClick={() => { if (showForm && !isEditing) setShowForm(false); else { resetForm(); setShowForm(true); } }}>
              <Plus size={16} /> {isEditing ? 'Edit Details' : 'Add Dealer'}
            </button>
          </div>
        </div>

        {/* ─── Summary Bar ─── */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {[
            { label: 'Total Nodes', value: stats.total, color: 'var(--primary)', icon: <Briefcase size={20} />, bg: '#EEF2FF' },
            { label: 'Main Dealers', value: stats.main, color: 'var(--danger)', icon: <Shield size={20} />, bg: '#FEF2F2' },
            { label: 'ASCs',   value: stats.asc,    color: 'var(--success)', icon: <CheckCircle size={20} />, bg: '#F0FDF4' },
            { label: 'FO Points', value: stats.fo, color: 'var(--warning)', icon: <MapPin size={20} />, bg: '#FFF7ED' },
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
      </div>

      {/* ─── FORM SECTION ─── */}
      {showForm && (
        <div className="card animate-fade" style={{ marginBottom: '24px', padding: '24px', borderTop: `4px solid ${isEditing ? 'var(--warning)' : 'var(--primary)'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: isEditing ? 'var(--warning)' : 'var(--primary)' }}>
              {isEditing ? 'Modify Network Node' : 'Register New Node'}
            </h3>
          </div>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
              <div className="form-group">
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><Shield size={14} /> Dealer Name</label>
                <input type="text" className="form-control" name="dealer_name" value={formData.dealer_name} onChange={handleChange} required style={{ borderRadius: '8px', padding: '10px 12px' }} />
              </div>
              <div className="form-group">
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><Briefcase size={14} /> Node Category</label>
                <select className="form-control" name="dealer_type" value={formData.dealer_type} onChange={handleChange} style={{ borderRadius: '8px', padding: '10px 12px' }}>
                  <option>Main Dealer</option>
                  <option>ASC</option>
                  <option>FO Point</option>
                </select>
              </div>
              <div className="form-group">
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><User size={14} /> Primary Contact</label>
                <input type="text" className="form-control" name="contact_person" value={formData.contact_person} onChange={handleChange} style={{ borderRadius: '8px', padding: '10px 12px' }} />
              </div>
              <div className="form-group">
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><Smartphone size={14} /> Contact Number</label>
                <input type="text" className="form-control" name="mobile" value={formData.mobile} onChange={handleChange} style={{ borderRadius: '8px', padding: '10px 12px' }} />
              </div>
              <div className="form-group">
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><Hash size={14} /> Tax Registration (GST)</label>
                <input type="text" className="form-control" name="gst_no" value={formData.gst_no} onChange={handleChange} style={{ borderRadius: '8px', padding: '10px 12px' }} />
              </div>
              <div className="form-group">
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={14} /> Physical Address</label>
                <input type="text" className="form-control" name="address" value={formData.address} onChange={handleChange} style={{ borderRadius: '8px', padding: '10px 12px' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border-color)' }}>
              <button type="button" className="btn" style={{ padding: '10px 24px', borderRadius: '8px', background: '#F1F5F9', color: '#475569', fontWeight: 600 }} onClick={resetForm}>Discard</button>
              <button type="submit" className="btn btn-primary" style={{ padding: '10px 24px', borderRadius: '8px', fontWeight: 600 }}>
                {isEditing ? 'Commit Changes' : 'Register Dealer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── TABLE SECTION ─── */}
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive" style={{ flex: 1, overflowY: 'auto' }}>
          <table className="table table-saas" style={{ margin: 0 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 3 }}>
              <tr>
                <th style={{ minWidth: '220px' }}>DEALER IDENTITY</th>
                <th>TYPE</th>
                <th>LIAISON</th>
                <th>MOBILE</th>
                <th>GSTIN</th>
                <th>STATUS</th>
                <th style={{ width: '120px', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredDealers.map(d => (
                <tr key={d.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>{d.dealer_name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{d.address || 'No address provided'}</div>
                  </td>
                  <td>
                    <span style={{ 
                      padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
                      background: d.dealer_type === 'Main Dealer' ? '#EEF2FF' : d.dealer_type === 'ASC' ? '#F0FDF4' : '#FFF7ED',
                      color: d.dealer_type === 'Main Dealer' ? '#4F46E5' : d.dealer_type === 'ASC' ? '#16A34A' : '#EA580C'
                    }}>
                      {d.dealer_type}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{d.contact_person || 'N/A'}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{d.mobile || '-'}</td>
                  <td><span style={{ fontFamily: 'monospace', background: '#F8FAFC', padding: '4px 8px', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '12px', color: 'var(--text-secondary)' }}>{d.gst_no || 'NOT REGISTERED'}</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: d.status === 'Active' ? 'var(--success)' : 'var(--text-secondary)' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: d.status === 'Active' ? '#22C55E' : '#94A3B8', boxShadow: d.status === 'Active' ? '0 0 6px rgba(34, 197, 94, 0.4)' : 'none' }}></div>
                      {d.status}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button className="btn" style={{ padding: '8px', backgroundColor: '#EEF2FF', color: 'var(--primary)', border: 'none', borderRadius: '8px' }} title="Edit Node" onClick={() => handleEdit(d)}>
                        <Edit2 size={16} />
                      </button>
                      <button className="btn" style={{ padding: '8px', backgroundColor: '#FEF2F2', color: 'var(--danger)', border: 'none', borderRadius: '8px' }} title="Delete Node" onClick={() => handleDelete(d.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredDealers.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '60px', color: '#94A3B8' }}>
                    <Globe size={48} style={{ marginBottom: '16px', opacity: 0.2 }} />
                    <p style={{ margin: 0 }}>No matching nodes found in the registry.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
