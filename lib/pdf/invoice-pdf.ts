import jsPDF from 'jspdf';
import { formatINR } from '../gst';
import { numberToIndianWords } from '../number-to-words';
import {
  BRAND_LOGO_BASE64,
  BRAND_UPI_BANNER_BASE64,
  BRAND_QR_CODE_BASE64,
  BRAND_SIGNATURE_BASE64,
  BRAND_RUPEE_ICON_BASE64,
} from '../brand-assets';

export interface PDFDocData {
  type: 'invoice' | 'quotation' | 'challan';
  docNumber: string;
  date: string;
  dueDate?: string;
  ewayBillNumber?: string;
  business?: {
    name?: string;
    legalName?: string;
    address?: string;
    phone1?: string;
    phone2?: string;
    email?: string;
    gstin?: string;
    pan?: string;
    state?: string;
  };
  customer: {
    name: string;
    phone?: string;
    address: string;
    gstin?: string;
    pan?: string;
    state?: string;
  };
  shipTo?: {
    name?: string;
    address?: string;
  };
  siteAddress?: string;
  items: Array<{
    item_type?: string;
    description: string;
    hsnCode?: string;
    width?: number;
    height?: number;
    measurementUnit?: string;
    areaSqFt?: number;
    quantity: number;
    unit?: string;
    ratePerSqFt?: number;
    unitPrice?: number;
    taxableAmount: number;
    gstRate: number;
    cgstAmount?: number;
    sgstAmount?: number;
    igstAmount?: number;
    totalAmount: number;
  }>;
  subtotal: number;
  discount?: number;
  taxableAmount: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  totalTax: number;
  installationCharges?: number;
  transportCharges?: number;
  otherCharges?: number;
  grandTotal: number;
  paidAmount?: number;
  previousBalance?: number;
  balanceAmount?: number;
  bankDetails?: {
    bankName?: string;
    branch?: string;
    accountName?: string;
    accountNumber?: string;
    ifsc?: string;
    upiId?: string;
  };
  terms?: string;
  notes?: string;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  if (dateStr.includes('/')) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

function formatAmount(val?: number): string {
  if (val === undefined || isNaN(val)) return '0';
  return val.toLocaleString('en-IN', {
    minimumFractionDigits: Number.isInteger(val) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

function printRupeeAmount(
  doc: jsPDF,
  amountStr: string,
  rightX: number,
  y: number,
  fontSize = 7,
  isBold = true
) {
  doc.setFont('helvetica', isBold ? 'bold' : 'normal');
  doc.setFontSize(fontSize);
  doc.text(amountStr, rightX, y, { align: 'right' });

  const textW = doc.getTextWidth(amountStr);
  const iconW = 2.2;
  const iconH = 2.2;
  const iconX = rightX - textW - iconW - 1.2;
  const iconY = y - 2.1;

  try {
    doc.addImage(BRAND_RUPEE_ICON_BASE64, 'PNG', iconX, iconY, iconW, iconH);
  } catch (e) {
    // Graceful fallback
  }
}

export function generateDocumentPDF(data: PDFDocData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210 mm
  const marginX = 10;
  const contentWidth = 190;
  const midX = marginX + contentWidth / 2; // 105 mm

  // Colors
  const black = [0, 0, 0] as const;
  const darkGray = [40, 40, 40] as const;
  const lightGray = [150, 150, 150] as const;
  const amberColor = [218, 140, 24] as const; // #DA8C18 (matching PTS Al Ameen amber title)
  const headerBgColor = [254, 237, 218] as const; // #FFEDD5 peach/cream background

  doc.setLineWidth(0.25);
  doc.setDrawColor(black[0], black[1], black[2]);

  // ==========================================
  // TOP BADGE: TAX INVOICE | ORIGINAL
  // ==========================================
  const badgeTitle =
    data.type === 'invoice'
      ? 'TAX INVOICE'
      : data.type === 'quotation'
      ? 'QUOTATION'
      : 'DELIVERY CHALLAN';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(black[0], black[1], black[2]);
  doc.text(badgeTitle, marginX, 10);

  // Pill badge "ORIGINAL"
  const pillX = marginX + 32;
  const pillY = 6;
  const pillW = 24;
  const pillH = 5.5;
  doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.roundedRect(pillX, pillY, pillW, pillH, 1.2, 1.2, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  doc.text('ORIGINAL', pillX + pillW / 2, pillY + 3.8, { align: 'center' });

  // Reset draw color to black
  doc.setDrawColor(black[0], black[1], black[2]);

  // ==========================================
  // SECTION 1: COMPANY HEADER & INVOICE DETAILS
  // Box: (10, 14, 190, 44)
  // ==========================================
  const sec1Y = 14;
  const sec1H = 44;
  doc.rect(marginX, sec1Y, contentWidth, sec1H);
  doc.line(midX, sec1Y, midX, sec1Y + sec1H); // Vertical divider

  // Left Column: Logo & Company Information
  try {
    doc.addImage(BRAND_LOGO_BASE64, 'PNG', marginX + 2, sec1Y + 3.5, 21, 21);
  } catch (e) {
    console.error('Error adding brand logo:', e);
  }

  const textStartX = marginX + 25;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(amberColor[0], amberColor[1], amberColor[2]);
  doc.text('AL AMEEN WELDING WORKS &', textStartX, sec1Y + 5.5);
  doc.text('ROLLING SHUTTER', textStartX, sec1Y + 9.5);
  doc.text('MANUFACTURING', textStartX, sec1Y + 13.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  const addressText =
    data.business?.address ||
    'Office: Danishpet main road, santhaipettai, kadaiyampatti(PO &TK),salem(DT),Tamil Nadu, INDIA -636351, Salem, Tamil Nadu, 636351';
  const splitAddress = doc.splitTextToSize(addressText, 68);
  doc.text(splitAddress, textStartX, sec1Y + 18);

  const metaY = sec1Y + 31.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('GSTIN:', textStartX, metaY);
  doc.setFont('helvetica', 'normal');
  doc.text(data.business?.gstin || '33CRHPD7107H1Z3', textStartX, metaY + 3.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Mobile:', textStartX + 42, metaY);
  doc.setFont('helvetica', 'normal');
  doc.text(data.business?.phone1 || '9629495874', textStartX + 42, metaY + 3.5);

  doc.setFont('helvetica', 'bold');
  doc.text('PAN Number:', textStartX, metaY + 7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(data.business?.pan || 'CRHPD7107H', textStartX + 16, metaY + 7.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Email:', textStartX, metaY + 11);
  doc.setFont('helvetica', 'normal');
  doc.text(data.business?.email || 'alameenweldingwork@gmail.com', textStartX + 8, metaY + 11);

  // Right Column: Invoice Details (3 sub-columns: Invoice No, Invoice Date, Due Date)
  const col1X = midX + 16;
  const col2X = midX + 47;
  const col3X = midX + 78;
  const invMetaY = sec1Y + 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(black[0], black[1], black[2]);
  doc.text(data.type === 'quotation' ? 'Quote No.' : 'Invoice No.', col1X, invMetaY, { align: 'center' });
  doc.text(data.type === 'quotation' ? 'Quote Date' : 'Invoice Date', col2X, invMetaY, { align: 'center' });
  doc.text(data.type === 'quotation' ? 'Valid Until' : 'Due Date', col3X, invMetaY, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(data.docNumber || '12', col1X, invMetaY + 6, { align: 'center' });
  doc.text(formatDate(data.date), col2X, invMetaY + 6, { align: 'center' });
  doc.text(formatDate(data.dueDate || data.date), col3X, invMetaY + 6, { align: 'center' });

  if (data.ewayBillNumber) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text(`e-Way Bill No: ${data.ewayBillNumber}`, midX + 6, invMetaY + 14);
  }

  // ==========================================
  // SECTION 2: BILL TO & SHIP TO
  // Box: (10, 58, 190, 25)
  // ==========================================
  const sec2Y = sec1Y + sec1H; // 58 mm
  const sec2H = 25;
  doc.rect(marginX, sec2Y, contentWidth, sec2H);
  doc.line(midX, sec2Y, midX, sec2Y + sec2H); // Vertical divider

  // BILL TO (Left)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(black[0], black[1], black[2]);
  doc.text('BILL TO', marginX + 3, sec2Y + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(data.customer.name.toUpperCase(), marginX + 3, sec2Y + 8.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  const billAddr = `Address: ${data.customer.address || 'Tamil Nadu'}`;
  const splitBillAddr = doc.splitTextToSize(billAddr, 88);
  doc.text(splitBillAddr, marginX + 3, sec2Y + 12.5);

  const billMetaY = sec2Y + 19.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  if (data.customer.gstin) {
    doc.text(`GSTIN: ${data.customer.gstin}`, marginX + 3, billMetaY);
  }
  doc.text(`Place of Supply: ${data.customer.state || 'Tamil Nadu'}`, marginX + 48, billMetaY);

  if (data.customer.pan || (data.customer.gstin && data.customer.gstin.length >= 12)) {
    const panNum = data.customer.pan || data.customer.gstin?.substring(2, 12);
    doc.text(`PAN Number: ${panNum}`, marginX + 3, billMetaY + 4);
  }

  // SHIP TO (Right)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('SHIP TO', midX + 3, sec2Y + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  const shipName = data.shipTo?.name || data.customer.name;
  doc.text(shipName.toUpperCase(), midX + 3, sec2Y + 8.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  const shipAddr = `Address: ${data.shipTo?.address || data.siteAddress || data.customer.address || 'Tamil Nadu'}`;
  const splitShipAddr = doc.splitTextToSize(shipAddr, 88);
  doc.text(splitShipAddr, midX + 3, sec2Y + 12.5);

  // ==========================================
  // SECTION 3: ITEMS TABLE
  // Header: (10, 83, 190, 7)
  // Columns:
  // S.NO. : 15 mm (10 - 25)
  // ITEMS : 55 mm (25 - 80)
  // HSN   : 18 mm (80 - 98)
  // QTY.  : 24 mm (98 - 122)
  // RATE  : 20 mm (122 - 142)
  // TAX   : 24 mm (142 - 166)
  // AMOUNT: 24 mm (166 - 190) -> Total 180 + 10 = 190
  // ==========================================
  const colX = [
    marginX,         // 10: Table start
    marginX + 12,    // 22: Items start (12mm for S.NO)
    marginX + 75,    // 85: HSN start (63mm for description)
    marginX + 95,    // 105: QTY start (20mm for HSN)
    marginX + 120,   // 130: RATE start (25mm for QTY)
    marginX + 144,   // 154: TAX start (24mm for RATE)
    marginX + 168,   // 178: AMOUNT start (24mm for TAX)
    marginX + contentWidth // 200: Table end (22mm for AMOUNT)
  ];

  const tableTopY = sec2Y + sec2H; // 83 mm
  const headerH = 7;

  // Header Background Fill (Peach/Cream)
  doc.setFillColor(headerBgColor[0], headerBgColor[1], headerBgColor[2]);
  doc.rect(marginX, tableTopY, contentWidth, headerH, 'FD');

  // Header Column Titles
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(black[0], black[1], black[2]);

  doc.text('S.NO.', (colX[0] + colX[1]) / 2, tableTopY + 4.5, { align: 'center' });
  doc.text('ITEMS', (colX[1] + colX[2]) / 2, tableTopY + 4.5, { align: 'center' });
  doc.text('HSN / SAC', (colX[2] + colX[3]) / 2, tableTopY + 4.5, { align: 'center' });
  doc.text('QTY.', (colX[3] + colX[4]) / 2, tableTopY + 4.5, { align: 'center' });
  doc.text('RATE', (colX[4] + colX[5]) / 2, tableTopY + 4.5, { align: 'center' });
  doc.text('TAX', (colX[5] + colX[6]) / 2, tableTopY + 4.5, { align: 'center' });
  doc.text('AMOUNT', (colX[6] + colX[7]) / 2, tableTopY + 4.5, { align: 'center' });

  // Items Body
  const itemsAreaH = 65; // Fixed height extending column lines down
  const itemsBottomY = tableTopY + headerH + itemsAreaH; // 83 + 7 + 65 = 155 mm

  // Draw full outline of items area
  doc.rect(marginX, tableTopY + headerH, contentWidth, itemsAreaH);

  // Draw vertical lines from header through items area
  for (let i = 1; i < colX.length - 1; i++) {
    doc.line(colX[i], tableTopY, colX[i], itemsBottomY);
  }

  // Populate line items
  let rowY = tableTopY + headerH + 5;
  data.items.forEach((item, idx) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(black[0], black[1], black[2]);

    // S.No
    doc.text(String(idx + 1), (colX[0] + colX[1]) / 2, rowY, { align: 'center' });

    // Item Description (wrapped cleanly)
    const descLines = doc.splitTextToSize(item.description, (colX[2] - colX[1]) - 3);
    doc.text(descLines[0], colX[1] + 1.5, rowY);
    if (descLines.length > 1) {
      doc.setFontSize(6);
      doc.setTextColor(80, 80, 80);
      doc.text(descLines[1], colX[1] + 1.5, rowY + 3.2);
      doc.setFontSize(7);
      doc.setTextColor(black[0], black[1], black[2]);
    }

    // HSN / SAC
    const code = item.hsnCode || (item.item_type === 'service' ? '998719' : (item.item_type === 'product' ? '8501' : '7308'));
    doc.text(code, (colX[2] + colX[3]) / 2, rowY, { align: 'center' });

    // Qty with Unit
    const effectiveArea = (item.areaSqFt && item.areaSqFt > 0)
      ? item.areaSqFt
      : ((item.width && item.height && item.item_type !== 'product' && item.item_type !== 'service') ? (item.width * item.height) : 0);

    let qtyStr = `${item.quantity}`;
    if (item.item_type === 'service') {
      qtyStr = `${item.quantity} ${item.unit || 'Job'}`;
    } else if (item.item_type === 'product' || effectiveArea <= 0) {
      qtyStr = `${item.quantity} ${item.unit || 'Nos'}`;
    } else {
      qtyStr = `${Number((item.quantity * effectiveArea).toFixed(2))} Sq.Ft`;
    }
    doc.text(qtyStr, colX[4] - 2, rowY, { align: 'right' });

    // Rate
    const rateVal =
      item.item_type === 'service' || item.item_type === 'product' || !item.ratePerSqFt
        ? item.unitPrice || item.ratePerSqFt || 0
        : item.ratePerSqFt;
    doc.text(formatAmount(rateVal), colX[5] - 2, rowY, { align: 'right' });

    // Tax
    const itemTax =
      (item.cgstAmount || 0) + (item.sgstAmount || 0) + (item.igstAmount || 0) ||
      (item.taxableAmount * (item.gstRate || 18)) / 100;
    doc.text(formatAmount(itemTax), colX[6] - 2, rowY, { align: 'right' });
    doc.setFontSize(5.5);
    doc.setTextColor(80, 80, 80);
    doc.text(`(${item.gstRate || 18}%)`, colX[6] - 2, rowY + 3.5, { align: 'right' });

    // Amount
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(black[0], black[1], black[2]);
    doc.text(formatAmount(item.totalAmount), colX[7] - 2, rowY, { align: 'right' });

    rowY += 9;
  });

  // ==========================================
  // TOTALS ROWS (At bottom of items table)
  // Row 1: TOTAL (Qty sum, Tax sum, Amount sum)
  // Row 2: RECEIVED AMOUNT
  // Row 3: PREVIOUS BALANCE
  // Row 4: CURRENT BALANCE
  // ==========================================
  const totalsRowH = 5.5;

  // Row 1: TOTAL
  const tot1Y = itemsBottomY; // 155 mm
  doc.rect(marginX, tot1Y, contentWidth, totalsRowH);
  // Column dividers for totals row
  doc.line(colX[3], tot1Y, colX[3], tot1Y + totalsRowH); // before Qty
  doc.line(colX[4], tot1Y, colX[4], tot1Y + totalsRowH); // after Qty
  doc.line(colX[5], tot1Y, colX[5], tot1Y + totalsRowH); // before Tax
  doc.line(colX[6], tot1Y, colX[6], tot1Y + totalsRowH); // before Amount

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(black[0], black[1], black[2]);
  doc.text('TOTAL', colX[3] - 4, tot1Y + 3.8, { align: 'right' });

  // Sum of Qty
  const totalQty = data.items.reduce(
    (acc, it) => acc + (it.areaSqFt ? it.quantity * it.areaSqFt : it.quantity),
    0
  );
  doc.text(formatAmount(totalQty), colX[4] - 2, tot1Y + 3.8, { align: 'right' });

  // Total Tax (with Rupee icon)
  printRupeeAmount(doc, formatAmount(data.totalTax), colX[6] - 2, tot1Y + 3.8, 7, true);

  // Total Amount (with Rupee icon)
  printRupeeAmount(doc, formatAmount(data.grandTotal), colX[7] - 2, tot1Y + 3.8, 7, true);

  // Row 2: RECEIVED AMOUNT
  const tot2Y = tot1Y + totalsRowH; // 160.5 mm
  doc.rect(marginX, tot2Y, contentWidth, totalsRowH);
  doc.line(colX[6], tot2Y, colX[6], tot2Y + totalsRowH);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('RECEIVED AMOUNT', colX[6] - 4, tot2Y + 3.8, { align: 'right' });
  printRupeeAmount(doc, formatAmount(data.paidAmount || 0), colX[7] - 2, tot2Y + 3.8, 7, true);

  // Row 3: PREVIOUS BALANCE
  const tot3Y = tot2Y + totalsRowH; // 166 mm
  doc.rect(marginX, tot3Y, contentWidth, totalsRowH);
  doc.line(colX[6], tot3Y, colX[6], tot3Y + totalsRowH);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('PREVIOUS BALANCE', colX[6] - 4, tot3Y + 3.8, { align: 'right' });
  printRupeeAmount(doc, formatAmount(data.previousBalance || 0), colX[7] - 2, tot3Y + 3.8, 7, true);

  // Row 4: CURRENT BALANCE
  const tot4Y = tot3Y + totalsRowH; // 171.5 mm
  doc.rect(marginX, tot4Y, contentWidth, totalsRowH);
  doc.line(colX[6], tot4Y, colX[6], tot4Y + totalsRowH);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('CURRENT BALANCE', colX[6] - 4, tot4Y + 3.8, { align: 'right' });
  const balDue =
    data.balanceAmount !== undefined
      ? data.balanceAmount
      : data.grandTotal - (data.paidAmount || 0);
  printRupeeAmount(doc, formatAmount(balDue), colX[7] - 2, tot4Y + 3.8, 7, true);

  // ==========================================
  // SECTION 4: HSN/SAC TAX BREAKDOWN TABLE
  // Box: (10, 179, 190, 13.5)
  // Multi-tier peach header:
  // HSN/SAC (24) | Taxable Value (38) | CGST (Rate 18 | Amount 26) | SGST (Rate 18 | Amount 26) | Total Tax Amount (40)
  // ==========================================
  const hsnTableY = tot4Y + totalsRowH + 2; // 179 mm
  const hsnHeadH = 8;
  const hsnRowH = 5.5;

  const hsnCols = [
    marginX,        // 10
    marginX + 24,   // 34 (HSN/SAC)
    marginX + 62,   // 72 (Taxable Value)
    marginX + 80,   // 90 (CGST Rate)
    marginX + 106,  // 116 (CGST Amount)
    marginX + 124,  // 134 (SGST Rate)
    marginX + 150,  // 160 (SGST Amount)
    marginX + contentWidth // 200 (Total Tax Amount)
  ];

  // Header Fill
  doc.setFillColor(headerBgColor[0], headerBgColor[1], headerBgColor[2]);
  doc.rect(marginX, hsnTableY, contentWidth, hsnHeadH, 'FD');

  // Horizontal sub-divider inside CGST & SGST
  doc.line(hsnCols[2], hsnTableY + 4, hsnCols[6], hsnTableY + 4);

  // Vertical lines in header
  doc.line(hsnCols[1], hsnTableY, hsnCols[1], hsnTableY + hsnHeadH);
  doc.line(hsnCols[2], hsnTableY, hsnCols[2], hsnTableY + hsnHeadH);
  doc.line(hsnCols[3], hsnTableY + 4, hsnCols[3], hsnTableY + hsnHeadH); // CGST divider
  doc.line(hsnCols[4], hsnTableY, hsnCols[4], hsnTableY + hsnHeadH); // CGST/SGST border
  doc.line(hsnCols[5], hsnTableY + 4, hsnCols[5], hsnTableY + hsnHeadH); // SGST divider
  doc.line(hsnCols[6], hsnTableY, hsnCols[6], hsnTableY + hsnHeadH); // SGST/Total border

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(black[0], black[1], black[2]);
  doc.text('HSN/SAC', (hsnCols[0] + hsnCols[1]) / 2, hsnTableY + 5, { align: 'center' });
  doc.text('Taxable Value', (hsnCols[1] + hsnCols[2]) / 2, hsnTableY + 5, { align: 'center' });

  doc.text('CGST', (hsnCols[2] + hsnCols[4]) / 2, hsnTableY + 3, { align: 'center' });
  doc.text('Rate', (hsnCols[2] + hsnCols[3]) / 2, hsnTableY + 7, { align: 'center' });
  doc.text('Amount', (hsnCols[3] + hsnCols[4]) / 2, hsnTableY + 7, { align: 'center' });

  doc.text('SGST', (hsnCols[4] + hsnCols[6]) / 2, hsnTableY + 3, { align: 'center' });
  doc.text('Rate', (hsnCols[4] + hsnCols[5]) / 2, hsnTableY + 7, { align: 'center' });
  doc.text('Amount', (hsnCols[5] + hsnCols[6]) / 2, hsnTableY + 7, { align: 'center' });

  doc.text('Total Tax Amount', (hsnCols[6] + hsnCols[7]) / 2, hsnTableY + 5, { align: 'center' });

  // Group items by HSN code
  type HsnSummary = {
    hsn: string;
    taxable: number;
    gstRate: number;
    cgst: number;
    sgst: number;
    totalTax: number;
  };

  const hsnMap = new Map<string, HsnSummary>();

  if (data.items && data.items.length > 0) {
    data.items.forEach((it) => {
      const hsn = (it.hsnCode || '7308').trim();
      const rate = it.gstRate || 18;
      const taxable = Number(it.taxableAmount) || 0;
      const cgst = Number(it.cgstAmount) || (taxable * (rate / 2)) / 100;
      const sgst = Number(it.sgstAmount) || (taxable * (rate / 2)) / 100;
      const tax = cgst + sgst;

      if (!hsnMap.has(hsn)) {
        hsnMap.set(hsn, { hsn, taxable: 0, gstRate: rate, cgst: 0, sgst: 0, totalTax: 0 });
      }
      const g = hsnMap.get(hsn)!;
      g.taxable += taxable;
      g.cgst += cgst;
      g.sgst += sgst;
      g.totalTax += tax;
    });
  }

  // Fallback if no items
  if (hsnMap.size === 0) {
    hsnMap.set('7308', {
      hsn: '7308',
      taxable: data.taxableAmount || 0,
      gstRate: 18,
      cgst: data.cgst || (data.totalTax / 2) || 0,
      sgst: data.sgst || (data.totalTax / 2) || 0,
      totalTax: data.totalTax || 0,
    });
  }

  const hsnList = Array.from(hsnMap.values());
  let currentHsnY = hsnTableY + hsnHeadH;

  hsnList.forEach((g) => {
    doc.rect(marginX, currentHsnY, contentWidth, hsnRowH);
    for (let i = 1; i < hsnCols.length - 1; i++) {
      doc.line(hsnCols[i], currentHsnY, hsnCols[i], currentHsnY + hsnRowH);
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(black[0], black[1], black[2]);
    doc.text(g.hsn, (hsnCols[0] + hsnCols[1]) / 2, currentHsnY + 3.8, { align: 'center' });
    doc.text(formatAmount(g.taxable), hsnCols[2] - 2, currentHsnY + 3.8, { align: 'right' });

    const cgstRateStr = `${(g.gstRate / 2).toFixed(g.gstRate % 2 === 0 ? 0 : 1)}%`;
    const sgstRateStr = `${(g.gstRate / 2).toFixed(g.gstRate % 2 === 0 ? 0 : 1)}%`;

    doc.text(cgstRateStr, (hsnCols[2] + hsnCols[3]) / 2, currentHsnY + 3.8, { align: 'center' });
    doc.text(formatAmount(g.cgst), hsnCols[4] - 2, currentHsnY + 3.8, { align: 'right' });

    doc.text(sgstRateStr, (hsnCols[4] + hsnCols[5]) / 2, currentHsnY + 3.8, { align: 'center' });
    doc.text(formatAmount(g.sgst), hsnCols[6] - 2, currentHsnY + 3.8, { align: 'right' });

    printRupeeAmount(doc, formatAmount(g.totalTax), hsnCols[7] - 2, currentHsnY + 3.8, 6.5, false);

    currentHsnY += hsnRowH;
  });

  // ==========================================
  // SECTION 5: TOTAL AMOUNT (IN WORDS)
  // Box: (10, dynamic Y, 190, 8.5)
  // ==========================================
  const wordsY = currentHsnY + 2;
  const wordsH = 8.5;
  doc.rect(marginX, wordsY, contentWidth, wordsH);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(black[0], black[1], black[2]);
  doc.text('Total Amount (in words)', marginX + 2, wordsY + 3.2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  const wordsText = numberToIndianWords(data.grandTotal);
  doc.text(wordsText, marginX + 2, wordsY + 6.8);

  // ==========================================
  // SECTION 6: BANK DETAILS & PAYMENT QR CODE
  // Box: (10, 205, 190, 29)
  // ==========================================
  const bankSecY = wordsY + wordsH + 2; // 205 mm
  const bankSecH = 29;
  doc.rect(marginX, bankSecY, contentWidth, bankSecH);
  doc.line(midX, bankSecY, midX, bankSecY + bankSecH); // Vertical divider

  // Left: Bank Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('Bank Details', marginX + 3, bankSecY + 4.5);

  const bankGridY = bankSecY + 9;
  const labelColX = marginX + 3;
  const valColX = marginX + 26;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);

  doc.text('Name:', labelColX, bankGridY);
  doc.setFont('helvetica', 'bold');
  doc.text(data.bankDetails?.accountName || 'AL AMEEN WELDING WORKS', valColX, bankGridY);

  doc.setFont('helvetica', 'normal');
  doc.text('IFSC Code:', labelColX, bankGridY + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.text(data.bankDetails?.ifsc || 'SBIN0018379', valColX, bankGridY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.text('Account No:', labelColX, bankGridY + 9);
  doc.setFont('helvetica', 'bold');
  doc.text(data.bankDetails?.accountNumber || '41904105649', valColX, bankGridY + 9);

  doc.setFont('helvetica', 'normal');
  doc.text('Bank:', labelColX, bankGridY + 13.5);
  doc.setFont('helvetica', 'normal');
  doc.text(data.bankDetails?.bankName || 'State Bank of India ,THEEVATTIPATTI', valColX, bankGridY + 13.5);

  // Right: Payment QR Code
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('Payment QR Code', midX + 3, bankSecY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('UPI ID:', midX + 3, bankSecY + 9);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text(data.bankDetails?.upiId || 'thasthagiralameen-1@okicici', midX + 3, bankSecY + 13);

  try {
    doc.addImage(BRAND_UPI_BANNER_BASE64, 'PNG', midX + 3, bankSecY + 16, 56, 5.5);
  } catch (e) {
    console.error('Error adding UPI banner:', e);
  }

  // QR Code Image on far right
  try {
    doc.addImage(BRAND_QR_CODE_BASE64, 'PNG', marginX + contentWidth - 25, bankSecY + 3, 23, 23);
  } catch (e) {
    console.error('Error adding QR code:', e);
  }

  // ==========================================
  // SECTION 7: TERMS AND CONDITIONS & SIGNATORY
  // Box: (10, 236, 190, 29)
  // ==========================================
  const termsSecY = bankSecY + bankSecH + 2; // 236 mm
  const termsSecH = 29;
  doc.rect(marginX, termsSecY, contentWidth, termsSecH);
  doc.line(midX, termsSecY, midX, termsSecY + termsSecH); // Vertical divider

  // Left: Terms and Conditions
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('Terms and Conditions', marginX + 3, termsSecY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  const termsText =
    data.terms || '1. Goods once sold will not be taken back or exchanged';
  const splitTerms = doc.splitTextToSize(termsText, 88);
  doc.text(splitTerms, marginX + 3, termsSecY + 9);

  // Right: Authorised Signatory
  try {
    doc.addImage(BRAND_SIGNATURE_BASE64, 'PNG', midX + 32, termsSecY + 5, 26, 11);
  } catch (e) {
    console.error('Error adding signature:', e);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Authorised Signatory For', midX + contentWidth / 4, termsSecY + 20, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.text(
    'AL AMEEN WELDING WORKS & ROLLING SHUTTER MANUFACTURING',
    midX + contentWidth / 4,
    termsSecY + 24,
    { align: 'center' }
  );

  return doc;
}
