import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

export class OcrFallbackService {
  static async extract(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        // Render at a higher scale for better OCR accuracy
        const viewport = page.getViewport({ scale: 2.5 });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({ canvasContext: context, viewport: viewport }).promise;
        
        const imageData = canvas.toDataURL('image/png');
        const { data: { text } } = await Tesseract.recognize(imageData, 'eng', {
          logger: m => console.log('OCR Progress:', m)
        });
        fullText += text + '\n';
      }
      
      return fullText;
    } catch (err) {
      throw new Error(`OCR Processing Failed: ${err.message}`);
    }
  }
}
