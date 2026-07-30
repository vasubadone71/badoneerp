import React from 'react';
import { Loader2 } from 'lucide-react';

export function InvoiceImportProgress({ text }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px' }}>
      <Loader2 className="animate-spin" size={32} color="#1976d2" style={{ animation: 'spin 1s linear infinite' }} />
      <div style={{ marginTop: '12px', fontSize: '14px', color: '#555', fontWeight: 500 }}>
        {text || 'Processing...'}
      </div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
