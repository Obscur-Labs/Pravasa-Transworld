import PDFDocument from 'pdfkit';
import { IPayment } from '../models/Payment';

interface ReceiptData {
  payment: IPayment & { application: any; user: any };
  appRef: string;
  userName: string;
  visaType: string;
  country: string;
  receiptNumber?: string;
}

export async function generateReceiptPDF(data: ReceiptData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.rect(0, 0, doc.page.width, 80).fill('#1d4ed8');
    doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text('Pravasa Transworld', 50, 25);
    doc.fontSize(10).font('Helvetica').text('Official Payment Receipt', 50, 52);

    doc.moveDown(3);

    // Receipt title
    doc.fillColor('#0f172a').fontSize(18).font('Helvetica-Bold').text('Payment Receipt', { align: 'center' });
    doc.moveDown(0.5);

    const receiptNo = data.receiptNumber || `VF-RCP-${String(data.payment._id).slice(-8).toUpperCase()}`;
    doc.fontSize(10).fillColor('#64748b').font('Helvetica').text(`Receipt No: ${receiptNo}`, { align: 'center' });
    doc.text(`Date: ${data.payment.paidAt ? new Date(data.payment.paidAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}`, { align: 'center' });

    doc.moveDown(1.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#e2e8f0');
    doc.moveDown(1);

    // Details table
    const rows: [string, string][] = [
      ['Applicant Name', data.userName],
      ['Application Reference', data.appRef],
      ['Visa Type', data.visaType],
      ['Destination', data.country],
      ['Payment Method', data.payment.method === 'cash' ? 'Cash' : data.payment.method === 'manual_override' ? 'Manual Override' : 'Online Payment'],
      ['Transaction ID', data.payment.transactionId || receiptNo],
      ['Status', 'COMPLETED'],
    ];

    rows.forEach(([label, value]) => {
      doc.fillColor('#64748b').fontSize(10).font('Helvetica').text(label, 50, doc.y, { continued: true, width: 200 });
      doc.fillColor('#0f172a').font('Helvetica-Bold').text(value, { align: 'right' });
      doc.moveDown(0.6);
    });

    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#e2e8f0');
    doc.moveDown(1);

    // Amount
    doc.fillColor('#64748b').fontSize(12).font('Helvetica').text('Total Paid', 50, doc.y, { continued: true });
    doc.fillColor('#1d4ed8').fontSize(20).font('Helvetica-Bold').text(`₹${data.payment.amount.toLocaleString('en-IN')}`, { align: 'right' });

    doc.moveDown(2);

    // Footer
    doc.fontSize(9).fillColor('#94a3b8').font('Helvetica')
      .text('This is an electronically generated receipt and does not require a signature.', { align: 'center' })
      .text('For queries, contact support@pravasatransworld.com', { align: 'center' });

    doc.end();
  });
}
