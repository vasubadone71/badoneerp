import React, { useRef, useEffect } from 'react';
import { UploadCloud, File, X, CheckCircle, RefreshCcw } from 'lucide-react';
import { useInvoiceImport } from '../hooks/useInvoiceImport';
import { InvoiceImportProgress } from './InvoiceImportProgress';
import { InvoiceValidationSummary } from './InvoiceValidationSummary';

export function InvoiceUploadCard({ onImportSuccess }) {
  const fileInputRef = useRef(null);
  const { status, progressText, parsedData, validationResult, error, processInvoice, reset } = useInvoiceImport();
  const [dragActive, setDragActive] = React.useState(false);

  // Keyboard shortcut Ctrl + O
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'o') {
        e.preventDefault();
        fileInputRef.current?.click();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processInvoice(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processInvoice(e.target.files[0]);
    }
  };

  const handleAccept = () => {
    if (parsedData) {
      onImportSuccess(parsedData);
      reset();
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="card" style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UploadCloud size={20} color="var(--primary)" /> Honda Invoice Smart Import
        </h2>
        {status !== 'idle' && (
          <button className="btn" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={reset}>
            <RefreshCcw size={14} /> Clear
          </button>
        )}
      </div>

      {status === 'idle' && (
        <div 
          style={{
            border: `2px dashed ${dragActive ? 'var(--primary)' : 'var(--border-color)'}`,
            borderRadius: 'var(--border-radius)',
            padding: '40px',
            textAlign: 'center',
            backgroundColor: dragActive ? 'rgba(79,70,229,0.05)' : '#F8FAFC',
            transition: 'all 0.2s ease',
            cursor: 'pointer'
          }}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            ref={fileInputRef} 
            type="file" 
            accept="application/pdf" 
            style={{ display: 'none' }} 
            onChange={handleChange} 
          />
          <UploadCloud size={40} color={dragActive ? 'var(--primary)' : '#94A3B8'} style={{ marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)', fontSize: '15px', fontWeight: 600 }}>Drag & Drop PDF Here</h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px' }}>or click to Browse (Ctrl + O)</p>
          <p style={{ margin: '8px 0 0 0', color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Only Honda Invoice PDFs supported</p>
        </div>
      )}

      {status === 'processing' && <InvoiceImportProgress text={progressText} />}

      {status === 'error' && (
        <div style={{ textAlign: 'center', padding: '30px', color: 'var(--danger)', background: '#FEF2F2', borderRadius: '12px', border: '1px solid #FECACA' }}>
          <X size={40} style={{ marginBottom: '12px', opacity: 0.8 }} />
          <h3 style={{ margin: '0 0 8px 0', fontSize: '15px' }}>Import Failed</h3>
          <p style={{ margin: 0, fontSize: '13px', color: '#991B1B' }}>{error}</p>
          <button className="btn" style={{ marginTop: '20px', background: '#FFF', color: 'var(--danger)', borderColor: '#FECACA' }} onClick={reset}>Try Again</button>
        </div>
      )}

      {(status === 'success' || status === 'warning') && parsedData && (
        <div className="animate-fade">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(79,70,229,0.05)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(79,70,229,0.2)' }}>
            <div style={{ background: '#FFF', padding: '12px', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
              <File size={28} color="var(--primary)" />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)', fontSize: '15px', fontWeight: 600 }}>Invoice Processed</h4>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                Customer: <strong style={{ color: 'var(--text-primary)' }}>{parsedData.customerName?.value || 'Unknown'}</strong> | Inv: <strong style={{ color: 'var(--text-primary)' }}>{parsedData.invoiceNumber?.value || 'Unknown'}</strong>
              </p>
            </div>
            <button 
              className="btn btn-primary" 
              style={{ padding: '10px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}
              onClick={handleAccept}
            >
              <CheckCircle size={16} /> Fill Form
            </button>
          </div>

          <InvoiceValidationSummary parsedData={parsedData} validationResult={validationResult} />
        </div>
      )}
    </div>
  );
}
