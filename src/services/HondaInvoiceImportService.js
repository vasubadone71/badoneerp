import { PdfTextExtractor } from './PdfTextExtractor';
import { OcrFallbackService } from './OcrFallbackService';
import { HondaInvoiceParser } from './HondaInvoiceParser';

export class HondaInvoiceImportService {
  static async process(file) {
    let text = '';
    const startTime = performance.now();
    let method = 'direct';

    try {
      // 1. Try direct extraction first
      text = await PdfTextExtractor.extract(file);
    } catch (err) {
      if (err.message === 'PDF_IS_IMAGE') {
        // 2. Fallback to OCR if it's a scanned image
        method = 'ocr';
        text = await OcrFallbackService.extract(file);
      } else {
        throw err;
      }
    }

    // 3. Parse the extracted text
    const parsedData = HondaInvoiceParser.parse(text);
    
    const processingTimeMs = performance.now() - startTime;
    console.log(`HondaInvoiceImportService: Processed via ${method} in ${processingTimeMs.toFixed(0)}ms`);

    return parsedData;
  }
}
