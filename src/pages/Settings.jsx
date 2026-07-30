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
    <div className="settings-wrapper fade-in">
      <div className="settings-header">
        <h1>System Configuration</h1>
        <p>Manage your enterprise settings, backups, and security</p>
      </div>

      <div className="settings-grid">
        {/* LEFT COLUMN */}
        <div className="settings-main-col" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="settings-card shadow-lg">
          <div className="card-header-premium">
            <Building2 size={20} />
            <h3>Company Identity</h3>
          </div>
          <form onSubmit={handleSave} className="form-container-premium">
            <div className="premium-form-group">
              <label><Building2 size={14} /> Organization Name</label>
              <input type="text" name="company_name" value={settings.company_name} onChange={handleChange} placeholder="Enter company name" />
            </div>
            
            <div className="premium-form-group">
              <label><ImageIcon size={14} /> Company Logo</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{
                  width: '60px', height: '60px', borderRadius: '8px', 
                  border: '1px dashed #ccc', display: 'flex', alignItems: 'center', 
                  justifyContent: 'center', overflow: 'hidden', background: '#f8f9fa'
                }}>
                  {settings.logo_base64 ? (
                    <img src={settings.logo_base64} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <ImageIcon size={24} color="#ccc" />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} id="logo-upload" />
                  <label htmlFor="logo-upload" className="btn-action-premium blue" style={{ display: 'inline-flex', padding: '8px 16px', cursor: 'pointer', fontSize: '13px' }}>
                    <Upload size={14} style={{ marginRight: '6px' }} /> Upload Logo
                  </label>
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#888' }}>Recommended: Square PNG/JPG (Max 2MB)</p>
                </div>
              </div>
            </div>
            <div className="premium-form-group">
              <label><MapPin size={14} /> Registered Address</label>
              <textarea name="address" rows="3" value={settings.address} onChange={handleChange} placeholder="Full business address"></textarea>
            </div>
            <div className="form-row-premium">
              <div className="premium-form-group">
                <label><Hash size={14} /> GSTIN Number</label>
                <input type="text" name="gst" value={settings.gst} onChange={handleChange} placeholder="GST Registration" />
              </div>
              <div className="premium-form-group">
                <label><Phone size={14} /> Support Contact</label>
                <input type="text" name="contact_info" value={settings.contact_info} onChange={handleChange} placeholder="Mobile/Phone" />
              </div>
            </div>
            <div className="form-footer-premium">
              <button type="submit" className="btn-premium-save">
                <Save size={18} /> Update Settings
              </button>
            </div>
          </form>
        </div>

        </div>
        
        {/* RIGHT COLUMN: SECURITY & BACKUP */}
        <div className="settings-side-col">
          {/* Backup Management */}
          <div className="settings-card shadow-sm">
            <div className="card-header-premium">
              <DatabaseBackup size={20} />
              <h3>Data Governance</h3>
            </div>
            <div className="backup-actions-premium">
              <button onClick={createBackup} className="btn-action-premium blue">
                <RefreshCcw size={18} /> Create Snapshot
              </button>
              <button onClick={handleRestore} className="btn-action-premium orange">
                <Upload size={18} /> Restore Point
              </button>
            </div>
            
            <div className="backup-history-section">
              <div className="history-label">
                <History size={14} /> Recent Backups
              </div>
              <div className="history-table-compact">
                <table>
                  <thead>
                    <tr>
                      <th>DATE</th>
                      <th>IDENTIFIER</th>
                      <th>FILE NAME</th>
                      <th>ACTION</th>
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
                        <td>{dateStr}</td>
                        <td style={{ fontWeight: 'bold', color: '#1976d2' }}>{identifier}</td>
                        <td className="file-name-cell" title={b.filename}>{b.filename}</td>
                        <td>
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
                            style={{ background: 'transparent', border: 'none', color: '#1976d2', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            title="Download Backup"
                          >
                            <Download size={14} />
                          </button>
                        </td>
                      </tr>
                    )})}
                    {backups.length === 0 && (
                      <tr><td colSpan="4" className="empty-history">No history found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* DANGER ZONE */}
          <div className="settings-card shadow-sm border-danger">
            <div className="card-header-premium danger">
              <ShieldAlert size={20} />
              <h3>Danger Zone</h3>
            </div>
            <div className="danger-content-premium">
              <div className="danger-info">
                <AlertTriangle size={24} className="danger-icon" />
                <div>
                  <strong>Factory Data Reset</strong>
                  <p>Permanently wipe all dealership transactions & nodes. This cannot be undone.</p>
                </div>
              </div>

              {!showResetAuth ? (
                <button 
                  onClick={startFactoryReset} 
                  className="btn-danger-premium"
                  disabled={isResetting}
                >
                  {isResetting ? 'Processing...' : 'Initiate Full Reset'}
                </button>
              ) : (
                <div className="reset-auth-panel fade-in">
                  <p className="auth-label">Type <strong>DELETE EVERYTHING</strong> to confirm:</p>
                  <input 
                    type="text" 
                    className="auth-input"
                    value={resetConfirmationText}
                    onChange={(e) => setResetConfirmationText(e.target.value)}
                    placeholder="Type confirmation here..."
                    autoFocus
                  />
                  <div className="auth-actions">
                    <button onClick={() => setShowResetAuth(false)} className="btn-auth-cancel">Cancel</button>
                    <button 
                      onClick={executeFactoryReset} 
                      className="btn-auth-confirm"
                      disabled={isResetting || resetConfirmationText !== 'DELETE EVERYTHING'}
                    >
                      {isResetting ? 'Wiping Data...' : 'Permanently Delete All Data'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

        .reset-auth-panel {
          background: #fff8f8;
          border: 1px solid #ffebee;
          padding: 15px;
          border-radius: 12px;
          margin-top: 10px;
        }
        .auth-label { font-size: 13px; margin-bottom: 10px; color: #d32f2f; }
        .auth-input {
          width: 100%;
          padding: 12px;
          border: 2px solid #ffcdd2;
          border-radius: 8px;
          font-weight: 700;
          color: #d32f2f;
          margin-bottom: 12px;
          outline: none;
        }
        .auth-input:focus { border-color: #d32f2f; box-shadow: 0 0 0 3px rgba(211, 47, 47, 0.1); }
        .auth-actions { display: grid; grid-template-columns: 1fr 2fr; gap: 10px; }
        .btn-auth-cancel {
          padding: 10px;
          border: 1px solid #ddd;
          background: white;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }
        .btn-auth-confirm {
          padding: 10px;
          border: none;
          background: #d32f2f;
          color: white;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
        }
        .btn-auth-confirm:disabled { opacity: 0.5; cursor: not-allowed; }
        .settings-wrapper {
          padding: 24px;
          background: #fcfcfc;
        }

        .settings-header {
          margin-bottom: 30px;
        }

        .settings-header h1 {
          font-size: 26px;
          color: #1a252f;
          margin: 0;
        }

        .settings-header p {
          color: #7f8c8d;
          margin: 5px 0 0;
          font-size: 14px;
        }

        .settings-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 24px;
          align-items: start;
        }

        .settings-side-col {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .settings-card {
          background: white;
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid #f1f1f1;
        }

        .border-accent { border-left: 5px solid #1976d2; }
        .border-danger { border: 1px solid #ffebee; border-left: 5px solid #d32f2f; }

        .card-header-premium {
          padding: 18px 24px;
          background: #f8fafc;
          border-bottom: 1px solid #f1f1f1;
          display: flex;
          align-items: center;
          gap: 12px;
          color: #2c3e50;
        }

        .card-header-premium.danger {
          background: #fff5f5;
          color: #d32f2f;
        }

        .card-header-premium h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
        }

        /* FORM STYLING */
        .form-container-premium {
          padding: 24px;
        }

        .premium-form-group {
          margin-bottom: 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-row-premium {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .premium-form-group label {
          font-size: 12px;
          font-weight: 700;
          color: #94a3b8;
          display: flex;
          align-items: center;
          gap: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .premium-form-group input, 
        .premium-form-group textarea {
          padding: 14px;
          border: 1.5px solid #f1f1f1;
          border-radius: 12px;
          background: #fafafa;
          outline: none;
          transition: 0.2s;
        }

        .premium-form-group input:focus, 
        .premium-form-group textarea:focus {
          border-color: #1976d2;
          background: white;
          box-shadow: 0 0 0 4px rgba(25, 118, 210, 0.05);
        }

        .form-footer-premium {
          margin-top: 10px;
          display: flex;
          justify-content: flex-end;
        }

        .btn-premium-save {
          background: #d32f2f;
          color: white;
          border: none;
          padding: 14px 28px;
          border-radius: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          transition: 0.2s;
          box-shadow: 0 4px 12px rgba(211, 47, 47, 0.2);
        }

        .btn-premium-save:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 15px rgba(211, 47, 47, 0.3);
        }

        /* SECURITY BOX */
        .security-status-box {
          padding: 24px;
        }

        .status-indicator-premium {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          margin-bottom: 8px;
        }

        .status-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }

        .status-dot.active { background: #4caf50; box-shadow: 0 0 8px #4caf50; }
        .status-dot.inactive { background: #f44336; }

        .security-note {
          font-size: 12px;
          color: #94a3b8;
          margin: 0;
        }

        /* BACKUP ACTIONS */
        .backup-actions-premium {
          padding: 24px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }

        .btn-action-premium {
          border: none;
          padding: 14px;
          border-radius: 14px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: 0.2s;
        }

        .btn-action-premium.blue { background: #e3f2fd; color: #1976d2; }
        .btn-action-premium.blue:hover { background: #1976d2; color: white; }
        .btn-action-premium.orange { background: #fff3e0; color: #e65100; }
        .btn-action-premium.orange:hover { background: #e65100; color: white; }

        .backup-history-section {
          padding: 0 24px 24px;
        }

        .history-label {
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          color: #94a3b8;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .history-table-compact table {
          width: 100%;
          border-collapse: collapse;
        }

        .history-table-compact th {
          text-align: left;
          font-size: 10px;
          color: #cbd5e1;
          padding-bottom: 8px;
        }

        .history-table-compact td {
          padding: 10px 0;
          font-size: 12px;
          color: #475569;
          border-bottom: 1px solid #f8fafc;
        }

        .file-name-cell {
          font-family: monospace;
          color: #94a3b8;
        }

        .empty-history {
          text-align: center;
          color: #cbd5e1;
          padding: 20px 0;
        }

        /* DANGER ZONE */
        .danger-content-premium {
          padding: 24px;
        }

        .danger-info {
          display: flex;
          gap: 15px;
          margin-bottom: 20px;
        }

        .danger-icon { color: #f44336; }

        .danger-info strong {
          display: block;
          color: #2c3e50;
          font-size: 14px;
        }

        .danger-info p {
          margin: 4px 0 0;
          font-size: 12px;
          color: #94a3b8;
          line-height: 1.4;
        }

        .btn-danger-premium {
          width: 100%;
          background: #fff5f5;
          color: #d32f2f;
          border: 1px solid #ffebee;
          padding: 12px;
          border-radius: 10px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s;
        }

        .btn-danger-premium:hover {
          background: #d32f2f;
          color: white;
        }

        .btn-danger-premium:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}} />
    </div>
  );
}
