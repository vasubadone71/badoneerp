import { useState, useCallback } from 'react';
import { HondaInvoiceImportService } from '../services/HondaInvoiceImportService';
import { HondaInvoiceValidator } from '../validators/HondaInvoiceValidator';

export function useInvoiceImport() {
  // state: 'idle' | 'processing' | 'success' | 'error' | 'warning'
  const [status, setStatus] = useState('idle');
  const [progressText, setProgressText] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [error, setError] = useState(null);

  const processInvoice = useCallback(async (file) => {
    if (file.type !== 'application/pdf') {
      setStatus('error');
      setError('Please upload a valid PDF file.');
      return;
    }

    try {
      setStatus('processing');
      setProgressText('Reading PDF...');
      
      const data = await HondaInvoiceImportService.process(file);
      setParsedData(data);

      setProgressText('Validating data...');
      const validation = await HondaInvoiceValidator.validate(data);
      setValidationResult(validation);

      if (validation.duplicates.length > 0) {
        setStatus('warning');
      } else {
        setStatus('success');
      }
    } catch (err) {
      console.error(err);
      setStatus('error');
      setError(err.message || 'An error occurred during extraction.');
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setProgressText('');
    setParsedData(null);
    setValidationResult(null);
    setError(null);
  }, []);

  return {
    status,
    progressText,
    parsedData,
    validationResult,
    error,
    processInvoice,
    reset
  };
}
