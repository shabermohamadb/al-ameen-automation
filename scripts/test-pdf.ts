import fs from 'fs';
import { generateDocumentPDF } from '../lib/pdf/invoice-pdf';

const doc = generateDocumentPDF({
  type: 'invoice',
  docNumber: '12',
  date: '31/10/2026',
  dueDate: '07/11/2026',
  business: {
    name: 'Al Ameen Automation',
    legalName: 'Al Ameen Rolling Shutter Manufacturing',
    address: 'Office: Danishpet main road, santhaipettai, kadaiyampatti(PO &TK),salem(DT),Tamil Nadu, INDIA -636351, Salem, Tamil Nadu, 636351',
    phone1: '9629495874',
    email: 'alameenweldingwork@gmail.com',
    gstin: '33CRHPD7107H1Z3',
    pan: 'CRHPD7107H',
  },
  customer: {
    name: 'SRI KUMARAN SHUTTERS',
    address: '188/117, NATHAJI STREET,, ERUMAPALAYAM,SALEM, Salem, Tamil Nadu, Salem, Tamil Nadu, 636015',
    gstin: '33BSOPV6815R1ZN',
    pan: 'BSOPV6815R',
    state: 'Tamil Nadu',
  },
  shipTo: {
    name: 'SRI KUMARAN SHUTTERS',
    address: '188/117, NATHAJI STREET,, ERUMAPALAYAM,SALEM, Salem, Tamil Nadu, Salem, Tamil Nadu, 636015',
  },
  items: [
    {
      description: 'Roilng shuttar Lath',
      hsnCode: '7308',
      quantity: 1454.5,
      unit: 'KGS',
      unitPrice: 84.75,
      taxableAmount: 123262.71,
      gstRate: 18,
      cgstAmount: 11093.64,
      sgstAmount: 11093.64,
      totalAmount: 145450,
    },
  ],
  subtotal: 123262.71,
  taxableAmount: 123262.71,
  cgst: 11093.64,
  sgst: 11093.64,
  totalTax: 22187.29,
  grandTotal: 145450,
  paidAmount: 0,
  previousBalance: 0,
  balanceAmount: 145450,
  bankDetails: {
    accountName: 'AL AMEEN WELDING WORKS',
    ifsc: 'SBIN0018379',
    accountNumber: '41904105649',
    bankName: 'State Bank of India ,THEEVATTIPATTI',
    upiId: 'thasthagiralameen-1@okicici',
  },
  terms: '1. Goods once sold will not be taken back or exchanged',
});

const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
fs.writeFileSync('/tmp/generated_invoice.pdf', pdfBuffer);
console.log('Saved /tmp/generated_invoice.pdf successfully! Size:', pdfBuffer.length);
