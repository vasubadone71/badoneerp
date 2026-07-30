import * as pdfjsLib from 'pdfjs-dist';
// For Vite, you can import the worker this way, or we can use the CDN as a fallback if it doesn't work.
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export class PdfTextExtractor {
  static async extract(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
      }
      
      // If the extracted text is suspiciously short, it might be an image/scan
      if (fullText.trim().length < 50) {
        throw new Error('PDF_IS_IMAGE');
      }
      
      return fullText;
    } catch (err) {
      if (err.message === 'PDF_IS_IMAGE') throw err;
      throw new Error(`Failed to extract text from PDF: ${err.message}`);
    }
  }
}
