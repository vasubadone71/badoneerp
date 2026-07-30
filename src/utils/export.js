import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportToExcel = (fileName, data) => {
  if (!data || data.length === 0) return;
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  
  // Basic formatting: Auto-width
  const colWidths = Object.keys(data[0] || {}).map(key => ({
    wch: Math.max(key.length, ...data.map(row => String(row[key] || '').length)) + 2
  }));
  ws['!cols'] = colWidths;

  XLSX.writeFile(wb, `${fileName}_${new Date().getTime()}.xlsx`);
};

export const exportToPDF = (title, headers, data, fileName) => {
  if (!data || data.length === 0) return;
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const agentName = title.split(' - ')[1] || '';
  const deptName = title.split(' COMMISSION')[0] || '';

  // Company Header
  doc.setFontSize(22);
  doc.setTextColor(211, 47, 47); // Honda Red
  doc.setFont('helvetica', 'bold');
  doc.text("BADONE RTO & INSURANCE ERP", 14, 15);
  
  doc.setDrawColor(211, 47, 47);
  doc.setLineWidth(0.5);
  doc.line(14, 18, 283, 18);

  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.text(`Department: ${deptName}`, 14, 25);
  doc.text(`Assigned Agent: ${agentName}`, 14, 30);
  doc.text(`Report Date: ${new Date().toLocaleDateString('en-IN')}`, 14, 35);

  const hasAmount = headers && headers.includes('Amount');
  if (hasAmount) {
    const totalAmount = data.reduce((sum, row) => {
      const val = String(row['Amount'] || '0').replace(/[^\d.]/g, '');
      return sum + (parseFloat(val) || 0);
    }, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Amount: ₹${totalAmount.toLocaleString('en-IN')}`, 200, 35);
  }

  // Table
  autoTable(doc, {
    head: [headers],
    body: data.map(row => headers.map(h => row[h] || '')),
    startY: 40,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
    headStyles: { fillColor: [211, 47, 47], textColor: 255, fontSize: 9, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    margin: { top: 40, left: 10, right: 10 }
  });

  // Footer & Signatures
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 30, pageHeight - 10);
    
    // Signature Lines
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.line(14, pageHeight - 25, 64, pageHeight - 25);
    doc.text("Authorized Signature", 14, pageHeight - 20);

    doc.line(pageWidth / 2 - 25, pageHeight - 25, pageWidth / 2 + 25, pageHeight - 25);
    doc.text("Verified By", pageWidth / 2 - 10, pageHeight - 20);

    doc.line(pageWidth - 64, pageHeight - 25, pageWidth - 14, pageHeight - 25);
    doc.text("Receiver Signature", pageWidth - 55, pageHeight - 20);
  }

  doc.save(`${fileName}_${new Date().getTime()}.pdf`);
};

export const printReport = (title, headers, data) => {
  if (!data || data.length === 0) return;
  const printWindow = window.open('', '_blank');
  const html = `
    <html>
      <head>
        <title>${title}</title>
        <style>
          @page { size: landscape; margin: 10mm; }
          body { font-family: sans-serif; padding: 20px; color: #333; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 10px; }
          th, td { border: 1px solid #ccc; padding: 6px; text-align: left; }
          th { background-color: #d32f2f; color: white; text-transform: uppercase; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #d32f2f; padding-bottom: 10px; }
          .header h1 { color: #d32f2f; margin: 0; }
          .footer { margin-top: 50px; display: flex; justify-content: space-between; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>BADONE MOTORS</h1>
          <h2>${title}</h2>
          <p>Generated on: ${new Date().toLocaleString()}</p>
        </div>
        <table>
          <thead>
            <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${data.map(row => `
              <tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          <p>Authorized Signature: _________________</p>
          <p>Verified Date: ___________</p>
        </div>
        <script>
          window.onload = () => {
            window.print();
            setTimeout(() => window.close(), 500);
          };
        </script>
      </body>
    </html>
  `;
  printWindow.document.write(html);
  printWindow.document.close();
};
