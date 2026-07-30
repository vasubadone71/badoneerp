import api from '../utils/api';

export class HondaInvoiceValidator {
  /**
   * Validates parsed data and checks for duplicates on the server.
   * @param {Object} parsedData 
   * @returns {Object} validationResult
   */
  static async validate(parsedData) {
    const warnings = [];
    const duplicates = [];

    // Basic required fields check
    const required = [
      { key: 'invoiceNumber', label: 'Invoice Number' },
      { key: 'customerName', label: 'Customer Name' },
      { key: 'frameNumber', label: 'Frame Number' },
      { key: 'engineNumber', label: 'Engine Number' }
    ];

    for (const req of required) {
      if (!parsedData[req.key] || !parsedData[req.key].value) {
        warnings.push(`${req.label} could not be extracted.`);
      }
    }

    // Duplicate check on the backend
    try {
      // The current API allows fetching master entries
      const { data: masterData } = await api.get('/master');
      
      const invNo = parsedData.invoiceNumber?.value;
      const frameNo = parsedData.frameNumber?.value;
      const engineNo = parsedData.engineNumber?.value;

      if (invNo || frameNo || engineNo) {
        for (const entry of masterData) {
          if (invNo && entry.invoice_no === invNo) {
            duplicates.push(`Invoice Number ${invNo} already exists.`);
          }
          if (frameNo && entry.frame_no === frameNo) {
            duplicates.push(`Frame Number ${frameNo} already exists.`);
          }
          if (engineNo && entry.engine_no === engineNo) {
            duplicates.push(`Engine Number ${engineNo} already exists.`);
          }
        }
      }
    } catch (err) {
      console.warn("Could not check duplicates:", err);
      warnings.push("Failed to verify duplicate records with the server.");
    }

    // Deduplicate the warnings
    const uniqueDuplicates = [...new Set(duplicates)];

    return {
      isValid: uniqueDuplicates.length === 0,
      warnings,
      duplicates: uniqueDuplicates
    };
  }
}
