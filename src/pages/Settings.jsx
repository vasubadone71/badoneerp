import React, { useState, useEffect } from 'react';
import { 
  Save, DatabaseBackup, Lock, Upload, Building2, 
  MapPin, Hash, Phone, ShieldAlert, History,
  Trash2, RefreshCcw, CheckCircle2, AlertTriangle, Network, FolderOpen, Image as ImageIcon, Download
} from 'lucide-react';
import api from '../utils/api';

export default function Settings() {
  const [settings, setSettings] = useState({
    company_name: '',
    address: '',
    gst: '',
    contact_info: '',
    logo_base64: '',
    database_path: '',
    documents_path: '',
    backup_path: '',
    exports_path: '',
    logs_path: ''
  });
  
  const [backups, setBackups] = useState([]);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const { data } = await api.get('/settings');
        if (data) {
          setSettings({
            company_name: data.company_name || '',
            address: data.address || '',
            gst: data.gst || '',
            contact_info: data.contact_info || '',
            logo_base64: data.logo_base64 || '',
            database_path: data.database_path || '',
            documents_path: data.documents_path || '',
            backup_path: data.backup_path || '',
            exports_path: data.exports_path || '',
            logs_path: data.logs_path || ''
          });
        }
        
        // Fetch backup history
        const historyRes = await api.get('/backup/history');
        if (historyRes.data) {
          setBackups(historyRes.data);
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      }
    }
    loadData();
  }, []);

  const handleChange = (e) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Logo file is too large! Please select an image under 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings({ ...settings, logo_base64: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await api.post('/settings', settings);
      alert('Company Settings updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save settings.');
    }
  };

  const createBackup = async () => {
    try {
      const { data } = await api.post('/backup/create');
      if (data.success && data.filename) {
        alert('Backup created successfully.');
        const historyRes = await api.get('/backup/history');
        if (historyRes.data) setBackups(historyRes.data);
        
        const downloadUrl = `/backup/download/${data.filename}`;
        
        try {
          const response = await api.get(downloadUrl, { responseType: 'blob' });
          const blob = new Blob([response.data]);
          const link = document.createElement('a');
          link.href = window.URL.createObjectURL(blob);
          link.download = data.filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(link.href);
        } catch (downloadErr) {
          console.error("Download failed", downloadErr);
          alert('Backup was created but the automatic download failed.');
        }
      } else if (data.success && data.message) {
        alert(data.message);
        // Do not expect history update if the backend didn't actually create a file (e.g. VPS mock)
      } else {
        alert('Backup created, but no file was returned.');
      }
    } catch (err) {
      alert('Failed to create backup.');
    }
  };

  const handleRestore = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.sql';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const confirm = window.confirm(`WARNING: Restoring from ${file.name} will OVERWRITE all current database entries. This action cannot be undone. Are you sure?`);
      if (!confirm) return;

      const formData = new FormData();
      formData.append('backupFile', file);

      try {
        const { data } = await api.post('/backup/restore', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        if (data.success || data.message) {
          alert('Data Restored Successfully! Application will reload.');
          window.location.reload();
        } else {
          alert('Restore failed: ' + (data.error || 'Unknown error'));
        }
      } catch (err) {
        alert('Restore failed: ' + (err.response?.data?.error || err.message));
      }
    };
    input.click();
  };

  const [resetConfirmationText, setResetConfirmationText] = useState('');
  const [showResetAuth, setShowResetAuth] = useState(false);

  const startFactoryReset = () => {
    const confirm1 = window.confirm('CRITICAL WARNING: This will permanently DELETE all entries, transactions, and network data. ONLY settings will be kept. Do you want to proceed?');
    if (confirm1) {
      setShowResetAuth(true);
    }
  };

  const executeFactoryReset = async () => {
    if (resetConfirmationText !== 'DELETE EVERYTHING') {
      alert('Incorrect confirmation text. Please type "DELETE EVERYTHING" exactly.');
      return;
    }

    setIsResetting(true);
    try {
      const { data } = await api.post('/settings/factory-reset');
      
      if (data.success || data.message) {
        alert('FACTORY RESET SUCCESSFUL!\n\nThe application will now reload.');
        window.location.reload();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err) {
      alert('System Error: ' + err.message);
    } finally {
      setIsResetting(false);
      setShowResetAuth(false);
      setResetConfirmationText('');
    }
  };

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 'calc(100vh - 100px)', paddingBottom: '40px' }}>
      
      {/* ─── Header ─── */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>System Configuration</h1>
        <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>Manage your enterprise settings, backups, and security</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'start' }}>
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card">
            <div style={{ padding: '20px 24px', background: '#F8FAFC', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', background: '#EEF2FF', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4F46E5' }}>
                <Building2 size={20} />
              </div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Company Identity</h3>
            </div>
            
            <form onSubmit={handleSave} style={{ padding: '24px' }}>
              <div className="form-group">
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><Building2 size={14} /> Organization Name</label>
                <input type="text" className="form-control" name="company_name" value={settings.company_name} onChange={handleChange} placeholder="Enter company name" style={{ width: '100%', borderRadius: '10px', padding: '12px' }} />
              </div>
              
              <div className="form-group">
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><ImageIcon size={14} /> Company Logo</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '12px', background: 'white', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {settings.logo_base64 ? (
                      <img src={settings.logo_base64} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <ImageIcon size={24} color="#CBD5E1" />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} id="logo-upload" />
                    <label htmlFor="logo-upload" className="btn" style={{ display: 'inline-flex', padding: '8px 16px', cursor: 'pointer', fontSize: '13px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '8px', fontWeight: 600, alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                      <Upload size={14} /> Upload Logo
                    </label>
                    <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#94A3B8', fontWeight: 500 }}>Recommended: Square PNG/JPG (Max 2MB)</p>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={14} /> Registered Address</label>
                <textarea className="form-control" name="address" rows="3" value={settings.address} onChange={handleChange} placeholder="Full business address" style={{ width: '100%', borderRadius: '10px', padding: '12px' }}></textarea>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><Hash size={14} /> GSTIN Number</label>
                  <input type="text" className="form-control" name="gst" value={settings.gst} onChange={handleChange} placeholder="GST Registration" style={{ width: '100%', borderRadius: '10px', padding: '12px' }} />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={14} /> Support Contact</label>
                  <input type="text" className="form-control" name="contact_info" value={settings.contact_info} onChange={handleChange} placeholder="Mobile/Phone" style={{ width: '100%', borderRadius: '10px', padding: '12px' }} />
                </div>
              </div>

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px', borderRadius: '10px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Save size={18} /> Update Settings
                </button>
              </div>
            </form>
          </div>
        </div>
        
        {/* RIGHT COLUMN: SECURITY & BACKUP */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Backup Management */}
          <div className="card">
            <div style={{ padding: '20px 24px', background: '#F8FAFC', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', background: '#ECFDF5', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
                <DatabaseBackup size={20} />
              </div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Data Governance</h3>
            </div>
            
            <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderBottom: '1px solid var(--border-color)' }}>
              <button onClick={createBackup} className="btn" style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', padding: '12px', borderRadius: '10px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <RefreshCcw size={16} /> Create Snapshot
              </button>
              <button onClick={handleRestore} className="btn" style={{ background: '#FFF7ED', color: '#EA580C', border: '1px solid #FED7AA', padding: '12px', borderRadius: '10px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Upload size={16} /> Restore Point
              </button>
            </div>
            
            <div style={{ padding: '24px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#94A3B8', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={14} /> Recent Backups
              </div>
              <div className="table-responsive">
                <table className="table table-saas" style={{ margin: 0, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '0 0 12px 0', borderBottom: 'none' }}>DATE</th>
                      <th style={{ padding: '0 0 12px 0', borderBottom: 'none' }}>IDENTIFIER</th>
                      <th style={{ padding: '0 0 12px 0', borderBottom: 'none' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backups.slice(0, 5).map(b => {
                      const d = new Date(b.backup_date);
                      const pad = (n) => n.toString().padStart(2, '0');
                      const day = pad(d.getDate());
                      const month = pad(d.getMonth() + 1);
                      const year = d.getFullYear();
                      let hours = d.getHours();
                      const minutes = pad(d.getMinutes());
                      const ampm = hours >= 12 ? 'PM' : 'AM';
                      hours = hours % 12;
                      hours = hours ? hours : 12;
                      const dateStr = `${day}-${month}-${year} ${pad(hours)}:${minutes} ${ampm}`;
                      
                      const identifier = `SNAP-${year}${month}${day}-${pad(d.getHours())}${minutes}`;

                      return (
                      <tr key={b.id}>
                        <td style={{ padding: '12px 0', borderBottom: '1px solid #F1F5F9', fontSize: '12px', color: '#64748B', fontWeight: 500 }}>{dateStr}</td>
                        <td style={{ padding: '12px 0', borderBottom: '1px solid #F1F5F9', fontSize: '12px', fontWeight: 700, color: '#3B82F6' }}>{identifier}</td>
                        <td style={{ padding: '12px 0', borderBottom: '1px solid #F1F5F9', textAlign: 'right' }}>
                          <button 
                            onClick={async () => {
                              try {
                                const response = await api.get(`/backup/download/${b.filename}`, { responseType: 'blob' });
                                const blob = new Blob([response.data]);
                                const link = document.createElement('a');
                                link.href = window.URL.createObjectURL(blob);
                                link.download = b.filename;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                window.URL.revokeObjectURL(link.href);
                              } catch (err) {
                                console.error('Download error:', err);
                                alert('Failed to download backup file.');
                              }
                            }}
                            className="btn"
                            style={{ padding: '6px', background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: '6px' }}
                            title="Download Backup"
                          >
                            <Download size={14} />
                          </button>
                        </td>
                      </tr>
                    )})}
                    {backups.length === 0 && (
                      <tr><td colSpan="3" style={{ padding: '24px', textAlign: 'center', color: '#94A3B8' }}>No history found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* DANGER ZONE */}
          <div className="card" style={{ border: '1px solid #FECACA' }}>
            <div style={{ padding: '20px 24px', background: '#FEF2F2', borderBottom: '1px solid #FECACA', display: 'flex', alignItems: 'center', gap: '12px', borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
              <div style={{ width: '36px', height: '36px', background: 'white', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626', border: '1px solid #FECACA' }}>
                <ShieldAlert size={20} />
              </div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#DC2626' }}>Danger Zone</h3>
            </div>
            
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                <AlertTriangle size={24} color="#DC2626" style={{ flexShrink: 0 }} />
                <div>
                  <strong style={{ display: 'block', color: 'var(--text-primary)', fontSize: '14px', marginBottom: '4px' }}>Factory Data Reset</strong>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>Permanently wipe all dealership transactions & nodes. This cannot be undone.</p>
                </div>
              </div>

              {!showResetAuth ? (
                <button 
                  onClick={startFactoryReset} 
                  className="btn"
                  style={{ width: '100%', background: '#FFF5F5', color: '#DC2626', border: '1px solid #FECACA', padding: '12px', borderRadius: '10px', fontWeight: 700 }}
                  disabled={isResetting}
                >
                  {isResetting ? 'Processing...' : 'Initiate Full Reset'}
                </button>
              ) : (
                <div className="animate-fade" style={{ background: '#FEF2F2', border: '1px solid #FECACA', padding: '16px', borderRadius: '12px' }}>
                  <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#B91C1C', fontWeight: 500 }}>Type <strong style={{ fontWeight: 800 }}>DELETE EVERYTHING</strong> to confirm:</p>
                  <input 
                    type="text" 
                    className="form-control"
                    value={resetConfirmationText}
                    onChange={(e) => setResetConfirmationText(e.target.value)}
                    placeholder="Type confirmation here..."
                    autoFocus
                    style={{ width: '100%', padding: '12px', border: '2px solid #FCA5A5', borderRadius: '8px', fontWeight: 700, color: '#B91C1C', marginBottom: '16px' }}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                    <button className="btn" onClick={() => setShowResetAuth(false)} style={{ padding: '10px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '8px', fontWeight: 600 }}>Cancel</button>
                    <button 
                      className="btn"
                      onClick={executeFactoryReset} 
                      disabled={isResetting || resetConfirmationText !== 'DELETE EVERYTHING'}
                      style={{ padding: '10px', background: '#DC2626', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, opacity: (isResetting || resetConfirmationText !== 'DELETE EVERYTHING') ? 0.5 : 1 }}
                    >
                      {isResetting ? 'Wiping Data...' : 'Permanently Delete'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
