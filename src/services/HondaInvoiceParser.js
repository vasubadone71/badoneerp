export class HondaInvoiceParser {
  static parse(rawText) {
    // Normalize text: remove carriage returns, duplicate spaces, convert line breaks to spaces for some searches
    const text = rawText.replace(/\r/g, '\n');
    const cleanText = text.replace(/\s+/g, ' ');

    const result = {
      invoiceNumber: null,
      invoiceDate: null,
      customerName: null,
      fatherName: null,
      mobileNumber: null,
      address: null,
      vehicleModel: null,
      vehicleColor: null,
      frameNumber: null,
      engineNumber: null
    };

    const getMatch = (regex, group = 1) => {
      const match = cleanText.match(regex) || text.match(regex);
      return match ? match[group].trim() : null;
    };

    // 1. Invoice Number
    const invoiceNo = getMatch(/Invoice Number\s*[:-]+\s*([A-Z0-9-]+)/i) || 
                      getMatch(/Invoice Number\s*:\s*([A-Z0-9-]+)/i);
    if (invoiceNo) result.invoiceNumber = { value: invoiceNo, confidence: 100 };

    // 2. Invoice Date
    const invoiceDateStr = getMatch(/Invoice Date\s*[:-]+\s*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i) ||
                           getMatch(/Invoice Date\s*:\s*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i);
    if (invoiceDateStr) {
      const parts = invoiceDateStr.split(/[\/\-]/);
      if (parts.length === 3) {
        // Assume DD/MM/YYYY
        result.invoiceDate = { value: `${parts[2]}-${parts[1]}-${parts[0]}`, confidence: 100 };
      }
    }

    // 3 & 4. Customer Name and Father Name
    // Usually found in the "Bill To (Details of Recipient)" section
    const nameMatch = cleanText.match(/Customer Name\s*:\s*([A-Z\s]+?)\s+(S\/O|D\/O|W\/O)\s+([A-Z\s]+?)(?=\s+Address|\s+Email|\s+State|\s+Pin Code)/i);
    if (nameMatch) {
      result.customerName = { value: nameMatch[1].trim(), confidence: 100 };
      result.fatherName = { value: nameMatch[3].trim(), confidence: 100 };
    } else {
      // Fallback if no relationship indicator
      const fallbackNameMatch = cleanText.match(/Customer Name\s*:\s*(.*?)(?=\s+Address|\s+Email|\s+State|\s+Pin Code)/i);
      if (fallbackNameMatch) {
        let name = fallbackNameMatch[1].trim();
        // Sometimes it catches the dealer name too, let's filter if it contains "BADONE"
        if (name.toLowerCase().includes('badone motors')) {
           const nextMatch = cleanText.substring(cleanText.indexOf(name) + name.length).match(/Customer Name\s*:\s*(.*?)(?=\s+Address|\s+Email|\s+State|\s+Pin Code)/i);
           if (nextMatch) name = nextMatch[1].trim();
        }
        result.customerName = { value: name, confidence: 70 };
      }
    }

    // 5. Mobile Number
    const mobile = getMatch(/Phone\s*\(M\)\s*:\s*(\d{10})/i) || getMatch(/Mobile No\s*:\s*(\d{10})/i);
    if (mobile) result.mobileNumber = { value: mobile, confidence: 100 };

    // 6. Address
    // Find address specifically in the Bill To section if possible
    const addressMatches = [...cleanText.matchAll(/Address\s*:\s*(.*?)(?=\s*Pin Code|\s*Email|\s*State\s*:)/ig)];
    if (addressMatches.length >= 2) {
      result.address = { value: addressMatches[addressMatches.length - 1][1].trim(), confidence: 90 };
    } else if (addressMatches.length > 0) {
      result.address = { value: addressMatches[0][1].trim(), confidence: 80 };
    }

    // 7, 8, 9, 10: Model, Color, Frame, Engine
    // Usually these are in a table row: ACTIVA 125 ... 5ID/ ACTIVA 125 DISC P BLACK ME4... JK4...
    const frameMatch = cleanText.match(/([A-Z0-9]{17})\s+([A-Z0-9]{11,15})/i);
    if (frameMatch) {
      result.frameNumber = { value: frameMatch[1], confidence: 100 };
      result.engineNumber = { value: frameMatch[2], confidence: 100 };

      // Look at the text before the frame number to extract Model and Color
      const beforeFrame = cleanText.substring(0, cleanText.indexOf(frameMatch[1])).trim();
      const parts = beforeFrame.split(/(?:87112019|HSN|Type \/ Variant|Colour)/i);
      const modelColorStr = parts[parts.length - 1].trim();
      
      // Attempt to separate model and color.
      // E.g., "5ID/ ACTIVA 125 DISC P BLACK"
      const subParts = modelColorStr.split(' ');
      if (subParts.length > 2) {
        // Color is typically the last 1-3 words
        // As a simple heuristic, we'll take the last 2 words as color if they exist.
        const color = subParts.slice(-2).join(' ');
        const model = subParts.slice(0, -2).join(' ');
        result.vehicleColor = { value: color, confidence: 70 };
        result.vehicleModel = { value: model, confidence: 70 };
      } else {
        result.vehicleModel = { value: modelColorStr, confidence: 50 };
      }
    } else {
      // Fallbacks
      const frameFallback = getMatch(/Frame no[.\s:]*([A-Z0-9]{17})/i) || getMatch(/Chassis No[.\s:]*([A-Z0-9]{17})/i);
      if (frameFallback) result.frameNumber = { value: frameFallback, confidence: 90 };

      const engineFallback = getMatch(/Engine no[.\/]*Motor no[.\s:]*([A-Z0-9]{11,15})/i) || getMatch(/Engine No[.\s:]*([A-Z0-9]{11,15})/i);
      if (engineFallback) result.engineNumber = { value: engineFallback, confidence: 90 };
    }

    // Normalize values
    for (const key in result) {
      if (result[key] && result[key].value) {
        let val = result[key].value;
        val = val.replace(/\s+/g, ' ').trim();
        val = val.replace(/[,.;:]$/, ''); // Remove trailing punctuation
        result[key].value = val;
      }
    }

    return result;
  }
}
