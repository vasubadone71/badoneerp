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
        <h2 style={{ margin: 0, fontSize: '18px', color: '#1976d2', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UploadCloud size={22} /> Honda Invoice Smart Import
        </h2>
        {status !== 'idle' && (
          <button className="btn" style={{ fontSize: '12px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={reset}>
            <RefreshCcw size={14} /> Clear
          </button>
        )}
      </div>

      {status === 'idle' && (
        <div 
          style={{
            border: `2px dashed ${dragActive ? '#1976d2' : '#ccc'}`,
            borderRadius: '12px',
            padding: '40px',
            textAlign: 'center',
            backgroundColor: dragActive ? '#f0f7ff' : '#fafafa',
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
          <UploadCloud size={48} color={dragActive ? '#1976d2' : '#999'} style={{ marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>Drag & Drop PDF Here</h3>
          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>or click to Browse (Ctrl + O)</p>
          <p style={{ margin: '8px 0 0 0', color: '#999', fontSize: '12px' }}>Only Honda Invoice PDFs supported</p>
        </div>
      )}

      {status === 'processing' && <InvoiceImportProgress text={progressText} />}

      {status === 'error' && (
        <div style={{ textAlign: 'center', padding: '30px', color: '#c62828' }}>
          <X size={48} style={{ marginBottom: '16px', opacity: 0.8 }} />
          <h3 style={{ margin: '0 0 8px 0' }}>Import Failed</h3>
          <p style={{ margin: 0, fontSize: '14px' }}>{error}</p>
          <button className="btn" style={{ marginTop: '20px' }} onClick={reset}>Try Again</button>
        </div>
      )}

      {(status === 'success' || status === 'warning') && parsedData && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f0f7ff', padding: '16px', borderRadius: '8px', border: '1px solid #1976d240' }}>
            <File size={32} color="#1976d2" />
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 4px 0', color: '#1976d2' }}>Invoice Processed</h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#555' }}>
                Customer: <strong>{parsedData.customerName?.value || 'Unknown'}</strong> | Inv: <strong>{parsedData.invoiceNumber?.value || 'Unknown'}</strong>
              </p>
            </div>
            <button 
              className="btn btn-primary" 
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#2e7d32', border: 'none' }}
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
