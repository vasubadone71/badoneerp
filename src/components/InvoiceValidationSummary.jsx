import React from 'react';
import { Check, X, AlertTriangle } from 'lucide-react';

export function InvoiceValidationSummary({ parsedData, validationResult }) {
  const fields = [
    { key: 'invoiceNumber', label: 'Invoice Number' },
    { key: 'customerName', label: 'Customer Name' },
    { key: 'frameNumber', label: 'Frame Number' },
    { key: 'engineNumber', label: 'Engine Number' },
    { key: 'mobileNumber', label: 'Mobile' },
    { key: 'vehicleModel', label: 'Model' },
    { key: 'address', label: 'Address' },
    { key: 'invoiceDate', label: 'Invoice Date' }
  ];

  return (
    <div style={{ marginTop: '16px', background: '#f9f9f9', padding: '16px', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
      <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#333' }}>Extraction Summary</h4>
      
      {validationResult?.duplicates?.length > 0 && (
        <div style={{ marginBottom: '16px', padding: '10px 14px', background: '#ffebee', color: '#c62828', borderRadius: '6px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
            <AlertTriangle size={16} /> Duplicate Found
          </div>
          {validationResult.duplicates.map((dup, i) => (
            <div key={i} style={{ marginLeft: '22px' }}>{dup}</div>
          ))}
        </div>
      )}

      {validationResult?.warnings?.length > 0 && (
        <div style={{ marginBottom: '16px', padding: '10px 14px', background: '#fff3e0', color: '#ef6c00', borderRadius: '6px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
            <AlertTriangle size={16} /> Missing Information
          </div>
          {validationResult.warnings.map((warn, i) => (
            <div key={i} style={{ marginLeft: '22px' }}>{warn}</div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {fields.map(field => {
          const hasData = parsedData[field.key] && parsedData[field.key].value;
          return (
            <div key={field.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: hasData ? '#2e7d32' : '#c62828' }}>
              {hasData ? <Check size={16} /> : <X size={16} />}
              <span style={{ fontWeight: 500, color: '#555' }}>{field.label} {hasData ? 'Found' : 'Missing'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
